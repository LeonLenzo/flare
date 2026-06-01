import { state } from './storage.js';
import { getCycleDay, getCyclePhase } from './cycle.js';
import { exportData, clearAllData } from './ui.js';

// ===== INSIGHTS =====
export function initializeDataButtons() {
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('clear-data').addEventListener('click', clearAllData);
}

export function renderCycleSummary() {
    const summaryDiv = document.getElementById('cycle-summary');

    if (!state.cycleData.periods || state.cycleData.periods.length === 0) {
        summaryDiv.innerHTML = '<p style="color: #9ca3af;">No cycle data yet. Start tracking your period!</p>';
        return;
    }

    const completedPeriods = state.cycleData.periods.filter(p => p.end);
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
        <div><span>Total periods tracked:</span> <strong>${state.cycleData.periods.length}</strong></div>
        <div><span>Avg period length:</span> <strong>${avgLength > 0 ? avgLength + ' days' : 'N/A'}</strong></div>
        <div><span>Avg cycle length:</span> <strong>${avgCycle > 0 ? avgCycle + ' days' : 'N/A'}</strong></div>
        <div><span>Current cycle day:</span> <strong>${currentCycleDay || 'N/A'}</strong></div>
        <div><span>Current phase:</span> <strong>${currentPhase}</strong></div>
    `;
}

