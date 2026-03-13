import { Storage, state } from './storage.js';
import { showToast } from './ui.js';

// ===== CYCLE TRACKING =====
export function toggleCycleDay(date, type) {
    if (!state.cycleData.periods) state.cycleData.periods = [];

    if (type === 'period-start') {
        const existingPeriod = state.cycleData.periods.find(p => p.start === date);
        if (existingPeriod) {
            state.cycleData.periods = state.cycleData.periods.filter(p => p.start !== date);
            showToast('Period start removed');
        } else {
            state.cycleData.periods.push({ start: date, end: null });
            state.cycleData.periods.sort((a, b) => a.start.localeCompare(b.start));
            showToast('Period start marked');
        }
    } else if (type === 'period-end') {
        const openPeriod = state.cycleData.periods
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

    Storage.set('cycle', state.cycleData);
}

export function getPeriodInfo(date) {
    const period = state.cycleData.periods?.find(p => p.start === date);
    const periodWithEnd = state.cycleData.periods?.find(p => p.end === date);

    // Check if date is within a logged period
    const isInPeriod = state.cycleData.periods?.some(p => {
        if (p.end) {
            // Period has an end date - use actual logged range
            return p.start <= date && p.end >= date;
        } else {
            // No end date logged - only count as "in period" for past/present dates within 5 days
            const today = new Date().toISOString().split('T')[0];
            const daysSinceStart = Math.floor((new Date(date) - new Date(p.start)) / (1000 * 60 * 60 * 24));
            return p.start <= date && date <= today && daysSinceStart < 5;
        }
    });

    return {
        isPeriodStart: !!period,
        isPeriodEnd: !!periodWithEnd,
        isInPeriod: isInPeriod
    };
}

export function getCycleDay(date) {
    if (!state.cycleData.periods || state.cycleData.periods.length === 0) return null;

    const sortedPeriods = state.cycleData.periods
        .filter(p => p.start <= date)
        .sort((a, b) => b.start.localeCompare(a.start));

    if (sortedPeriods.length === 0) return null;

    const lastPeriod = sortedPeriods[0];
    const daysDiff = Math.floor((new Date(date) - new Date(lastPeriod.start)) / (1000 * 60 * 60 * 24)) + 1;

    return daysDiff;
}

export function getCyclePhase(date) {
    const cycleDay = getCycleDay(date);
    if (!cycleDay) return 'Unknown';

    const periodInfo = getPeriodInfo(date);

    // Use actual logged period data if available
    if (periodInfo.isInPeriod) return 'Menstrual';

    // For future dates, predict based on typical cycle phases
    // For past dates without logged period, also use prediction
    if (cycleDay <= 5) return 'Menstrual';
    if (cycleDay <= 14) return 'Follicular';
    if (cycleDay <= 16) return 'Ovulation';
    if (cycleDay <= 28) return 'Luteal';
    return 'Late Luteal';
}
