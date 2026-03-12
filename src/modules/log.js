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

    // Day navigation arrows
    document.getElementById('prev-day').addEventListener('click', () => {
        navigateDay(-1);
    });
    document.getElementById('next-day').addEventListener('click', () => {
        navigateDay(1);
    });

    // Update date display
    updateDateDisplay();

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
        document.getElementById(`trigger-${meal}`).addEventListener('change', () => {
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

function navigateDay(offset) {
    const currentDate = new Date(state.currentDate + 'T00:00:00');
    currentDate.setDate(currentDate.getDate() + offset);

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    state.currentDate = `${year}-${month}-${day}`;

    const dateInput = document.getElementById('log-date');
    dateInput.value = state.currentDate;

    loadDayData();
    updateDateDisplay();
}

function updateDateDisplay() {
    // Update log date display (in log tab)
    const logDateDisplay = document.getElementById('log-date-display');
    if (logDateDisplay) {
        const date = new Date(state.currentDate + 'T00:00:00');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        logDateDisplay.textContent = date.toLocaleDateString('en-US', options);
    }

    // Update navigation button states
    const today = new Date().toISOString().split('T')[0];
    const nextDayBtn = document.getElementById('next-day');
    if (nextDayBtn) {
        // Disable next button if we're on today
        nextDayBtn.disabled = state.currentDate >= today;
    }
}

function updateCalendarFromDate() {
    // Update calendar to show the month of the current date
    const date = new Date(state.currentDate);
    state.currentCalendarDate = new Date(date.getFullYear(), date.getMonth(), 1);

    // If on calendar tab, re-render
    if (document.getElementById('calendar-tab').classList.contains('active')) {
        renderCalendar();
    }
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

    // Load trigger flags
    document.getElementById('trigger-breakfast').checked = data.food?.triggerBreakfast || false;
    document.getElementById('trigger-lunch').checked = data.food?.triggerLunch || false;
    document.getElementById('trigger-dinner').checked = data.food?.triggerDinner || false;
    document.getElementById('trigger-snacks').checked = data.food?.triggerSnacks || false;

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
        snacks: document.getElementById('food-snacks').value.trim(),
        triggerBreakfast: document.getElementById('trigger-breakfast').checked,
        triggerLunch: document.getElementById('trigger-lunch').checked,
        triggerDinner: document.getElementById('trigger-dinner').checked,
        triggerSnacks: document.getElementById('trigger-snacks').checked
    };

    // Only save food object if at least one field has content or trigger is checked
    const hasContent = food.breakfast || food.lunch || food.dinner || food.snacks;
    const hasTrigger = food.triggerBreakfast || food.triggerLunch || food.triggerDinner || food.triggerSnacks;

    if (hasContent || hasTrigger) {
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
