import { Storage } from './storage.js';

// ===== DATA MIGRATION =====
export function migrateData() {
    const symptomsData = Storage.get('symptoms') || {};
    let needsMigration = false;

    // Check if we have v1.0 data (endo/ibs categories)
    Object.keys(symptomsData).forEach(date => {
        const dayData = symptomsData[date];
        if (dayData.endo || dayData.ibs) {
            needsMigration = true;
        }
    });

    // Check if we have v1.1 data (custom symptoms)
    Object.keys(symptomsData).forEach(date => {
        const dayData = symptomsData[date];
        if (dayData.symptoms && !dayData.flareRating) {
            needsMigration = true;
        }
    });

    if (!needsMigration) return;

    console.log('Migrating data to v2.0...');

    // Map old symptom names to readable names (v1.0 -> v1.1)
    const symptomNameMap = {
        'pelvic-pain': 'Pelvic Pain',
        'cramps': 'Cramps',
        'back-pain': 'Back Pain',
        'fatigue': 'Fatigue',
        'nausea': 'Nausea',
        'abdominal-pain': 'Abdominal Pain',
        'bloating': 'Bloating',
        'diarrhea': 'Diarrhea',
        'constipation': 'Constipation',
        'gas': 'Gas'
    };

    // Migrate each day's data
    Object.keys(symptomsData).forEach(date => {
        const dayData = symptomsData[date];

        // v1.0 -> v1.1 migration (endo/ibs -> symptoms)
        if (dayData.endo || dayData.ibs) {
            const newSymptoms = {};

            if (dayData.endo) {
                Object.entries(dayData.endo).forEach(([key, value]) => {
                    const name = symptomNameMap[key] || key;
                    newSymptoms[name] = value;
                });
                delete dayData.endo;
            }

            if (dayData.ibs) {
                Object.entries(dayData.ibs).forEach(([key, value]) => {
                    const name = symptomNameMap[key] || key;
                    newSymptoms[name] = value;
                });
                delete dayData.ibs;
            }

            if (Object.keys(newSymptoms).length > 0) {
                dayData.symptoms = newSymptoms;
            }
        }

        // v1.1 -> v2.0 migration (custom symptoms -> single flare rating)
        if (dayData.symptoms && !dayData.flareRating) {
            // Calculate average of all symptoms as the flare rating
            const symptomValues = Object.values(dayData.symptoms);
            if (symptomValues.length > 0) {
                const avg = symptomValues.reduce((a, b) => a + b, 0) / symptomValues.length;
                dayData.flareRating = Math.round(avg);
            }
            // Keep old symptom data in archive for reference
            dayData._archivedSymptoms = dayData.symptoms;
            delete dayData.symptoms;
        }
    });

    // Remove old allSymptoms storage key
    localStorage.removeItem('allSymptoms');

    // Save migrated data
    Storage.set('symptoms', symptomsData);
    console.log('Migration to v2.0 complete!');
}
