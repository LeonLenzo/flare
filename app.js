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

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
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

    // Symptom sliders
    document.querySelectorAll('.symptom-slider').forEach(slider => {
        const valueDisplay = slider.nextElementSibling;
        slider.addEventListener('input', () => {
            valueDisplay.textContent = slider.value;
        });
    });

    // Save button
    document.getElementById('save-log').addEventListener('click', saveDayData);

    loadDayData();
    updateCycleStatus();
}

function loadDayData() {
    const data = symptomsData[currentDate] || {};

    // Load symptom sliders
    document.querySelectorAll('.symptom-slider').forEach(slider => {
        const category = slider.dataset.category;
        const symptom = slider.dataset.symptom;
        const value = data[category]?.[symptom] || 0;
        slider.value = value;
        slider.nextElementSibling.textContent = value;
    });

    // Load notes
    document.getElementById('daily-notes').value = data.notes || '';

    // Update cycle button states
    updateCycleStatus();
}

function saveDayData() {
    const data = {
        endo: {},
        ibs: {},
    };

    // Save symptom values from sliders
    document.querySelectorAll('.symptom-slider').forEach(slider => {
        const category = slider.dataset.category;
        const symptom = slider.dataset.symptom;
        const value = parseInt(slider.value);
        if (value > 0) {
            data[category][symptom] = value;
        }
    });

    // Remove empty categories
    if (Object.keys(data.endo).length === 0) delete data.endo;
    if (Object.keys(data.ibs).length === 0) delete data.ibs;

    // Save notes
    const notes = document.getElementById('daily-notes').value.trim();
    if (notes) {
        data.notes = notes;
    }

    // Save or delete entry
    if (Object.keys(data).length > 0) {
        symptomsData[currentDate] = data;
        showToast('Entry saved!');
    } else {
        delete symptomsData[currentDate];
        showToast('Entry cleared');
    }

    Storage.set('symptoms', symptomsData);
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
    document.getElementById('prev-month').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });

    renderCalendar();
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    document.getElementById('calendar-month').textContent =
        currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
        day.textContent = i;

        if (date === today) day.classList.add('today');

        const periodInfo = getPeriodInfo(date);
        if (periodInfo.isInPeriod) day.classList.add('period');

        if (symptomsData[date]) day.classList.add('has-symptoms');

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

    const endoData = dates.map(date => {
        const data = symptomsData[date];
        if (!data?.endo) return 0;
        // Calculate average of all endo symptoms
        const values = Object.values(data.endo);
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });

    const ibsData = dates.map(date => {
        const data = symptomsData[date];
        if (!data?.ibs) return 0;
        // Calculate average of all IBS symptoms
        const values = Object.values(data.ibs);
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });

    const labels = dates.map(date => {
        const d = new Date(date);
        return d.getDate();
    });

    if (window.symptomChart) window.symptomChart.destroy();

    window.symptomChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Endo Severity',
                    data: endoData,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'IBS Severity',
                    data: ibsData,
                    borderColor: '#ec4899',
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    tension: 0.3,
                    fill: true
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

function renderPhaseChart() {
    const canvas = document.getElementById('phase-chart');
    const ctx = canvas.getContext('2d');

    // Calculate average severity by phase
    const phaseData = {
        'Menstrual': { endo: [], ibs: [] },
        'Follicular': { endo: [], ibs: [] },
        'Ovulation': { endo: [], ibs: [] },
        'Luteal': { endo: [], ibs: [] }
    };

    Object.keys(symptomsData).forEach(date => {
        const phase = getCyclePhase(date);
        const data = symptomsData[date];

        if (phaseData[phase]) {
            if (data.endo) {
                const endoValues = Object.values(data.endo);
                const endoAvg = endoValues.reduce((a, b) => a + b, 0) / endoValues.length;
                phaseData[phase].endo.push(endoAvg);
            }
            if (data.ibs) {
                const ibsValues = Object.values(data.ibs);
                const ibsAvg = ibsValues.reduce((a, b) => a + b, 0) / ibsValues.length;
                phaseData[phase].ibs.push(ibsAvg);
            }
        }
    });

    const avgEndo = Object.keys(phaseData).map(phase => {
        const values = phaseData[phase].endo;
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });

    const avgIbs = Object.keys(phaseData).map(phase => {
        const values = phaseData[phase].ibs;
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });

    if (window.phaseChart) window.phaseChart.destroy();

    window.phaseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Menstrual', 'Follicular', 'Ovulation', 'Luteal'],
            datasets: [
                {
                    label: 'Avg Endo Severity',
                    data: avgEndo,
                    backgroundColor: 'rgba(139, 92, 246, 0.7)'
                },
                {
                    label: 'Avg IBS Severity',
                    data: avgIbs,
                    backgroundColor: 'rgba(236, 72, 153, 0.7)'
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
