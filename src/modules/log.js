import { Storage, state } from './storage.js';
import { toggleCycleDay, getPeriodInfo, getCycleDay, getCyclePhase } from './cycle.js';
import { renderCalendar } from './calendar.js';

// ===== LOG TAB =====
export function initializeLogTab() {
    const dateInput = document.getElementById('log-date');
    dateInput.value = state.currentDate;
    dateInput.addEventListener('change', (e) => {
        state.currentDate = e.target.value;
        loadDayData();
    });

    // Day navigation
    document.getElementById('prev-day').addEventListener('click', () => {
        const date = new Date(state.currentDate);
        date.setDate(date.getDate() - 1);
        state.currentDate = date.toISOString().split('T')[0];
        dateInput.value = state.currentDate;
        loadDayData();
    });

    document.getElementById('next-day').addEventListener('click', () => {
        const date = new Date(state.currentDate);
        date.setDate(date.getDate() + 1);
        state.currentDate = date.toISOString().split('T')[0];
        dateInput.value = state.currentDate;
        loadDayData();
    });

    // Cycle tracking
    document.querySelectorAll('.cycle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            toggleCycleDay(state.currentDate, type);
            updateCycleStatus();
            // Re-render calendar if on calendar tab
            if (document.getElementById('calendar-tab').classList.contains('active')) {
                renderCalendar();
            }
        });
    });

    // Flare rating input
    const flareInput = document.getElementById('flare-rating');
    flareInput.addEventListener('input', () => {
        saveDayData();
    });

    // Food diary fields - auto save on change
    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(meal => {
        document.getElementById(`food-${meal}`).addEventListener('input', () => {
            saveDayData();
        });
    });

    // Notes - auto save on change
    document.getElementById('daily-notes').addEventListener('input', () => {
        saveDayData();
    });

    loadDayData();
    updateCycleStatus();
}

function loadDayData() {
    const data = state.symptomsData[state.currentDate] || {};

    // Load flare rating
    const flareRating = data.flareRating || 0;
    document.getElementById('flare-rating').value = flareRating;

    // Load food diary
    document.getElementById('food-breakfast').value = data.food?.breakfast || '';
    document.getElementById('food-lunch').value = data.food?.lunch || '';
    document.getElementById('food-dinner').value = data.food?.dinner || '';
    document.getElementById('food-snacks').value = data.food?.snacks || '';

    // Load notes
    document.getElementById('daily-notes').value = data.notes || '';

    // Update cycle button states
    updateCycleStatus();
}

function saveDayData() {
    const data = state.symptomsData[state.currentDate] || {};

    // Save flare rating
    const flareRating = parseInt(document.getElementById('flare-rating').value);
    if (flareRating > 0) {
        data.flareRating = flareRating;
    } else {
        delete data.flareRating;
    }

    // Save food diary
    const food = {
        breakfast: document.getElementById('food-breakfast').value.trim(),
        lunch: document.getElementById('food-lunch').value.trim(),
        dinner: document.getElementById('food-dinner').value.trim(),
        snacks: document.getElementById('food-snacks').value.trim()
    };

    // Only save food object if at least one field has content
    if (Object.values(food).some(val => val)) {
        data.food = food;
    } else {
        delete data.food;
    }

    // Save notes
    const notes = document.getElementById('daily-notes').value.trim();
    if (notes) {
        data.notes = notes;
    } else {
        delete data.notes;
    }

    // Save or delete entry
    if (Object.keys(data).length > 0) {
        state.symptomsData[state.currentDate] = data;
    } else {
        delete state.symptomsData[state.currentDate];
    }

    Storage.set('symptoms', state.symptomsData);

    // Re-render calendar if on calendar tab
    if (document.getElementById('calendar-tab').classList.contains('active')) {
        renderCalendar();
    }
}

function updateCycleStatus() {
    const statusDiv = document.getElementById('cycle-status');
    const currentPeriod = state.cycleData.periods?.find(p =>
        p.start === state.currentDate || (p.end && p.start <= state.currentDate && p.end >= state.currentDate)
    );

    // Update button states
    document.querySelectorAll('.cycle-btn').forEach(btn => btn.classList.remove('marked'));

    const periodInfo = getPeriodInfo(state.currentDate);
    if (periodInfo.isPeriodStart) {
        document.querySelector('[data-type="period-start"]').classList.add('marked');
    }
    if (periodInfo.isPeriodEnd) {
        document.querySelector('[data-type="period-end"]').classList.add('marked');
    }

    const cycleDay = getCycleDay(state.currentDate);
    const cyclePhase = getCyclePhase(state.currentDate);

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
