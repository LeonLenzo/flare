// ===== LOCAL STORAGE MANAGEMENT =====
export const Storage = {
    get: (key) => JSON.parse(localStorage.getItem(key) || 'null'),
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    clear: () => localStorage.clear()
};

// ===== STATE =====
export const state = {
    currentDate: new Date().toISOString().split('T')[0],
    currentCalendarDate: new Date(),
    symptomsData: Storage.get('symptoms') || {},
    cycleData: Storage.get('cycle') || { periods: [] }
};
