import { Storage, state } from './storage.js';

// ===== UI UTILITY FUNCTIONS =====
export function showToast(message) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2000);
}

export function exportData() {
    const data = {
        version: '2.0',
        symptoms: state.symptomsData,
        cycle: state.cycleData,
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

export function clearAllData() {
    if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
        Storage.clear();
        state.symptomsData = {};
        state.cycleData = { periods: [] };
        showToast('All data cleared');
        location.reload();
    }
}
