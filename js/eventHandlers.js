import { state } from './state.js';
import * as ui from './ui.js';
import * as firebase from './firebaseService.js';
import { planGenerator } from './planGenerator.js';

/**
 * @file eventHandlers.js centralizes all application event listeners and their corresponding actions.
 * It acts as the "controller" of the application, responding to user input.
 */

// --- ACTION FUNCTIONS ---

async function selectCard(element, field, value, shouldSave = false) {
    if (value === 'cardio') {
        ui.showModal('Coming Soon!', 'Cardiovascular endurance tracking and programming is a planned feature. Stay tuned!');
        return;
    }
    state.userSelections[field] = value;
    element.closest('.card-group').querySelectorAll('.goal-card').forEach(card => card.classList.remove('active'));
    element.classList.add('active');
    if (shouldSave) {
        await firebase.saveState();
    }
}

async function setTheme(theme) {
    state.settings.theme = theme;
    ui.applyTheme();
    await firebase.saveState();
    ui.renderSettings();
}

async function setUnits(unit) {
    state.settings.units = unit;
    await firebase.saveState();
    ui.renderSettings();
    if (state.currentViewName === 'workout') {
        ui.renderDailyWorkout();
    }
}

async function setProgressionModel(progression) {
    state.settings.progressionModel = progression;
    await firebase.saveState();
    ui.renderSettings();
}

async function setWeightIncrement(increment) {
    state.settings.weightIncrement = increment;
    await firebase.saveState();
    ui.renderSettings();
}

async function setRestDuration(duration) {
    state.settings.restDuration = duration;
    state.restTimer.remaining = duration;
    await firebase.saveState();
    ui.renderSettings();
    if (state.currentViewName === 'workout') {
        ui.updateRestTimerDisplay();
    }
}

function addDayToBuilder() {
    if (!state.builderPlan) state.builderPlan = { days: [] };
    state.builderPlan.days.push({ label: `Day ${state.builderPlan.days.length + 1}`, muscleGroups: [], isExpanded: true });
    state.isPlanBuilderDirty = true;
    ui.renderBuilder();
}

function deleteDayFromBuilder(dayIndex) {
    state.builderPlan.days.splice(dayIndex, 1);
    state.isPlanBuilderDirty = true;
    ui.renderBuilder();
}

function savePlan() {
    const planName = state.editingPlanId ? state.allPlans.find(p => p.id === state.editingPlanId)?.name : '';
    ui.showModal(
        'Save & Start Plan',
        `
        <p>Give your plan a name and select how many weeks it should last. A 1-week deload will be added at the end.</p>
        <input type="text" id="new-plan-name" class="modal-input" placeholder="e.g., My Summer Bulk" value="${planName}">
        <div class="card-group" id="meso-length-cards">
            <div class="goal-card meso-length-card" data-value="4" role="button" tabindex="0"><h3>4 Weeks</h3></div>
            <div class="goal-card meso-length-card" data-value="6" role="button" tabindex="0"><h3>6 Weeks</h3></div>
            <div class="goal-card meso-length-card" data-value="8" role="button" tabindex="0"><h3>8 Weeks</h3></div>
        </div>
        `,
        [
            { text: 'Cancel', class: 'secondary-button' },
            { text: 'Save & Start', class: 'cta-button', action: () => finalizeAndStartPlanFromBuilder() }
        ]
    );

    ui.elements.modal.querySelector('#meso-length-cards').addEventListener('click', e => {
        const card = e.target.closest('.meso-length-card');
        if (card) {
            ui.elements.modal.querySelectorAll('.meso-length-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        }
    });

    document.getElementById('new-plan-name').focus();
}

async function finalizeAndStartPlanFromBuilder() {
    const planName = document.getElementById('new-plan-name').value.trim();
    const mesoLength = ui.elements.modal.querySelector('.meso-length-card.active')?.dataset.value;

    if (!planName) {
        ui.showModal('Input Required', 'Please provide a name for your plan.');
        return;
    }
    if (!mesoLength) {
        ui.showModal('Input Required', 'Please select a duration for your plan.');
        return;
    }
    if (!state.builderPlan || state.builderPlan.days.length === 0) {
        ui.showModal("Incomplete Plan", "Please add at least one day to your plan before saving.");
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
            const dayKey = dayIndex + 1;
            newMeso.weeks[i][dayKey] = {
                name: day.label || `Day ${dayKey}`,
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
    const firstDayKey = Object.keys(newMeso.weeks[1])[0] || 1;
    state.currentView = { week: 1, day: parseInt(firstDayKey) };
    state.isPlanBuilderDirty = false;
    state.editingPlanId = null;

    await firebase.saveState();
    ui.closeModal();
    ui.showView('workout');
}

async function savePlanAsTemplate(planId) {
    const plan = state.allPlans.find(p => p.id === planId);
    if (!plan) return;

    const newTemplate = {
        id: `template_${Date.now()}`,
        name: `${plan.name} (Template)`,
        builderTemplate: plan.builderTemplate,
    };

    state.savedTemplates.push(newTemplate);
    await firebase.saveState();
    ui.showModal('Template Saved!', `"${plan.name}" has been saved to your templates.`);
}

function openBuilderForEdit(planId) {
    const planToEdit = state.allPlans.find(p => p.id === planId);
    if (!planToEdit) return;
    state.editingPlanId = planId;
    state.builderPlan = JSON.parse(JSON.stringify(planToEdit.builderTemplate || { days: [] }));
    ui.elements.builderTitle.textContent = `Editing: ${planToEdit.name}`;
    ui.showView('builder');
}

function confirmDeletePlan(planId) {
    ui.showModal('Delete Plan?', 'Are you sure you want to permanently delete this plan? This cannot be undone.', [
        { text: 'Cancel', class: 'secondary-button' },
        { text: 'Yes, Delete', class: 'cta-button', action: () => deletePlan(planId) }
    ]);
}

async function deletePlan(planId) {
    state.allPlans = state.allPlans.filter(p => p.id !== planId);
    if (state.activePlanId === planId) {
        state.activePlanId = state.allPlans.length > 0 ? state.allPlans[0].id : null;
    }
    await firebase.saveState();
    ui.renderSettings();
}

async function setActivePlan(planId) {
    state.activePlanId = planId;
    await firebase.saveState();
    ui.renderSettings();
}

function confirmCompleteWorkout() {
    ui.showModal('Complete Workout?', 'Are you sure you want to complete this workout? This action cannot be undone.', [
        { text: 'Cancel', class: 'secondary-button' },
        { text: 'Yes, Complete', class: 'cta-button', action: () => completeWorkout() }
    ]);
}

function generateProgressionSuggestions(completedWorkout, nextWeekWorkout) {
    if (!nextWeekWorkout) return [];
    const suggestions = [];
    completedWorkout.exercises.forEach(completedEx => {
        const nextWeekEx = nextWeekWorkout.exercises.find(ex => ex.exerciseId === completedEx.exerciseId);
        if (!nextWeekEx) return;

        let suggestionText = `Maintain ${completedEx.targetLoad || 'current'} ${state.settings.units} for ${completedEx.targetReps} reps.`;

        if (nextWeekEx.targetLoad > completedEx.targetLoad) {
            suggestionText = `Increase to <strong>${nextWeekEx.targetLoad} ${state.settings.units}</strong> for ${nextWeekEx.targetReps} reps.`;
        } else if (nextWeekEx.targetReps > completedEx.targetReps) {
            suggestionText = `Aim for <strong>${nextWeekEx.targetReps} reps</strong> with the same weight.`;
        }
        
        suggestions.push({
            exerciseName: completedEx.name,
            suggestion: suggestionText
        });
    });
    return suggestions;
}

async function completeWorkout() {
    stopStopwatch();
    state.workoutSummary.suggestions = [];

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

    const totalSeconds = state.workoutTimer.elapsed;
    const totalVolume = workout.exercises.reduce((sum, ex) => sum + (ex.totalVolume || 0), 0);
    const totalSets = workout.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);

    state.workoutSummary.totalVolume = totalVolume;
    state.workoutSummary.totalSets = totalSets;

    const historyEntry = {
        id: `hist_${Date.now()}`,
        planName: activePlan.name,
        workoutName: workout.name,
        completedDate: new Date().toISOString(),
        duration: totalSeconds,
        volume: totalVolume,
        sets: totalSets,
    };

    state.workoutHistory.unshift(historyEntry);

    const stalledExercise = checkForStallAndRecommendDeload(activePlan, week, day);
    
    if (!stalledExercise && week < activePlan.durationWeeks - 1 && workout.exercises.length > 0) {
        calculateNextWeekProgression(week, activePlan);
    }

    const nextWeekWorkout = activePlan.weeks[week + 1]?.[day];
    state.workoutSummary.suggestions = generateProgressionSuggestions(workout, nextWeekWorkout);
    
    ui.showView('workoutSummary');

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
            state.currentView = { week: 1, day: 1 };
        }
    }

    if (nextDay) {
        state.currentView = { week: nextWeek, day: nextDay };
    }

    await firebase.saveState();
}

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

function selectTemplate(templateId) {
    const allTemplates = planGenerator.getAllTemplates ? planGenerator.getAllTemplates() : [];
    const selectedTemplate = allTemplates.find(t => t.id === templateId);
    if (selectedTemplate) {
        state.builderPlan = planGenerator.generate(selectedTemplate.config, state.exercises).builderPlan;
        ui.showView('builder');
    }
}

function selectSavedTemplate(templateId) {
    const template = state.savedTemplates.find(t => t.id === templateId);
    if (template) {
        state.builderPlan = JSON.parse(JSON.stringify(template.builderTemplate));
        state.editingPlanId = null; // Ensure it's treated as a new plan
        ui.elements.builderTitle.textContent = `New Plan from "${template.name}"`;
        ui.showView('builder');
    }
}

// --- TIMER FUNCTIONS ---

function startStopwatch() {
    if (state.workoutTimer.isRunning) return;
    state.workoutTimer.isRunning = true;
    state.workoutTimer.startTime = Date.now();
    state.workoutTimer.instance = setInterval(ui.updateStopwatchDisplay, 1000);
}

function stopStopwatch() {
    if (!state.workoutTimer.isRunning) return;
    state.workoutTimer.isRunning = false;
    state.workoutTimer.elapsed += Math.floor((Date.now() - state.workoutTimer.startTime) / 1000);
    clearInterval(state.workoutTimer.instance);
    ui.updateStopwatchDisplay();
}

function startRestTimer() {
    if (state.restTimer.isRunning) return;
    stopRestTimer();
    state.restTimer.isRunning = true;
    state.restTimer.remaining = state.settings.restDuration;
    ui.updateRestTimerDisplay();
    state.restTimer.instance = setInterval(() => {
        state.restTimer.remaining--;
        ui.updateRestTimerDisplay();
        if (state.restTimer.remaining <= 0) {
            stopRestTimer();
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
    }, 1000);
}

function stopRestTimer() {
    state.restTimer.isRunning = false;
    clearInterval(state.restTimer.instance);
    state.restTimer.remaining = state.settings.restDuration;
    ui.updateRestTimerDisplay();
}

// --- NOTE AND HISTORY FUNCTIONS ---

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
                    ui.renderDailyWorkout();
                }
            }
        ]
    );
}

function showHistory(exerciseId) {
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    const exerciseName = state.exercises.find(ex => `ex_${ex.name.replace(/\s+/g, '_')}` === exerciseId)?.name || "Exercise";
    let historyHTML = '';

    if (activePlan && activePlan.weeks) {
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
    }

    if (!historyHTML) {
        historyHTML = '<p class="placeholder-text">No completed history for this exercise yet.</p>';
    }

    ui.showModal(`${exerciseName} History`, historyHTML, [{ text: 'Close', class: 'cta-button' }]);
}

// --- ONBOARDING FUNCTIONS ---

function handleStepTransition(stepChangeLogic) {
    const currentStepEl = document.querySelector('.step.active');
    if (currentStepEl) {
        currentStepEl.classList.add('fade-out');
        setTimeout(() => {
            stepChangeLogic();
            ui.renderOnboardingStep();
        }, 400);
    } else {
        stepChangeLogic();
        ui.renderOnboardingStep();
    }
}

function selectOnboardingCard(element, field, value) {
    state.userSelections[field] = value;
    element.closest('.card-group').querySelectorAll('.goal-card').forEach(card => card.classList.remove('active'));
    element.classList.add('active');
    nextOnboardingStep();
}

async function nextOnboardingStep() {
    handleStepTransition(async () => {
        if (state.onboarding.currentStep < state.onboarding.totalSteps) {
            state.onboarding.currentStep++;
        }
        
        if (state.onboarding.currentStep === state.onboarding.totalSteps) {
            // --- Generate and save the first plan ---
            const { builderPlan } = planGenerator.generate(state.userSelections, state.exercises);
            
            const newMeso = {
                id: `meso_${Date.now()}`,
                name: "My First Plan",
                startDate: new Date().toISOString(),
                durationWeeks: 4, // Default to 4 weeks for the first plan
                builderTemplate: builderPlan,
                weeks: {}
            };

            const focusSetMap = { 'Primary': 5, 'Secondary': 4, 'Maintenance': 2 };
            for (let i = 1; i <= newMeso.durationWeeks; i++) {
                newMeso.weeks[i] = {};
                const isDeload = (i === newMeso.durationWeeks);
                const targetRIR = planGenerator.getRirForWeek(i, newMeso.durationWeeks);

                builderPlan.days.forEach((day, dayIndex) => {
                    const dayKey = dayIndex + 1;
                    newMeso.weeks[i][dayKey] = {
                        name: day.label || `Day ${dayKey}`,
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
            
            // --- Auto-save the new plan as a template ---
            const newTemplate = {
                id: `template_${newMeso.id}`,
                name: `${newMeso.name} (Template)`,
                builderTemplate: newMeso.builderTemplate,
            };
            state.savedTemplates.push(newTemplate);

            state.allPlans.push(newMeso);
            state.activePlanId = newMeso.id;
            const firstDayKey = Object.keys(newMeso.weeks[1])[0] || 1;
            state.currentView = { week: 1, day: parseInt(firstDayKey) };
            state.userSelections.onboardingCompleted = true;
            
            await firebase.saveState();
            
            // --- Show notification and then transition to home screen ---
            setTimeout(() => {
                ui.showModal(
                    'Plan Generated!',
                    'A workout based on your answers has been generated for you. Click the settings icon to view/edit the routine or select "Start Next Workout" to begin!',
                    [{ text: 'Got it!', class: 'cta-button', action: () => ui.showView('home') }]
                );
            }, 1000);
        }
    });
}

function previousOnboardingStep() {
    handleStepTransition(() => {
        if (state.onboarding.currentStep > 1) {
            state.onboarding.currentStep--;
        }
    });
}


// --- EVENT LISTENER INITIALIZATION ---

export function initEventListeners() {
    document.body.addEventListener('click', e => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        target.classList.add('pop-animation');
        setTimeout(() => target.classList.remove('pop-animation'), 300);

        const { action, ...dataset } = target.dataset;

        // A map of all possible actions
        const actions = {
            nextOnboardingStep,
            previousOnboardingStep,
            selectOnboardingCard: () => selectOnboardingCard(target, dataset.field, dataset.value),
            showView: () => {
                if (dataset.viewName === 'workout' && !state.workoutTimer.isRunning) startStopwatch();
                else if (dataset.viewName !== 'workout' && state.workoutTimer.isRunning) stopStopwatch();
                ui.showView(dataset.viewName);
            },
            selectCard: () => selectCard(target, dataset.field, dataset.value, dataset.shouldSave === 'true'),
            setTheme: () => setTheme(dataset.theme),
            setUnits: () => setUnits(dataset.unit),
            setProgressionModel: () => setProgressionModel(dataset.progression),
            setWeightIncrement: () => setWeightIncrement(parseFloat(dataset.increment)),
            setRestDuration: () => setRestDuration(parseInt(dataset.duration)),
            addDayToBuilder,
            deleteDayFromBuilder: () => deleteDayFromBuilder(parseInt(target.closest('.day-card').dataset.dayIndex)),
            savePlan,
            savePlanAsTemplate: () => savePlanAsTemplate(dataset.planId),
            openBuilderForEdit: () => openBuilderForEdit(dataset.planId),
            confirmDeletePlan: () => confirmDeletePlan(dataset.planId),
            setActivePlan: () => setActivePlan(dataset.planId),
            confirmCompleteWorkout,
            closeModal: ui.closeModal,
            switchTab: () => ui.renderTemplateLibrary(dataset.tab),
            selectTemplate: () => selectTemplate(dataset.templateId),
            selectSavedTemplate: () => selectSavedTemplate(dataset.templateId),
            finishWizard: ui.customPlanWizard.finish,
            startRestTimer,
            stopRestTimer,
            addSet: () => {
                const { exerciseIndex } = dataset;
                const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
                const workout = activePlan.weeks[state.currentView.week][state.currentView.day];
                const exercise = workout.exercises[exerciseIndex];
                if (!exercise.sets) exercise.sets = [];
                exercise.sets.push({ weight: '', reps: '', rir: '', rawInput: '' });
                ui.renderDailyWorkout();
            },
            swapExercise: () => {
                const { exerciseIndex } = dataset;
                const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
                const workout = activePlan.weeks[state.currentView.week][state.currentView.day];
                const currentExerciseName = workout.exercises[exerciseIndex].name;
                const exerciseData = state.exercises.find(e => e.name === currentExerciseName);

                if (!exerciseData || !exerciseData.alternatives || exerciseData.alternatives.length === 0) {
                    ui.showModal("No Alternatives", "Sorry, no alternatives are listed for this exercise.");
                    return;
                }
                const alternativesHTML = exerciseData.alternatives.map(altName => `<div class="goal-card alternative-card" data-new-exercise-name="${altName}" role="button" tabindex="0"><h3>${altName}</h3></div>`).join('');
                ui.showModal(`Swap ${currentExerciseName}`, `<p>Choose a replacement exercise:</p><div class="card-group">${alternativesHTML}</div>`, []);
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
            },
            openNoteModal: () => {
                const { exerciseIndex, setIndex } = dataset;
                openNoteModal(exerciseIndex, setIndex);
            },
            showHistory: () => showHistory(dataset.exerciseId),
        };

        if (actions[action]) {
            actions[action]();
        }
    });

    ui.elements.planHubView.addEventListener('click', e => {
        const hubOption = e.target.closest('.hub-option');
        if (!hubOption) return;
        const hubAction = hubOption.dataset.hubAction;
        if (hubAction === 'scratch') {
            state.editingPlanId = null;
            state.builderPlan = { days: [] };
            ui.elements.builderTitle.textContent = "New Custom Plan";
            ui.showView('builder');
        }
        if (hubAction === 'template') ui.showView('templateLibrary');
        if (hubAction === 'manage') ui.showView('settings');
    });

    ui.elements.scheduleContainer.addEventListener('input', e => {
        const { dayIndex } = e.target.dataset;
        if (e.target.matches('.day-label-input')) {
            state.builderPlan.days[dayIndex].label = e.target.value;
            state.isPlanBuilderDirty = true;
        }
    });

    ui.elements.scheduleContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const dayCard = e.target.closest('.day-card');
        const dayIndex = parseInt(dayCard.dataset.dayIndex, 10);
        const { muscleIndex, focus } = button.dataset;
        if (button.matches('.add-muscle-group-btn')) {
            state.builderPlan.days[dayIndex].muscleGroups.push({ muscle: 'selectamuscle', focus: 'Primary', exercises: ['', '', ''] });
            state.isPlanBuilderDirty = true;
            ui.renderBuilder();
        }
        if (button.matches('.delete-muscle-group-btn')) {
            state.builderPlan.days[dayIndex].muscleGroups.splice(muscleIndex, 1);
            state.isPlanBuilderDirty = true;
            ui.renderBuilder();
        }
        if (button.matches('.focus-btn')) {
            state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].focus = focus;
            state.isPlanBuilderDirty = true;
            ui.renderBuilder();
        }
    });

    ui.elements.scheduleContainer.addEventListener('change', (e) => {
        const { dayIndex, muscleIndex, exerciseSelectIndex } = e.target.dataset;
        if (e.target.matches('.muscle-select')) {
            state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].muscle = e.target.value;
            state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises = ['', '', ''];
            state.isPlanBuilderDirty = true;
            ui.renderBuilder();
        }
        if (e.target.matches('.exercise-select')) {
            state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises[exerciseSelectIndex] = e.target.value;
            state.isPlanBuilderDirty = true;
        }
    });

    ui.elements.modal.addEventListener('click', (e) => {
        if (e.target === ui.elements.modal) ui.closeModal();
    });

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
                // Auto-start rest timer when a set is logged
                if (set.weight && (set.reps || set.rir)) {
                    startRestTimer();
                }
            }
        }
    });

    ui.elements.workoutView.addEventListener('focusin', (e) => {
        if (e.target.matches('.weight-input, .rep-rir-input')) {
            document.querySelectorAll('.set-row').forEach(row => row.classList.remove('active-set'));
            e.target.closest('.set-row').classList.add('active-set');
        }
    });

    ui.elements.workoutView.addEventListener('focusout', (e) => {
        if (e.target.matches('.weight-input, .rep-rir-input')) {
            e.target.closest('.set-row').classList.remove('active-set');
        }
    });

    document.getElementById('exercise-tracker-select')?.addEventListener('change', (e) => ui.renderProgressChart(e.target.value));

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
