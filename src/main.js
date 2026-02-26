import { state } from './modules/storage.js';
import { migrateData } from './modules/migration.js';
import { initializeLogTab } from './modules/log.js';
import { initializeCalendar, renderCalendar } from './modules/calendar.js';
import { initializeInsights, renderInsights } from './modules/insights.js';

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

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Migrate old data format if needed
    migrateData();

    initializeTabs();
    initializeLogTab();
    initializeCalendar();
    initializeInsights();

    // Handle date changes from calendar
    window.addEventListener('dateChanged', () => {
        const event = new Event('change');
        document.getElementById('log-date').dispatchEvent(event);
    });
});
