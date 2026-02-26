import { state } from './modules/storage.js';
import { migrateData } from './modules/migration.js';
import { initializeLogTab } from './modules/log.js';
import { initializeCalendar, renderCalendar } from './modules/calendar.js';
import { renderCycleSummary, initializeDataButtons } from './modules/insights.js';

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

            if (tabName === 'calendar') {
                renderCalendar();
                renderCycleSummary();
            }
        });
    });
}

// ===== WELCOME OVERLAY =====
function initializeWelcomeOverlay() {
    const overlay = document.getElementById('welcome-overlay');
    const dontShowAgain = document.getElementById('dont-show-again');
    const closeOverlay = document.getElementById('close-overlay');

    // Check if user has seen the welcome message
    const hasSeenWelcome = localStorage.getItem('hasSeenV2Welcome');

    if (!hasSeenWelcome) {
        overlay.style.display = 'flex';
    }

    dontShowAgain.addEventListener('click', () => {
        localStorage.setItem('hasSeenV2Welcome', 'true');
        overlay.style.display = 'none';
    });

    closeOverlay.addEventListener('click', () => {
        overlay.style.display = 'none';
    });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Migrate old data format if needed
    migrateData();

    initializeTabs();
    initializeLogTab();
    initializeCalendar();
    initializeDataButtons();
    initializeWelcomeOverlay();

    // Handle date changes from calendar
    window.addEventListener('dateChanged', () => {
        const event = new Event('change');
        document.getElementById('log-date').dispatchEvent(event);
    });
});
