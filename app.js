// ===== DATA MANAGEMENT =====
const Storage = {
    get: (key) => JSON.parse(localStorage.getItem(key) || 'null'),
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    clear: () => localStorage.clear()
};

// ===== STATE =====
let currentDate = new Date().toISOString().split('T')[0];
let currentCalendarDate = new Date();
let symptomsData = Storage.get('symptoms') || {};
let cycleData = Storage.get('cycle') || { periods: [] };
let allSymptoms = Storage.get('allSymptoms') || new Set(); // Track all unique symptom names

// ===== DATA MIGRATION =====
function migrateOldData() {
    let needsMigration = false;

    // Check if we have old-style data (endo/ibs categories)
    Object.keys(symptomsData).forEach(date => {
        const dayData = symptomsData[date];
        if (dayData.endo || dayData.ibs) {
            needsMigration = true;
        }
    });

    if (!needsMigration) return;

    console.log('Migrating old symptom data to new format...');

    // Map old symptom names to readable names
    const symptomNameMap = {
        'pelvic-pain': 'Pelvic Pain',
        'cramps': 'Cramps',
        'back-pain': 'Back Pain',
        'fatigue': 'Fatigue',
        'nausea': 'Nausea',
        'abdominal-pain': 'Abdominal Pain',
        'bloating': 'Bloating',
        'diarrhea': 'Diarrhea',
        'constipation': 'Constipation',
        'gas': 'Gas'
    };

    // Migrate each day's data
    Object.keys(symptomsData).forEach(date => {
        const dayData = symptomsData[date];
        const newSymptoms = {};

        // Migrate endo symptoms
        if (dayData.endo) {
            Object.entries(dayData.endo).forEach(([key, value]) => {
                const name = symptomNameMap[key] || key;
                newSymptoms[name] = value;
            });
            delete dayData.endo;
        }

        // Migrate ibs symptoms
        if (dayData.ibs) {
            Object.entries(dayData.ibs).forEach(([key, value]) => {
                const name = symptomNameMap[key] || key;
                newSymptoms[name] = value;
            });
            delete dayData.ibs;
        }

        // Set new symptoms format
        if (Object.keys(newSymptoms).length > 0) {
            dayData.symptoms = newSymptoms;
        }
    });

    // Save migrated data
    Storage.set('symptoms', symptomsData);
    console.log('Migration complete!');
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Migrate old data format if needed
    migrateOldData();

    // Load allSymptoms from existing data if not set
    if (!Array.isArray(allSymptoms) && !(allSymptoms instanceof Set)) {
        allSymptoms = new Set();
        Object.values(symptomsData).forEach(dayData => {
            if (dayData.symptoms) {
                Object.keys(dayData.symptoms).forEach(symptom => allSymptoms.add(symptom));
            }
        });
        Storage.set('allSymptoms', Array.from(allSymptoms));
    } else if (Array.isArray(allSymptoms)) {
        allSymptoms = new Set(allSymptoms);
    }

    initializeTabs();
    initializeLogTab();
    initializeCalendar();
    initializeInsights();
});

// ===== TAB NAVIGATION =====
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');

            if (tabName === 'calendar') renderCalendar();
            if (tabName === 'insights') renderInsights();
        });
    });
}

// ===== LOG TAB =====
function initializeLogTab() {
    const dateInput = document.getElementById('log-date');
    dateInput.value = currentDate;
    dateInput.addEventListener('change', (e) => {
        currentDate = e.target.value;
        loadDayData();
    });

    // Day navigation
    document.getElementById('prev-day').addEventListener('click', () => {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - 1);
        currentDate = date.toISOString().split('T')[0];
        dateInput.value = currentDate;
        loadDayData();
    });

    document.getElementById('next-day').addEventListener('click', () => {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + 1);
        currentDate = date.toISOString().split('T')[0];
        dateInput.value = currentDate;
        loadDayData();
    });

    // Cycle tracking
    document.querySelectorAll('.cycle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            toggleCycleDay(currentDate, type);
            updateCycleStatus();
        });
    });

    // Add new symptom type button
    document.getElementById('add-symptom-btn').addEventListener('click', addNewSymptomType);

    // Allow Enter key to add new symptom type
    document.getElementById('symptom-name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addNewSymptomType();
    });

    // Notes - auto save on change
    document.getElementById('daily-notes').addEventListener('input', () => {
        saveDayData();
    });

    loadDayData();
    updateCycleStatus();
    renderAvailableSymptoms();
}

function loadDayData() {
    const data = symptomsData[currentDate] || {};

    // Load notes
    document.getElementById('daily-notes').value = data.notes || '';

    // Re-render available symptoms with current day's values
    renderAvailableSymptoms();

    // Update cycle button states
    updateCycleStatus();
}

function renderAvailableSymptoms() {
    const container = document.getElementById('available-symptoms');
    container.innerHTML = '';

    const currentDayData = symptomsData[currentDate] || {};
    const currentSymptoms = currentDayData.symptoms || {};

    if (allSymptoms.size === 0) {
        container.innerHTML = '<p class="no-symptoms">No symptom types yet. Add your first symptom below.</p>';
        return;
    }

    // Sort symptoms alphabetically
    const sortedSymptoms = Array.from(allSymptoms).sort();

    sortedSymptoms.forEach(symptomName => {
        const item = document.createElement('div');
        item.className = 'symptom-quick-log';

        const currentValue = currentSymptoms[symptomName] || 0;

        item.innerHTML = `
            <div class="symptom-quick-log-header">
                <span class="symptom-name">${symptomName}</span>
                <button class="delete-symptom-type-btn" data-symptom="${symptomName}" title="Delete this symptom type">🗑️</button>
            </div>
            <div class="symptom-quick-log-input">
                <input type="number"
                       class="severity-input"
                       data-symptom="${symptomName}"
                       min="0"
                       max="5"
                       value="${currentValue}"
                       placeholder="0">
                <span class="severity-label">/5</span>
            </div>
        `;

        // Handle severity input changes
        const input = item.querySelector('.severity-input');
        input.addEventListener('input', (e) => {
            updateSymptomValue(symptomName, parseInt(e.target.value) || 0);
        });

        // Handle delete button
        const deleteBtn = item.querySelector('.delete-symptom-type-btn');
        deleteBtn.addEventListener('click', () => {
            deleteSymptomType(symptomName);
        });

        container.appendChild(item);
    });
}

function updateSymptomValue(symptomName, value) {
    // Get or create day data
    let data = symptomsData[currentDate] || {};
    if (!data.symptoms) data.symptoms = {};

    if (value > 0 && value <= 5) {
        data.symptoms[symptomName] = value;
    } else {
        // Remove symptom if value is 0 or invalid
        delete data.symptoms[symptomName];
    }

    // Clean up empty objects
    if (Object.keys(data.symptoms).length === 0) {
        delete data.symptoms;
    }

    if (Object.keys(data).length === 0) {
        delete symptomsData[currentDate];
    } else {
        symptomsData[currentDate] = data;
    }

    Storage.set('symptoms', symptomsData);

    // Re-render calendar if visible
    if (document.getElementById('calendar-tab').classList.contains('active')) {
        renderCalendar();
    }
}

function addNewSymptomType() {
    const nameInput = document.getElementById('symptom-name-input');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Please enter a symptom name');
        return;
    }

    if (allSymptoms.has(name)) {
        alert('This symptom type already exists');
        nameInput.value = '';
        return;
    }

    // Add to global symptom list
    allSymptoms.add(name);
    Storage.set('allSymptoms', Array.from(allSymptoms));

    // Clear input and re-render
    nameInput.value = '';
    renderAvailableSymptoms();
    nameInput.focus();
}

function deleteSymptomType(symptomName) {
    if (!confirm(`Delete "${symptomName}" from your symptom types? This will remove it from all past entries.`)) {
        return;
    }

    // Remove from global list
    allSymptoms.delete(symptomName);
    Storage.set('allSymptoms', Array.from(allSymptoms));

    // Remove from all historical data
    Object.keys(symptomsData).forEach(date => {
        const dayData = symptomsData[date];
        if (dayData.symptoms && dayData.symptoms[symptomName]) {
            delete dayData.symptoms[symptomName];

            // Clean up empty objects
            if (Object.keys(dayData.symptoms).length === 0) {
                delete dayData.symptoms;
            }
            if (Object.keys(dayData).length === 0) {
                delete symptomsData[date];
            }
        }
    });

    Storage.set('symptoms', symptomsData);
    renderAvailableSymptoms();

    // Re-render calendar if visible
    if (document.getElementById('calendar-tab').classList.contains('active')) {
        renderCalendar();
    }
}

function saveDayData() {
    const data = symptomsData[currentDate] || {};

    // Save notes
    const notes = document.getElementById('daily-notes').value.trim();
    if (notes) {
        data.notes = notes;
    } else {
        delete data.notes;
    }

    // Save or delete entry
    if (Object.keys(data).length > 0) {
        symptomsData[currentDate] = data;
    } else {
        delete symptomsData[currentDate];
    }

    Storage.set('symptoms', symptomsData);

    // Re-render calendar if on calendar tab
    if (document.getElementById('calendar-tab').classList.contains('active')) {
        renderCalendar();
    }
}

// ===== CYCLE TRACKING =====
function toggleCycleDay(date, type) {
    if (!cycleData.periods) cycleData.periods = [];

    if (type === 'period-start') {
        // Check if this date is already a start date
        const existingPeriod = cycleData.periods.find(p => p.start === date);
        if (existingPeriod) {
            // Remove the period
            cycleData.periods = cycleData.periods.filter(p => p.start !== date);
            showToast('Period start removed');
        } else {
            // Add new period
            cycleData.periods.push({ start: date, end: null });
            cycleData.periods.sort((a, b) => a.start.localeCompare(b.start));
            showToast('Period start marked');
        }
    } else if (type === 'period-end') {
        // Find the most recent period that doesn't have an end date
        const openPeriod = cycleData.periods
            .filter(p => !p.end && p.start <= date)
            .sort((a, b) => b.start.localeCompare(a.start))[0];

        if (openPeriod) {
            if (openPeriod.end === date) {
                openPeriod.end = null;
                showToast('Period end removed');
            } else {
                openPeriod.end = date;
                showToast('Period end marked');
            }
        } else {
            showToast('Please mark period start first');
        }
    }

    Storage.set('cycle', cycleData);
    updateCycleStatus();

    // Re-render calendar if on calendar tab to show phase colors
    if (document.getElementById('calendar-tab').classList.contains('active')) {
        renderCalendar();
    }
}

function updateCycleStatus() {
    const statusDiv = document.getElementById('cycle-status');
    const currentPeriod = cycleData.periods?.find(p =>
        p.start === currentDate || (p.end && p.start <= currentDate && p.end >= currentDate)
    );

    // Update button states
    document.querySelectorAll('.cycle-btn').forEach(btn => btn.classList.remove('marked'));

    const periodInfo = getPeriodInfo(currentDate);
    if (periodInfo.isPeriodStart) {
        document.querySelector('[data-type="period-start"]').classList.add('marked');
    }
    if (periodInfo.isPeriodEnd) {
        document.querySelector('[data-type="period-end"]').classList.add('marked');
    }

    const cycleDay = getCycleDay(currentDate);
    const cyclePhase = getCyclePhase(currentDate);

    if (currentPeriod) {
        statusDiv.innerHTML = `<strong>🩸 Menstrual Phase</strong>${cycleDay ? ` - Day ${cycleDay}` : ''}`;
        statusDiv.style.color = '#ec4899';
    } else if (cycleDay) {
        const phaseEmoji = {
            'Follicular': '🌱',
            'Ovulation': '🌸',
            'Luteal': '🌙',
            'Late Luteal': '🌑'
        };
        statusDiv.innerHTML = `<strong>${phaseEmoji[cyclePhase] || ''} ${cyclePhase} Phase</strong> - Day ${cycleDay}`;
        statusDiv.style.color = '#8b5cf6';
    } else {
        statusDiv.textContent = 'No cycle data yet - mark your period start';
        statusDiv.style.color = '#9ca3af';
    }
}

function getPeriodInfo(date) {
    const period = cycleData.periods?.find(p => p.start === date);
    const periodWithEnd = cycleData.periods?.find(p => p.end === date);

    return {
        isPeriodStart: !!period,
        isPeriodEnd: !!periodWithEnd,
        isInPeriod: cycleData.periods?.some(p =>
            p.start <= date && (!p.end || p.end >= date)
        )
    };
}

function getCycleDay(date) {
    if (!cycleData.periods || cycleData.periods.length === 0) return null;

    const sortedPeriods = cycleData.periods
        .filter(p => p.start <= date)
        .sort((a, b) => b.start.localeCompare(a.start));

    if (sortedPeriods.length === 0) return null;

    const lastPeriod = sortedPeriods[0];
    const daysDiff = Math.floor((new Date(date) - new Date(lastPeriod.start)) / (1000 * 60 * 60 * 24)) + 1;

    return daysDiff;
}

function getCyclePhase(date) {
    const cycleDay = getCycleDay(date);
    if (!cycleDay) return 'Unknown';

    const periodInfo = getPeriodInfo(date);
    if (periodInfo.isInPeriod) return 'Menstrual';

    if (cycleDay <= 14) return 'Follicular';
    if (cycleDay <= 16) return 'Ovulation';
    if (cycleDay <= 28) return 'Luteal';
    return 'Late Luteal';
}

// ===== CALENDAR =====
function initializeCalendar() {
    console.log('Initializing calendar...');

    // Populate month dropdown
    const monthSelect = document.getElementById('month-select');
    console.log('Month select element:', monthSelect);

    if (!monthSelect) {
        console.error('Month select not found!');
        return;
    }

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

    // Clear existing options first
    monthSelect.innerHTML = '';

    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    console.log('Month options added:', monthSelect.options.length);

    // Populate year dropdown (current year ± 5 years)
    const yearSelect = document.getElementById('year-select');

    if (!yearSelect) {
        console.error('Year select not found!');
        return;
    }

    // Clear existing options first
    yearSelect.innerHTML = '';

    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 5; year <= currentYear + 5; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    console.log('Year options added:', yearSelect.options.length);

    // Set current month and year
    monthSelect.value = currentCalendarDate.getMonth();
    yearSelect.value = currentCalendarDate.getFullYear();

    // Month/Year dropdown change handlers
    monthSelect.addEventListener('change', () => {
        currentCalendarDate.setMonth(parseInt(monthSelect.value));
        renderCalendar();
    });

    yearSelect.addEventListener('change', () => {
        currentCalendarDate.setFullYear(parseInt(yearSelect.value));
        renderCalendar();
    });

    // Previous/Next month buttons
    document.getElementById('prev-month').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        monthSelect.value = currentCalendarDate.getMonth();
        yearSelect.value = currentCalendarDate.getFullYear();
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        monthSelect.value = currentCalendarDate.getMonth();
        yearSelect.value = currentCalendarDate.getFullYear();
        renderCalendar();
    });

    renderCalendar();
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Update dropdowns to match current date
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    if (monthSelect) monthSelect.value = month;
    if (yearSelect) yearSelect.value = year;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Day headers
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day header';
        header.textContent = day;
        grid.appendChild(header);
    });

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = daysInPrevMonth - i;
        grid.appendChild(day);
    }

    // Current month days
    const today = new Date().toISOString().split('T')[0];
    for (let i = 1; i <= daysInMonth; i++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const day = document.createElement('div');
        day.className = 'calendar-day';

        if (date === today) day.classList.add('today');

        // Get cycle phase
        const phase = getCyclePhase(date);
        const phaseClass = phase.toLowerCase().replace(/ /g, '-');
        if (phase !== 'Unknown') {
            day.classList.add(`phase-${phaseClass}`);
        }

        // Create day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = i;
        day.appendChild(dayNumber);

        // Calculate and display total symptom score as number
        const data = symptomsData[date];
        if (data?.symptoms) {
            const symptomValues = Object.values(data.symptoms);
            const symptomTotal = symptomValues.reduce((a, b) => a + b, 0);
            const totalDiv = document.createElement('div');
            totalDiv.className = 'calendar-day-total';
            totalDiv.textContent = symptomTotal;
            day.appendChild(totalDiv);
        }

        day.addEventListener('click', () => {
            currentDate = date;
            document.getElementById('log-date').value = date;
            loadDayData();
            document.querySelector('[data-tab="log"]').click();
        });

        grid.appendChild(day);
    }

    // Next month days
    const totalCells = grid.children.length - 7; // Subtract headers
    const remainingCells = 35 - totalCells; // 5 weeks * 7 days
    for (let i = 1; i <= remainingCells; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = i;
        grid.appendChild(day);
    }
}

// ===== INSIGHTS =====
function initializeInsights() {
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('clear-data').addEventListener('click', clearAllData);
}

function renderInsights() {
    renderCycleSummary();
    renderSymptomTrends();
    renderPhaseChart();
}

function renderCycleSummary() {
    const summaryDiv = document.getElementById('cycle-summary');

    if (!cycleData.periods || cycleData.periods.length === 0) {
        summaryDiv.innerHTML = '<p style="color: #9ca3af;">No cycle data yet. Start tracking your period!</p>';
        return;
    }

    const completedPeriods = cycleData.periods.filter(p => p.end);
    let avgLength = 0;
    let avgCycle = 0;

    if (completedPeriods.length > 0) {
        // Average period length
        const lengths = completedPeriods.map(p => {
            const start = new Date(p.start);
            const end = new Date(p.end);
            return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        });
        avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);

        // Average cycle length
        if (completedPeriods.length > 1) {
            const cycles = [];
            for (let i = 1; i < completedPeriods.length; i++) {
                const prev = new Date(completedPeriods[i - 1].start);
                const curr = new Date(completedPeriods[i].start);
                cycles.push(Math.floor((curr - prev) / (1000 * 60 * 60 * 24)));
            }
            avgCycle = Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length);
        }
    }

    const currentCycleDay = getCycleDay(new Date().toISOString().split('T')[0]);
    const currentPhase = getCyclePhase(new Date().toISOString().split('T')[0]);

    summaryDiv.innerHTML = `
        <div><span>Total periods tracked:</span> <strong>${cycleData.periods.length}</strong></div>
        <div><span>Avg period length:</span> <strong>${avgLength > 0 ? avgLength + ' days' : 'N/A'}</strong></div>
        <div><span>Avg cycle length:</span> <strong>${avgCycle > 0 ? avgCycle + ' days' : 'N/A'}</strong></div>
        <div><span>Current cycle day:</span> <strong>${currentCycleDay || 'N/A'}</strong></div>
        <div><span>Current phase:</span> <strong>${currentPhase}</strong></div>
    `;
}

function renderSymptomTrends() {
    const canvas = document.getElementById('symptom-chart');
    const ctx = canvas.getContext('2d');

    // Get last 30 days
    const dates = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }

    // Collect all symptoms that appear in the last 30 days
    const symptomOccurrences = {};
    dates.forEach(date => {
        const data = symptomsData[date];
        if (data?.symptoms) {
            Object.keys(data.symptoms).forEach(symptom => {
                symptomOccurrences[symptom] = (symptomOccurrences[symptom] || 0) + 1;
            });
        }
    });

    // Get top 5 most frequent symptoms
    const topSymptoms = Object.entries(symptomOccurrences)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([symptom]) => symptom);

    // Generate colors for each symptom
    const colors = [
        { border: '#5eead4', bg: 'rgba(94, 234, 212, 0.2)' },
        { border: '#93c5fd', bg: 'rgba(147, 197, 253, 0.2)' },
        { border: '#f9a8d4', bg: 'rgba(249, 168, 212, 0.2)' },
        { border: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)' },
        { border: '#a78bfa', bg: 'rgba(167, 139, 250, 0.2)' }
    ];

    const labels = dates.map(date => {
        const d = new Date(date);
        return d.getDate();
    });

    const datasets = topSymptoms.map((symptom, index) => {
        const data = dates.map(date => {
            const dayData = symptomsData[date];
            return dayData?.symptoms?.[symptom] || 0;
        });

        return {
            label: symptom,
            data: data,
            borderColor: colors[index].border,
            backgroundColor: colors[index].bg,
            tension: 0.3,
            fill: true
        };
    });

    if (window.symptomChart) window.symptomChart.destroy();

    window.symptomChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function renderPhaseChart() {
    const canvas = document.getElementById('phase-chart');
    const ctx = canvas.getContext('2d');

    // Calculate average severity by phase for all symptoms
    const phaseData = {
        'Menstrual': [],
        'Follicular': [],
        'Ovulation': [],
        'Luteal': []
    };

    Object.keys(symptomsData).forEach(date => {
        const phase = getCyclePhase(date);
        const data = symptomsData[date];

        if (phaseData[phase] && data?.symptoms) {
            const symptomValues = Object.values(data.symptoms);
            const symptomAvg = symptomValues.reduce((a, b) => a + b, 0) / symptomValues.length;
            phaseData[phase].push(symptomAvg);
        }
    });

    const avgByPhase = Object.keys(phaseData).map(phase => {
        const values = phaseData[phase];
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });

    if (window.phaseChart) window.phaseChart.destroy();

    window.phaseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Menstrual', 'Follicular', 'Ovulation', 'Luteal'],
            datasets: [
                {
                    label: 'Avg Symptom Severity',
                    data: avgByPhase,
                    backgroundColor: 'rgba(139, 92, 246, 0.8)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// ===== UTILITY FUNCTIONS =====
function showToast(message) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2000);
}

function exportData() {
    const data = {
        symptoms: symptomsData,
        cycle: cycleData,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flare-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Data exported!');
}

function clearAllData() {
    if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
        Storage.clear();
        symptomsData = {};
        cycleData = { periods: [] };
        showToast('All data cleared');
        location.reload();
    }
}
