import { state } from './storage.js';
import { getCyclePhase } from './cycle.js';

// ===== CALENDAR =====
export function initializeCalendar() {
    // Calendar is now controlled by the top date selector
    // Just render the initial calendar
    renderCalendar();
}

export function renderCalendar() {
    const year = state.currentCalendarDate.getFullYear();
    const month = state.currentCalendarDate.getMonth();

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
        if (date === state.currentDate) day.classList.add('selected');

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

        // Display flare rating as flame emoji
        const data = state.symptomsData[date];
        if (data?.flareRating && data.flareRating > 0) {
            const flareDiv = document.createElement('div');
            flareDiv.className = 'calendar-day-flare';
            flareDiv.setAttribute('data-flare-level', data.flareRating);
            flareDiv.textContent = '🔥';
            day.appendChild(flareDiv);
        }

        // Display trigger food indicator
        if (data?.food) {
            const hasTrigger = data.food.triggerBreakfast ||
                             data.food.triggerLunch ||
                             data.food.triggerDinner ||
                             data.food.triggerSnacks;
            if (hasTrigger) {
                const triggerDiv = document.createElement('div');
                triggerDiv.className = 'calendar-day-trigger';
                triggerDiv.textContent = '❌';
                day.appendChild(triggerDiv);
            }
        }

        day.addEventListener('click', () => {
            state.currentDate = date;
            document.getElementById('log-date').value = date;
            // Import and call loadDayData - we'll handle this via event
            window.dispatchEvent(new CustomEvent('dateChanged'));
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
