// ===== LOCAL STORAGE MANAGEMENT =====
export const Storage = {
    get: (key) => JSON.parse(localStorage.getItem(key) || 'null'),
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    clear: () => localStorage.clear()
};

// ===== STATE =====
export const state = {
    logDate: new Date().toISOString().split('T')[0],
    calendarDate: new Date().toISOString().split('T')[0],
    symptomsData: Storage.get('symptoms') || {},
    cycleData: Storage.get('cycle') || { periods: [] }
};
