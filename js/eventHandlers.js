import { state } from './state.js';
import * as ui from './ui.js';
import * as firebase from './firebaseService.js';
import { planGenerator } from './planGenerator.js';

/**
 * @file eventHandlers.js centralizes all application event listeners and their corresponding actions.
 * It acts as the "controller" of the application, responding to user input.
 */

// --- ACTION FUNCTIONS ---

/**
 * Handles the selection of a card-style button.
 * @param {HTMLElement} element - The card element that was clicked.
 * @param {string} field - The field in the state to update (e.g., 'goal', 'experience').
 * @param {string} value - The new value for the state field.
 * @param {boolean} shouldSave - Whether to save the state to Firestore after updating.
 */
async function selectCard(element, field, value, shouldSave = false) {
    if (value === 'cardio') {
        ui.showModal('Coming Soon!', 'Cardiovascular endurance tracking and programming is a planned feature. Stay tuned!');
        return;
    }
    state.userSelections[field] = value;
    element.closest('.card-group').querySelectorAll('.goal-card').forEach(card => card.classList.remove('active'));
    element.classList.add('active');
    if (shouldSave) {
        await firebase.saveStateToFirestore();
    }
}

/**
 * Sets the application's theme.
 * @param {string} theme - The theme to set ('dark' or 'light').
 */
async function setTheme(theme) {
    state.settings.theme = theme;
    ui.applyTheme();
    await firebase.saveStateToFirestore();
    ui.renderSettings();
}

/**
 * Sets the units of measurement for weight.
 * @param {string} unit - The unit to set ('lbs' or 'kg').
 */
async function setUnits(unit) {
    state.settings.units = unit;
    await firebase.saveStateToFirestore();
    ui.renderSettings();
    if (state.currentViewName === 'workout') {
        ui.renderDailyWorkout();
    }
}

/**
 * Sets the progression model for workouts.
 * @param {string} progression - The progression model ('linear' or 'double').
 */
async function setProgressionModel(progression) {
    state.settings.progressionModel = progression;
    await firebase.saveStateToFirestore();
    ui.renderSettings();
}

/**
 * Sets the weight increment for progression.
 * @param {number} increment - The weight increment value.
 */
async function setWeightIncrement(increment) {
    state.settings.weightIncrement = increment;
    await firebase.saveStateToFirestore();
    ui.renderSettings();
}

/** Adds a new day to the workout builder. */
function addDayToBuilder() {
    state.builderPlan.days.forEach(day => day.isExpanded = false);
    state.builderPlan.days.push({ label: 'Add a label', muscleGroups: [{ muscle: 'selectamuscle', focus: 'Primary', exercises: ['', '', ''] }], isExpanded: true });
    ui.renderBuilder();
}

/** Opens the modal to set the plan name and duration. */
function openMesoLengthModal() {
    ui.elements.modalBody.innerHTML = `
        <h2>Plan Details</h2>
        <p>Give your plan a name and select how many weeks it should last. A 1-week deload will be added at the end.</p>
        <input type="text" id="new-plan-name" class="modal-input" placeholder="e.g., My Summer Bulk">
        <div class="card-group" id="meso-length-cards">
            <div class="goal-card meso-length-card" data-value="4" role="button" tabindex="0"><h3>4 Weeks</h3></div>
            <div class="goal-card meso-length-card" data-value="6" role="button" tabindex="0"><h3>6 Weeks</h3></div>
            <div class="goal-card meso-length-card" data-value="8" role="button" tabindex="0"><h3>8 Weeks</h3></div>
        </div>
    `;
    ui.elements.modalActions.innerHTML = `<button id="save-plan-details-btn" class="cta-button">Save Plan</button>`;

    ui.elements.modal.querySelector('#meso-length-cards').addEventListener('click', e => {
        const card = e.target.closest('.meso-length-card');
        if (card) {
            ui.elements.modal.querySelectorAll('.meso-length-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        }
    });

    document.getElementById('save-plan-details-btn').addEventListener('click', () => {
        const length = ui.elements.modal.querySelector('.meso-length-card.active')?.dataset.value;
        const name = document.getElementById('new-plan-name').value;
        if (!length || !name) {
            ui.showModal('Input Required', 'Please select a length and provide a name for your plan.');
            return;
        }
        finalizeAndStartPlan(length, name);
        ui.closeModal();
    });
    ui.elements.modal.classList.add('active');
}

/**
 * Finalizes a new or edited plan and saves it to the state.
 * @param {string} mesoLength - The duration of the plan in weeks.
 * @param {string} planName - The name of the plan.
 */
async function finalizeAndStartPlan(mesoLength, planName) {
    if (state.builderPlan.days.length === 0) {
        ui.showModal("Incomplete Plan", "Please add at least one day to your plan.");
        return;
    }

    const newMeso = {
        id: state.editingPlanId || `meso_${Date.now()}`,
        name: planName,
        startDate: new Date().toISOString(),
        durationWeeks: parseInt(mesoLength),
        builderTemplate: JSON.parse(JSON.stringify(state.builderPlan)),
        weeks: {}
    };

    const focusSetMap = { 'Primary': 5, 'Secondary': 4, 'Maintenance': 2 };
    for (let i = 1; i <= newMeso.durationWeeks; i++) {
        newMeso.weeks[i] = {};
        const isDeload = (i === newMeso.durationWeeks);
        const targetRIR = planGenerator.getRirForWeek(i, newMeso.durationWeeks);

        state.builderPlan.days.forEach((day, dayIndex) => {
            newMeso.weeks[i][dayIndex + 1] = {
                name: day.label === 'Add a label' ? `Day ${dayIndex + 1}` : day.label,
                completed: false,
                exercises: day.muscleGroups
                    .filter(mg => mg.muscle !== 'restday')
                    .flatMap(mg =>
                        mg.exercises.filter(ex => ex && ex !== 'Select an Exercise').map(exName => {
                            const exerciseDetails = state.exercises.find(e => e.name === exName) || {};
                            const setsPerExercise = focusSetMap[mg.focus] || 3;
                            return {
                                exerciseId: `ex_${exName.replace(/\s+/g, '_')}`, name: exName, muscle: exerciseDetails.muscle || 'Unknown', type: mg.focus,
                                targetSets: isDeload ? Math.ceil(setsPerExercise / 2) : setsPerExercise,
                                targetReps: 8,
                                targetRIR: targetRIR,
                                targetLoad: null, sets: [],
                                stallCount: 0
                            };
                        })
                    )
            };
        });
    }

    if (state.editingPlanId) {
        const planIndex = state.allPlans.findIndex(p => p.id === state.editingPlanId);
        state.allPlans[planIndex] = newMeso;
    } else {
        state.allPlans.push(newMeso);
    }

    state.activePlanId = newMeso.id;
    state.currentView = { week: 1, day: 1 };
    await firebase.saveStateToFirestore();
    ui.showView('home');
}

/**
 * Loads an existing plan into the builder for editing.
 * @param {string} planId - The ID of the plan to edit.
 */
function openBuilderForEdit(planId) {
    const planToEdit = state.allPlans.find(p => p.id === planId);
    if (!planToEdit) return;
    state.editingPlanId = planId;
    state.builderPlan = JSON.parse(JSON.stringify(planToEdit.builderTemplate || { days: [] }));
    ui.elements.builderTitle.textContent = `Editing: ${planToEdit.name}`;
    ui.showView('builder');
}

/**
 * Toggles the inline editor for a plan name in the settings list.
 * @param {string} planId - The ID of the plan to edit the name of.
 * @param {HTMLElement} button - The button element that was clicked.
 */
async function toggleEditPlanName(planId, button) {
    const planItem = document.querySelector(`.plan-item[data-plan-id="${planId}"]`);
    const input = planItem.querySelector('.plan-name-input');
    const text = planItem.querySelector('.plan-name-text');

    const isEditing = button.textContent === 'Save';

    if (isEditing) {
        const newName = input.value.trim();
        if (newName) {
            const plan = state.allPlans.find(p => p.id === planId);
            if (plan) {
                plan.name = newName;
                await firebase.saveStateToFirestore();
            }
            text.textContent = newName;
        }
        button.textContent = 'Edit';
    } else {
        button.textContent = 'Save';
    }

    input.classList.toggle('hidden');
    text.classList.toggle('hidden');
    if (!isEditing) {
        input.focus();
    }
}


/**
 * Shows a confirmation modal before deleting a plan.
 * @param {string} planId - The ID of the plan to delete.
 */
function confirmDeletePlan(planId) {
    ui.showModal('Delete Plan?', 'Are you sure you want to permanently delete this plan? This cannot be undone.', [
        { text: 'Cancel', class: 'secondary-button' },
        { text: 'Yes, Delete', class: 'cta-button', action: () => deletePlan(planId) }
    ]);
}

/**
 * Deletes a plan from the state and saves the changes.
 * @param {string} planId - The ID of the plan to delete.
 */
async function deletePlan(planId) {
    state.allPlans = state.allPlans.filter(p => p.id !== planId);
    if (state.activePlanId === planId) {
        state.activePlanId = state.allPlans.length > 0 ? state.allPlans[0].id : null;
    }
    await firebase.saveStateToFirestore();
    ui.renderSettings();
}

/**
 * Sets a plan as the active plan.
 * @param {string} planId - The ID of the plan to set as active.
 */
async function setActivePlan(planId) {
    state.activePlanId = planId;
    await firebase.saveStateToFirestore();
    ui.renderSettings();
}

/** Shows a confirmation modal before completing a workout. */
function confirmCompleteWorkout() {
    ui.showModal('Complete Workout?', 'Are you sure you want to complete this workout? This action cannot be undone.', [
        { text: 'Cancel', class: 'secondary-button' },
        { text: 'Yes, Complete', class: 'cta-button', action: () => completeWorkout() }
    ]);
}

/**
 * Marks a workout as complete, processes the data, and advances the user to the next workout.
 */
async function completeWorkout() {
    pauseTimer(); // Stop the timer when workout is completed
    const planIndex = state.allPlans.findIndex(p => p.id === state.activePlanId);
    if (planIndex === -1) return;
    const activePlan = state.allPlans[planIndex];
    const { week, day } = state.currentView;
    const workout = activePlan.weeks[week][day];
    workout.completed = true;
    workout.completedDate = new Date().toISOString();

    workout.exercises.forEach(ex => {
        ex.totalVolume = (ex.sets || []).reduce((total, set) => total + (set.weight || 0) * (set.reps || 0), 0);
    });

    const stalledExercise = checkForStallAndRecommendDeload(activePlan, week, day);

    // Show summary view BEFORE advancing to the next day
    ui.showView('workoutSummary');

    if (!stalledExercise && week < activePlan.durationWeeks - 1 && workout.exercises.length > 0) {
        calculateNextWeekProgression(week, activePlan);
    }

    const dayKeys = Object.keys(activePlan.weeks[week]).sort((a, b) => a - b);
    const currentDayIndex = dayKeys.indexOf(day.toString());
    let nextWeek = week;
    let nextDay = null;

    if (currentDayIndex < dayKeys.length - 1) {
        nextDay = parseInt(dayKeys[currentDayIndex + 1]);
    } else {
        if (week < activePlan.durationWeeks) {
            nextWeek = week + 1;
            const nextWeekDayKeys = Object.keys(activePlan.weeks[nextWeek] || {}).sort((a, b) => a - b);
            nextDay = nextWeekDayKeys.length > 0 ? parseInt(nextWeekDayKeys[0]) : null;
        } else {
            // This case might be handled differently now with the summary screen,
            // but for now, we'll just set it to the beginning.
            state.currentView = { week: 1, day: 1 };
        }
    }

    if (nextDay) {
        state.currentView = { week: nextWeek, day: nextDay };
    }

    await firebase.saveStateToFirestore();
}

/**
 * Checks if an exercise has stalled and recommends a deload if necessary.
 * @param {object} plan - The active workout plan.
 * @param {number} completedWeek - The week number just completed.
 * @param {number} completedDayKey - The day key just completed.
 * @returns {object|null} The stalled exercise object, or null if no stall was detected.
 */
function checkForStallAndRecommendDeload(plan, completedWeek, completedDayKey) {
    if (completedWeek < 2) return null;

    const completedWorkout = plan.weeks[completedWeek][completedDayKey];
    const lastWeekWorkout = plan.weeks[completedWeek - 1]?.[completedDayKey];
    if (!lastWeekWorkout || !lastWeekWorkout.completed) return null;

    let stalledExercise = null;

    for (const ex of completedWorkout.exercises) {
        if (ex.type !== 'Primary') continue;

        const lastWeekEx = lastWeekWorkout.exercises.find(e => e.exerciseId === ex.exerciseId);
        if (!lastWeekEx || !lastWeekEx.sets || lastWeekEx.sets.length === 0) continue;

        const maxWeightThisWeek = Math.max(...(ex.sets || []).map(s => s.weight || 0));
        const topSetThisWeek = ex.sets.find(s => s.weight === maxWeightThisWeek);
        if (!topSetThisWeek) continue;
        const eRepsThisWeek = (topSetThisWeek.reps || 0) + (topSetThisWeek.rir || 0);

        const maxWeightLastWeek = Math.max(...(lastWeekEx.sets || []).map(s => s.weight || 0));
        const topSetLastWeek = lastWeekEx.sets.find(s => s.weight === maxWeightLastWeek);
        if (!topSetLastWeek) continue;
        const eRepsLastWeek = (topSetLastWeek.reps || 0) + (topSetLastWeek.rir || 0);

        if (maxWeightThisWeek < maxWeightLastWeek || (maxWeightThisWeek === maxWeightLastWeek && eRepsThisWeek <= eRepsLastWeek)) {
            ex.stallCount = (lastWeekEx.stallCount || 0) + 1;
        } else {
            ex.stallCount = 0;
        }

        if (ex.stallCount >= 2) {
            stalledExercise = ex;
            break;
        }
    }

    if (stalledExercise) {
        ui.showModal(
            'Plateau Detected!',
            `It looks like you're hitting a plateau on <strong>${stalledExercise.name}</strong>. To help break through, we recommend a deload. Would you like to automatically reduce the target weight by 15% for next week?`,
            [
                { text: 'No, Thanks', class: 'secondary-button', action: () => ui.showView('home') },
                { text: 'Yes, Apply Deload', class: 'cta-button', action: () => applyDeload(plan, completedWeek, stalledExercise) }
            ]
        );
    }

    return stalledExercise;
}

/**
 * Applies a deload to a specific exercise for the next week.
 * @param {object} plan - The active workout plan.
 * @param {number} currentWeek - The week number just completed.
 * @param {object} exercise - The exercise to deload.
 */
function applyDeload(plan, currentWeek, exercise) {
    const nextWeek = currentWeek + 1;
    if (!plan.weeks[nextWeek]) return;

    for (const dayKey in plan.weeks[nextWeek]) {
        const day = plan.weeks[nextWeek][dayKey];
        const exToDeload = day.exercises.find(e => e.exerciseId === exercise.exerciseId);
        if (exToDeload) {
            const lastWeight = Math.max(...(exercise.sets || []).map(s => s.weight || 0));
            exToDeload.targetLoad = Math.round((lastWeight * 0.85) / 5) * 5;
            exToDeload.stallCount = 0;
        }
    }
    ui.showView('home');
}

/**
 * Calculates the progression targets for the next week's workouts.
 * @param {number} completedWeekNumber - The week number just completed.
 * @param {object} plan - The active workout plan.
 */
function calculateNextWeekProgression(completedWeekNumber, plan) {
    const nextWeekNumber = completedWeekNumber + 1;
    if (!plan.weeks[nextWeekNumber]) return;
    const { progressionModel, weightIncrement } = state.settings;
    for (const dayKey in plan.weeks[completedWeekNumber]) {
        const completedDay = plan.weeks[completedWeekNumber][dayKey];
        const nextWeekDay = plan.weeks[nextWeekNumber][dayKey];
        if (!nextWeekDay) continue;
        completedDay.exercises.forEach((completedEx) => {
            const nextWeekEx = nextWeekDay.exercises.find(ex => ex.exerciseId === completedEx.exerciseId);
            if (!nextWeekEx) return;
            if (!completedEx.sets || completedEx.sets.length === 0) {
                nextWeekEx.targetLoad = completedEx.targetLoad || null;
                return;
            }
            const allSetsSuccessful = completedEx.sets.every(set => (set.reps || 0) + (set.rir || 0) >= completedEx.targetReps);
            const lastSetWeight = completedEx.sets[completedEx.sets.length - 1].weight;
            if (progressionModel === 'double') {
                if (allSetsSuccessful) {
                    const newTargetReps = (completedEx.targetReps || 8) + 1;
                    if (newTargetReps > 12) {
                        nextWeekEx.targetLoad = lastSetWeight + weightIncrement;
                        nextWeekEx.targetReps = 8;
                    } else {
                        nextWeekEx.targetLoad = lastSetWeight;
                        nextWeekEx.targetReps = newTargetReps;
                    }
                } else {
                    nextWeekEx.targetLoad = lastSetWeight;
                    nextWeekEx.targetReps = completedEx.targetReps;
                }
            } else { // Linear
                nextWeekEx.targetLoad = allSetsSuccessful ? lastSetWeight + weightIncrement : lastSetWeight;
                nextWeekEx.targetReps = completedEx.targetReps;
            }
        });
    }
}

/**
 * Selects a workout template and loads it into the builder.
 * @param {string} templateId - The ID of the template to select.
 */
function selectTemplate(templateId) {
    const allTemplates = planGenerator.getAllTemplates ? planGenerator.getAllTemplates() : [];
    const selectedTemplate = allTemplates.find(t => t.id === templateId);
    if (selectedTemplate) {
        state.builderPlan = planGenerator.generate(selectedTemplate.config, state.exercises).builderPlan;
        ui.showView('builder');
    }
}

// --- TIMER FUNCTIONS ---

/** Starts the workout timer. */
function startTimer() {
    if (state.workoutTimer.isRunning) return;
    state.workoutTimer.isRunning = true;
    state.workoutTimer.startTime = Date.now();
    state.workoutTimer.instance = setInterval(ui.updateTimerDisplay, 1000);
}

/** Pauses the workout timer. */
function pauseTimer() {
    if (!state.workoutTimer.isRunning) return;
    state.workoutTimer.isRunning = false;
    state.workoutTimer.elapsed += Math.floor((Date.now() - state.workoutTimer.startTime) / 1000);
    clearInterval(state.workoutTimer.instance);
    ui.updateTimerDisplay();
}

/** Resets the workout timer. */
function resetTimer() {
    state.workoutTimer.isRunning = false;
    state.workoutTimer.elapsed = 0;
    state.workoutTimer.startTime = 0;
    clearInterval(state.workoutTimer.instance);
    ui.updateTimerDisplay();
}

/**
 * Sets the timer mode between stopwatch and timer.
 * @param {string} mode - The mode to switch to ('stopwatch' or 'timer').
 */
function setTimerMode(mode) {
    if (state.workoutTimer.mode === mode) return;
    resetTimer();
    state.workoutTimer.mode = mode;
    document.querySelectorAll('[data-action="setTimerMode"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    ui.updateTimerDisplay();
}


// --- NOTE AND HISTORY FUNCTIONS ---

/**
 * Opens a modal to add or edit a note for a specific set.
 * @param {string} exerciseIndex - The index of the exercise.
 * @param {string} setIndex - The index of the set.
 */
function openNoteModal(exerciseIndex, setIndex) {
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    const workout = activePlan.weeks[state.currentView.week][state.currentView.day];
    const set = workout.exercises[exerciseIndex].sets[setIndex] || {};
    const note = set.note || '';

    ui.showModal(
        `Note for Set ${parseInt(setIndex) + 1}`,
        `<textarea id="set-note-input" class="modal-input modal-textarea" placeholder="e.g., Felt strong, add weight next time...">${note}</textarea>`,
        [
            { text: 'Cancel', class: 'secondary-button' },
            {
                text: 'Save Note',
                class: 'cta-button',
                action: () => {
                    const newNote = document.getElementById('set-note-input').value;
                    set.note = newNote;
                    ui.renderDailyWorkout(); // Re-render to show note indicator
                }
            }
        ]
    );
}

/**
 * Gathers and displays the performance history for a specific exercise.
 * @param {string} exerciseId - The ID of the exercise to show history for.
 */
function showHistory(exerciseId) {
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    const exerciseName = state.exercises.find(ex => `ex_${ex.name.replace(/\s+/g, '_')}` === exerciseId)?.name || "Exercise";
    let historyHTML = '';

    for (const week of Object.values(activePlan.weeks).reverse()) {
        for (const day of Object.values(week).reverse()) {
            if (day.completed) {
                const exerciseInstance = day.exercises.find(ex => ex.exerciseId === exerciseId);
                if (exerciseInstance) {
                    historyHTML += `<div class="history-item">`;
                    historyHTML += `<div class="history-date">${new Date(day.completedDate).toLocaleDateString()}</div>`;
                    exerciseInstance.sets.forEach((set, index) => {
                        if (set.weight && (set.reps || set.rir)) {
                            historyHTML += `<div class="history-performance">Set ${index + 1}: ${set.weight}${state.settings.units} x ${set.rawInput}</div>`;
                            if (set.note) {
                                historyHTML += `<div class="history-note">"${set.note}"</div>`;
                            }
                        }
                    });
                    historyHTML += `</div>`;
                }
            }
        }
    }

    if (!historyHTML) {
        historyHTML = '<p class="placeholder-text">No completed history for this exercise yet.</p>';
    }

    ui.showModal(`${exerciseName} History`, historyHTML, [{ text: 'Close', class: 'cta-button' }]);
}


// --- EVENT LISTENER INITIALIZATION ---

/** Initializes all event listeners for the application. */
export function initEventListeners() {
    // Main event delegation for data-action attributes
    document.body.addEventListener('click', e => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const { action, field, value, viewName, planId, increment, theme, unit, progression, shouldSave, tab, templateId, exerciseIndex, setIndex, exerciseId, mode } = target.dataset;

        const actions = {
            showView: () => ui.showView(viewName),
            selectCard: () => selectCard(target, field, value, shouldSave === 'true'),
            setTheme: () => setTheme(theme),
            setUnits: () => setUnits(unit),
            setProgressionModel: () => setProgressionModel(progression),
            setWeightIncrement: () => setWeightIncrement(parseFloat(increment)),
            addDayToBuilder: () => addDayToBuilder(),
            openMesoLengthModal: () => openMesoLengthModal(),
            openBuilderForEdit: () => openBuilderForEdit(planId),
            toggleEditPlanName: () => toggleEditPlanName(planId, target),
            confirmDeletePlan: () => confirmDeletePlan(planId),
            setActivePlan: () => setActivePlan(planId),
            confirmCompleteWorkout: () => confirmCompleteWorkout(),
            closeModal: () => ui.closeModal(),
            switchTab: () => { /* Logic for switching tabs can be added here if needed */ },
            selectTemplate: () => selectTemplate(templateId),
            finishWizard: () => ui.customPlanWizard.finish(),
            startTimer: () => startTimer(),
            pauseTimer: () => pauseTimer(),
            resetTimer: () => resetTimer(),
            setTimerMode: () => setTimerMode(mode),
            addSet: () => {
                const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
                const workout = activePlan.weeks[state.currentView.week][state.currentView.day];
                const exercise = workout.exercises[exerciseIndex];
                if (!exercise.sets) exercise.sets = [];
                if (exercise.sets.length < exercise.targetSets) {
                    const previousWeight = exercise.sets.length > 0 ? exercise.sets[exercise.sets.length - 1].weight : (exercise.targetLoad || '');
                    exercise.sets.push({ weight: previousWeight, reps: '', rir: '', rawInput: '' });
                    ui.renderDailyWorkout();
                }
            },
            swapExercise: () => {
                const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
                const workout = activePlan.weeks[state.currentView.week][state.currentView.day];
                const currentExerciseName = workout.exercises[exerciseIndex].name;
                const exerciseData = state.exercises.find(e => e.name === currentExerciseName);

                if (!exerciseData || !exerciseData.alternatives || exerciseData.alternatives.length === 0) {
                    ui.showModal("No Alternatives", "Sorry, no alternatives are listed for this exercise.");
                    return;
                }
                const alternativesHTML = exerciseData.alternatives.map(altName => `<div class="goal-card alternative-card" data-new-exercise-name="${altName}" role="button" tabindex="0"><h3>${altName}</h3></div>`).join('');
                ui.elements.modalBody.innerHTML = `<h2>Swap ${currentExerciseName}</h2><p>Choose a replacement exercise:</p><div class="card-group">${alternativesHTML}</div>`;
                ui.elements.modalActions.innerHTML = '';
                ui.elements.modal.querySelectorAll('.alternative-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const newExerciseName = card.dataset.newExerciseName;
                        const oldExercise = workout.exercises[exerciseIndex];
                        const newExerciseData = state.exercises.find(e => e.name === newExerciseName);
                        if (!newExerciseData) return;
                        workout.exercises[exerciseIndex] = { ...oldExercise, name: newExerciseData.name, muscle: newExerciseData.muscle, exerciseId: `ex_${newExerciseData.name.replace(/\s+/g, '_')}`, sets: [] };
                        ui.renderDailyWorkout();
                        ui.closeModal();
                    });
                });
                ui.elements.modal.classList.add('active');
            },
            openNoteModal: () => openNoteModal(exerciseIndex, setIndex),
            showHistory: () => showHistory(exerciseId),
        };

        if (actions[action]) {
            actions[action]();
        }
    });

    // Event listener for the plan hub
    ui.elements.planHubView.addEventListener('click', e => {
        const hubOption = e.target.closest('.hub-option');
        if (!hubOption) return;
        const hubAction = hubOption.dataset.hubAction;
        if (hubAction === 'scratch') ui.showView('customPlanWizard');
        if (hubAction === 'template') ui.showView('templateLibrary');
        if (hubAction === 'resume') ui.showView('workout');
    });

    // Event listeners for the workout builder
    ui.elements.scheduleContainer.addEventListener('click', (e) => {
        const dayCard = e.target.closest('.day-card');
        if (!dayCard) return;
        const dayIndex = parseInt(dayCard.dataset.dayIndex, 10);
        if (e.target.closest('.day-header') && dayCard.classList.contains('collapsed')) {
            state.builderPlan.days.forEach((day, index) => { day.isExpanded = (index === dayIndex) ? !day.isExpanded : false; });
            ui.renderBuilder();
            return;
        }
        const button = e.target.closest('button');
        if (!button) return;
        const { muscleIndex, focus } = button.dataset;
        if (button.matches('.add-muscle-group-btn')) {
            state.builderPlan.days[dayIndex].muscleGroups.push({ muscle: 'selectamuscle', focus: 'Primary', exercises: ['', '', ''] });
            ui.renderBuilder();
        }
        if (button.matches('.delete-day-btn')) {
            state.builderPlan.days.splice(dayIndex, 1);
            ui.renderBuilder();
        }
        if (button.matches('.delete-muscle-group-btn')) {
            state.builderPlan.days[dayIndex].muscleGroups.splice(muscleIndex, 1);
            ui.renderBuilder();
        }
        if (button.matches('.focus-btn')) {
            state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].focus = focus;
            ui.renderBuilder();
        }
    });

    ui.elements.scheduleContainer.addEventListener('change', (e) => {
        const { dayIndex, muscleIndex, exerciseSelectIndex } = e.target.dataset;
        if (e.target.matches('.day-label-selector')) state.builderPlan.days[dayIndex].label = e.target.value;
        if (e.target.matches('.muscle-select')) {
            state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].muscle = e.target.value;
            state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises = ['', '', ''];
            ui.renderBuilder();
        }
        if (e.target.matches('.exercise-select')) state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises[exerciseSelectIndex] = e.target.value;
    });

    // Event listener for closing the modal by clicking the background
    ui.elements.modal.addEventListener('click', (e) => {
        if (e.target === ui.elements.modal) ui.closeModal();
    });

    // Event listener for workout view inputs
    ui.elements.workoutView.addEventListener('input', (e) => {
        if (e.target.matches('.weight-input, .rep-rir-input')) {
            const { exerciseIndex, setIndex } = e.target.dataset;
            const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
            const workout = activePlan.weeks[state.currentView.week][state.currentView.day];
            const exercise = workout?.exercises[exerciseIndex];
            if (!exercise) return;
            if (!exercise.sets[setIndex]) exercise.sets[setIndex] = {};
            const set = exercise.sets[setIndex];

            if (e.target.classList.contains('weight-input')) {
                set.weight = parseFloat(e.target.value) || '';
            } else if (e.target.classList.contains('rep-rir-input')) {
                const value = e.target.value.toLowerCase();
                set.rawInput = value;

                const rirMatch = value.match(/(\d+)\s*rir/);
                if (rirMatch) {
                    set.rir = parseInt(rirMatch[1]);
                    set.reps = '';
                } else {
                    set.reps = parseInt(value) || '';
                    set.rir = '';
                }
            }
        }
    });

    // Event listener for the performance summary exercise tracker
    document.getElementById('exercise-tracker-select')?.addEventListener('change', (e) => ui.renderProgressChart(e.target.value));

    // Event listeners for the custom plan wizard
    ui.elements.customPlanWizardView.addEventListener('click', e => {
        const wizard = ui.customPlanWizard;
        const dayCard = e.target.closest('.day-card');
        if (dayCard) {
            wizard.config.days = parseInt(dayCard.dataset.value);
            wizard.updatePriorityMuscleLimit();
            ui.elements.customPlanWizardView.querySelectorAll('.day-card').forEach(c => c.classList.remove('active'));
            dayCard.classList.add('active');
        }
        const focusCard = e.target.closest('.focus-card');
        if (focusCard) {
            wizard.config.focus = focusCard.dataset.value;
            ui.elements.customPlanWizardView.querySelectorAll('.focus-card').forEach(c => c.classList.remove('active'));
            focusCard.classList.add('active');
        }
        const muscleCard = e.target.closest('.muscle-card');
        if (muscleCard) {
            const muscle = muscleCard.dataset.value;
            const limit = wizard.getPriorityMuscleLimit();
            if (muscleCard.classList.contains('active')) {
                muscleCard.classList.remove('active');
                wizard.config.priorityMuscles = (wizard.config.priorityMuscles || []).filter(m => m !== muscle);
            } else {
                if ((wizard.config.priorityMuscles || []).length < limit) {
                    muscleCard.classList.add('active');
                    wizard.config.priorityMuscles = [...(wizard.config.priorityMuscles || []), muscle];
                }
            }
        }
    });
}
