import { state } from './storage.js';
import { getCyclePhase, getCycleDay } from './cycle.js';

// ===== CIRCULAR CYCLE CALENDAR =====
const TOTAL_DAYS = 28;
const CYCLE_GAP = 0.35; // Gap between end of cycle and start (radians)

export function initializeCalendar() {
    renderCircularCalendar();
}

export function renderCalendar() {
    renderCircularCalendar();
}

function renderCircularCalendar() {
    const container = document.getElementById('calendar-grid');
    container.innerHTML = '';

    // Get current cycle info
    const cycleDay = getCycleDay(state.currentDate);

    if (!cycleDay) {
        // No cycle data yet - show message with button to start logging
        container.innerHTML = `
            <div style="padding: 60px 40px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">🔥</div>
                <h3 style="color: #8b5cf6; margin-bottom: 12px; font-size: 20px;">Welcome to Flare</h3>
                <p style="color: #6b7280; margin-bottom: 24px; line-height: 1.6;">
                    Track your menstrual cycle and symptoms to identify patterns and triggers.
                </p>
                <button id="start-logging-btn" style="
                    background: #8b5cf6;
                    color: white;
                    border: none;
                    padding: 14px 28px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                ">Log Your First Day</button>
            </div>
        `;

        // Add click handler to the button
        document.getElementById('start-logging-btn').addEventListener('click', () => {
            document.getElementById('calendar-tab').style.display = 'none';
            document.getElementById('log-tab').style.display = 'block';
        });

        return;
    }

    // Calculate all dates in this cycle
    const currentDate = new Date(state.currentDate);
    const periodStart = new Date(currentDate);
    periodStart.setDate(periodStart.getDate() - (cycleDay - 1));

    // Find actual cycle length (find next period start or use 28 as default)
    let actualCycleLength = TOTAL_DAYS;
    const sortedPeriods = state.cycleData.periods
        .map(p => p.start)
        .sort();

    const periodStartStr = periodStart.toISOString().split('T')[0];
    let currentPeriodIndex = sortedPeriods.indexOf(periodStartStr);

    // If exact match not found, find which period we're currently in
    if (currentPeriodIndex === -1) {
        for (let i = 0; i < sortedPeriods.length; i++) {
            if (sortedPeriods[i] <= periodStartStr) {
                currentPeriodIndex = i;
            } else {
                break;
            }
        }
    }

    if (currentPeriodIndex >= 0 && currentPeriodIndex < sortedPeriods.length - 1) {
        // There's a next period, calculate actual cycle length
        const nextPeriodStart = new Date(sortedPeriods[currentPeriodIndex + 1]);
        actualCycleLength = Math.floor((nextPeriodStart - periodStart) / (1000 * 60 * 60 * 24));
    }

    const cycleDaysToShow = Math.max(actualCycleLength, TOTAL_DAYS);

    // Check if there are previous/next cycles for navigation
    const hasPrevCycle = currentPeriodIndex > 0;
    const hasNextCycle = currentPeriodIndex >= 0 && currentPeriodIndex < sortedPeriods.length - 1;

    const today = new Date().toISOString().split('T')[0];

    const cycleDates = [];
    for (let day = 1; day <= cycleDaysToShow; day++) {
        const targetDate = new Date(periodStart);
        targetDate.setDate(targetDate.getDate() + (day - 1));
        const dateStr = targetDate.toISOString().split('T')[0];

        cycleDates.push({
            cycleDay: day,
            dateStr: dateStr,
            calendarDay: targetDate.getDate(),
            month: targetDate.toLocaleDateString('en-US', { month: 'short' }),
            phase: getCyclePhase(dateStr),
            flareRating: state.symptomsData[dateStr]?.flareRating || 0,
            isPredicted: dateStr > today  // Future dates are predictions
        });
    }

    // Setup SVG
    const width = 600;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = 200;
    const innerRadius = 130;
    const labelRadius = 220;

    const svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g')
        .attr('transform', `translate(${centerX},${centerY})`);

    // Helper: convert cycle day to angle (day 1 at top, gap after last day)
    function getDayAngle(day) {
        const adjustedCircle = (2 * Math.PI) - CYCLE_GAP;
        const fraction = (day - 1) / cycleDaysToShow;
        return (fraction * adjustedCircle) - (Math.PI / 2); // -90deg to start at top
    }

    // Phase colors (matching legend)
    const phaseColors = {
        'Menstrual': '#fca5a5',
        'Follicular': '#fde68a',
        'Ovulation': '#fbcfe8',
        'Luteal': '#ddd6fe',
        'Late Luteal': '#c7d2fe',
        'Unknown': '#e5e7eb'
    };

    // Group dates by phase
    const phaseGroups = [];
    let currentGroup = { phase: cycleDates[0].phase, startDay: 1, endDay: 1 };

    for (let i = 1; i < cycleDates.length; i++) {
        if (cycleDates[i].phase === currentGroup.phase) {
            currentGroup.endDay = i + 1;
        } else {
            phaseGroups.push(currentGroup);
            currentGroup = { phase: cycleDates[i].phase, startDay: i + 1, endDay: i + 1 };
        }
    }
    phaseGroups.push(currentGroup);

    // Draw phase arcs
    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    phaseGroups.forEach(group => {
        const startAngle = getDayAngle(group.startDay);
        // End angle should be at the END of the last day in the group
        // For a day, we want the arc to span from its start to the start of next day
        let endAngle;
        if (group.endDay === cycleDaysToShow) {
            // Last day of cycle - end right before the gap
            const adjustedCircle = (2 * Math.PI) - CYCLE_GAP;
            endAngle = adjustedCircle - (Math.PI / 2);
        } else {
            // End at the start of the next day
            endAngle = getDayAngle(group.endDay + 1);
        }

        // D3's arc uses 0° = 3 o'clock, but our getDayAngle uses 0° = 12 o'clock
        // So we need to add π/2 to convert from our coordinate system to D3's
        const arcStartAngle = startAngle + (Math.PI / 2);
        const arcEndAngle = endAngle + (Math.PI / 2);

        // Check if this group contains any predicted (future) days
        const groupDates = cycleDates.slice(group.startDay - 1, group.endDay);
        const isPredicted = groupDates.some(d => d.isPredicted);

        // Create arc with explicit angles
        const phaseArc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
            .startAngle(arcStartAngle)
            .endAngle(arcEndAngle);

        g.append('path')
            .attr('d', phaseArc)
            .attr('fill', phaseColors[group.phase])
            .attr('opacity', isPredicted ? 0.35 : 1)  // Lighter for predictions
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2);
    });

    // Draw days around circle
    cycleDates.forEach(dayData => {
        const isFuture = dayData.dateStr > today;
        const angle = getDayAngle(dayData.cycleDay);

        // Tick mark
        g.append('line')
            .attr('x1', Math.cos(angle) * (outerRadius + 5))
            .attr('y1', Math.sin(angle) * (outerRadius + 5))
            .attr('x2', Math.cos(angle) * (outerRadius + 10))
            .attr('y2', Math.sin(angle) * (outerRadius + 10))
            .attr('stroke', '#d1d5db')
            .attr('stroke-width', 1);

        // Day number (clickable only if not future)
        const dayText = g.append('text')
            .attr('x', Math.cos(angle) * labelRadius)
            .attr('y', Math.sin(angle) * labelRadius)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '16px')
            .attr('font-weight', '700')
            .attr('fill', isFuture ? '#d1d5db' : '#6b7280')
            .attr('cursor', isFuture ? 'default' : 'pointer')
            .attr('opacity', isFuture ? 0.5 : 1)
            .text(dayData.calendarDay);

        // Only add click/hover for past dates and today
        if (!isFuture) {
            dayText
                .on('click', () => {
                    state.currentDate = dayData.dateStr;
                    document.getElementById('log-date').value = dayData.dateStr;
                    window.dispatchEvent(new CustomEvent('dateChanged'));

                    // Show log tab, hide calendar
                    document.getElementById('calendar-tab').style.display = 'none';
                    document.getElementById('log-tab').style.display = 'block';
                })
                .on('mouseenter', function() {
                    d3.select(this).attr('fill', '#8b5cf6').attr('font-size', '19px');
                })
                .on('mouseleave', function() {
                    d3.select(this).attr('fill', '#6b7280').attr('font-size', '16px');
                });
        }

        // Flare rating indicator (flame emoji in center of bar)
        if (dayData.flareRating > 0) {
            const flareRadius = (outerRadius + innerRadius) / 2;
            const flameSizes = ['12px', '14px', '16px', '18px', '20px', '22px'];
            const flameSize = flameSizes[Math.min(dayData.flareRating, 5) - 1] || '12px';

            g.append('text')
                .attr('x', Math.cos(angle) * flareRadius)
                .attr('y', Math.sin(angle) * flareRadius)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', flameSize)
                .text('🔥')
                .style('pointer-events', 'none');
        }
    });

    // Month markers (show month at first occurrence)
    const seenMonths = new Set();
    cycleDates.forEach(dayData => {
        if (!seenMonths.has(dayData.month)) {
            seenMonths.add(dayData.month);
            const angle = getDayAngle(dayData.cycleDay);

            g.append('text')
                .attr('x', Math.cos(angle) * (labelRadius + 20))
                .attr('y', Math.sin(angle) * (labelRadius + 20))
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', '11px')
                .attr('font-weight', 'bold')
                .attr('fill', '#8b5cf6')
                .text(dayData.month);
        }
    });

    // Center text
    const currentPhase = getCyclePhase(state.currentDate);
    const phaseColor = phaseColors[currentPhase] || '#6b7280';

    g.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '36px')
        .attr('font-weight', 'bold')
        .attr('fill', phaseColor)
        .text(`Day ${cycleDay}`);

    g.append('text')
        .attr('x', 0)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '16px')
        .attr('fill', '#6b7280')
        .text(currentPhase);

    // Today indicator (hollow circle around today's date number only)
    if (state.currentDate === today) {
        const currentAngle = getDayAngle(cycleDay);
        g.append('circle')
            .attr('cx', Math.cos(currentAngle) * labelRadius)
            .attr('cy', Math.sin(currentAngle) * labelRadius)
            .attr('r', 13)
            .attr('fill', 'none')
            .attr('stroke', '#ec4899')
            .attr('stroke-width', 2);
    }

    // Draw navigation arrows outside the circle (left and right of chart)
    const arrowX = labelRadius + 40; // Outside the date labels
    const arrowY = 5; // Vertically centered with the Day text
    const arrowFontSize = '48px';

    // Previous cycle arrow (left) - only if there's a previous cycle
    if (hasPrevCycle) {
        g.append('text')
            .attr('x', -arrowX)
            .attr('y', arrowY)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', arrowFontSize)
            .attr('fill', '#8b5cf6')
            .attr('cursor', 'pointer')
            .text('‹')
            .on('click', () => {
                const prevPeriodStart = sortedPeriods[currentPeriodIndex - 1];
                state.currentDate = prevPeriodStart;
                renderCircularCalendar();
            })
            .on('mouseenter', function() {
                d3.select(this).attr('fill', '#7c3aed').attr('font-size', '52px');
            })
            .on('mouseleave', function() {
                d3.select(this).attr('fill', '#8b5cf6').attr('font-size', arrowFontSize);
            });
    }

    // Next cycle arrow (right) - only if there's a next cycle
    if (hasNextCycle) {
        g.append('text')
            .attr('x', arrowX)
            .attr('y', arrowY)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', arrowFontSize)
            .attr('fill', '#8b5cf6')
            .attr('cursor', 'pointer')
            .text('›')
            .on('click', () => {
                const nextPeriodStart = sortedPeriods[currentPeriodIndex + 1];
                state.currentDate = nextPeriodStart;
                renderCircularCalendar();
            })
            .on('mouseenter', function() {
                d3.select(this).attr('fill', '#7c3aed').attr('font-size', '52px');
            })
            .on('mouseleave', function() {
                d3.select(this).attr('fill', '#8b5cf6').attr('font-size', arrowFontSize);
            });
    }
}
