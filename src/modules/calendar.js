import { state } from './storage.js';
import { getCyclePhase } from './cycle.js';

// ===== CALENDAR =====
export function initializeCalendar() {
    // Populate month dropdown
    const monthSelect = document.getElementById('month-select');
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

    monthSelect.innerHTML = '';
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    // Populate year dropdown (current year ± 5 years)
    const yearSelect = document.getElementById('year-select');
    yearSelect.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 5; year <= currentYear + 5; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    // Set current month and year
    monthSelect.value = state.currentCalendarDate.getMonth();
    yearSelect.value = state.currentCalendarDate.getFullYear();

    // Month/Year dropdown change handlers
    monthSelect.addEventListener('change', () => {
        state.currentCalendarDate.setMonth(parseInt(monthSelect.value));
        renderCalendar();
    });

    yearSelect.addEventListener('change', () => {
        state.currentCalendarDate.setFullYear(parseInt(yearSelect.value));
        renderCalendar();
    });

    // Previous/Next month buttons
    document.getElementById('prev-month').addEventListener('click', () => {
        state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() - 1);
        monthSelect.value = state.currentCalendarDate.getMonth();
        yearSelect.value = state.currentCalendarDate.getFullYear();
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + 1);
        monthSelect.value = state.currentCalendarDate.getMonth();
        yearSelect.value = state.currentCalendarDate.getFullYear();
        renderCalendar();
    });

    renderCalendar();
}

export function renderCalendar() {
    const year = state.currentCalendarDate.getFullYear();
    const month = state.currentCalendarDate.getMonth();

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

        // Display flare rating if available
        const data = state.symptomsData[date];
        if (data?.flareRating) {
            const flareDiv = document.createElement('div');
            flareDiv.className = 'calendar-day-total';
            flareDiv.textContent = data.flareRating;
            day.appendChild(flareDiv);
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
