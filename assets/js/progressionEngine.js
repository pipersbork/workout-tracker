let templatesCache = null;

/**
 * Load templates from JSON file
 */
async function loadTemplates() {
    if (!templatesCache) {
        const response = await fetch('./assets/data/programTemplates.json');
        templatesCache = await response.json();
    }
    return templatesCache;
}

/**
 * Generate initial program based on user selections
 */
async function generatePlan(userSelections) {
    const templates = await loadTemplates();
    const { goal, experience } = userSelections;

    if (!templates[goal] || !templates[goal][experience]) {
        throw new Error("Invalid goal or experience level.");
    }

    const planTemplate = templates[goal][experience];

    const plan = {
        week: 1,
        goal,
        experience,
        baseVolume: planTemplate.baseVolume,
        maxVolume: planTemplate.maxVolume,
        currentVolume: planTemplate.baseVolume,
        rirTarget: planTemplate.rirStart,
        repRanges: planTemplate.repRanges,
        deloadWeek: planTemplate.deloadWeek,
        sessions: generateSessions(planTemplate, userSelections)
    };

    return plan;
}

/**
 * Generate session structure based on template
 */
function generateSessions(template, userSelections) {
    const { baseVolume, repRanges } = template;
    const frequency = userSelections.frequency || 2;
    const setsPerSession = Math.ceil(baseVolume / frequency);

    const sessions = [];
    for (let i = 0; i < frequency; i++) {
        sessions.push({
            name: `Session ${i + 1}`,
            exercises: [
                {
                    name: "Compound Lift",
                    sets: setsPerSession,
                    reps: repRanges.primary,
                    rir: template.rirStart,
                    load: "Start at 65-70% of 1RM"
                },
                {
                    name: "Accessory",
                    sets: 2,
                    reps: repRanges.secondary,
                    rir: template.rirStart
                }
            ]
        });
    }

    return sessions;
}

/**
 * Apply progression after workout log
 */
function applyProgression(currentPlan, workoutLog) {
    const updatedPlan = { ...currentPlan };

    workoutLog.forEach(log => {
        if (log.completedReps >= log.targetReps[1]) {
            // Upper range hit → increase load
            log.load = increaseLoad(log.load);
        } else if (log.completedReps < log.targetReps[0]) {
            // Below lower range → maintain load, add volume if possible
            if (updatedPlan.currentVolume < updatedPlan.maxVolume) {
                updatedPlan.currentVolume += 1;
            }
        }
    });

    // Adjust RIR toward target for this mesocycle
    if (updatedPlan.rirTarget > updatedPlan.rirEnd) {
        updatedPlan.rirTarget -= 1;
    }

    return updatedPlan;
}

/**
 * Increase load by 2-5%
 */
function increaseLoad(currentLoad) {
    if (typeof currentLoad === 'number') {
        return +(currentLoad * 1.025).toFixed(2);
    }
    return currentLoad; // if load is descriptive text
}

/**
 * Fatigue check and deload trigger
 */
function checkFatigue(fatigueScore, plan) {
    if (fatigueScore > 7) {
        plan.currentVolume = Math.max(plan.baseVolume - 2, 6);
    }
    if (fatigueScore > 9 || plan.week === plan.deloadWeek) {
        scheduleDeload(plan);
    }
    return plan;
}

/**
 * Deload logic: reduce volume & reset RIR
 */
function scheduleDeload(plan) {
    plan.currentVolume = Math.floor(plan.baseVolume / 2);
    plan.rirTarget = plan.templates ? plan.templates.rirStart : 3;
    plan.week = 1;
}

/**
 * Save plan to IndexedDB
 */
async function savePlanToDB(plan) {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("preferences", "readwrite");
        tx.objectStore("preferences").put({ id: 2, activePlan: plan });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject("Failed to save plan");
    });
}

/**
 * Get plan from IndexedDB
 */
async function getPlanFromDB() {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("preferences", "readonly");
        const request = tx.objectStore("preferences").get(2);
        request.onsuccess = () => resolve(request.result ? request.result.activePlan : null);
        request.onerror = () => reject("Failed to load plan");
    });
}
