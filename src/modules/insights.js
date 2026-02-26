import { state } from './storage.js';
import { getCycleDay, getCyclePhase } from './cycle.js';
import { exportData, clearAllData } from './ui.js';

// ===== INSIGHTS =====
export function initializeInsights() {
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('clear-data').addEventListener('click', clearAllData);
}

export function renderInsights() {
    renderCycleSummary();
    renderFlareChart();
    renderPhaseChart();
}

function renderCycleSummary() {
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

function renderFlareChart() {
    const canvas = document.getElementById('flare-chart');
    const ctx = canvas.getContext('2d');

    // Get last 30 days
    const dates = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }

    const labels = dates.map(date => {
        const d = new Date(date);
        return d.getDate();
    });

    const flareData = dates.map(date => {
        const dayData = state.symptomsData[date];
        return dayData?.flareRating || 0;
    });

    if (window.flareChart) window.flareChart.destroy();

    window.flareChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Flare Rating',
                data: flareData,
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.2)',
                tension: 0.3,
                fill: true
            }]
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

    // Calculate average flare rating by phase
    const phaseData = {
        'Menstrual': [],
        'Follicular': [],
        'Ovulation': [],
        'Luteal': []
    };

    Object.keys(state.symptomsData).forEach(date => {
        const phase = getCyclePhase(date);
        const data = state.symptomsData[date];

        if (phaseData[phase] && data?.flareRating) {
            phaseData[phase].push(data.flareRating);
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
            datasets: [{
                label: 'Avg Flare Rating',
                data: avgByPhase,
                backgroundColor: 'rgba(139, 92, 246, 0.8)'
            }]
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
