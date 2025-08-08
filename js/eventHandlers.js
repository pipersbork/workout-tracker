import { state } from './state.js';
import * as ui from './ui.js';
import * as firebase from './firebaseService.js';
import { planGenerator } from './planGenerator.js';

/**
 * @file eventHandlers.js centralizes all application event listeners and their corresponding actions.
 * It acts as the "controller" of the application, responding to user input.
 */

// --- ACTION FUNCTIONS ---

function findAndSetNextWorkout() {
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    if (!activePlan || !activePlan.weeks) {
        ui.showModal("No Active Plan", "You don't have an active workout plan. Please create or select one from the settings.");
        return false;
    }

    const sortedWeeks = Object.keys(activePlan.weeks).sort((a, b) => a - b);

    for (const weekKey of sortedWeeks) {
        const week = activePlan.weeks[weekKey];
        const sortedDays = Object.keys(week).sort((a, b) => a - b);

        for (const dayKey of sortedDays) {
            const workout = week[dayKey];
            if (!workout.completed) {
                state.currentView = { week: parseInt(weekKey), day: parseInt(dayKey) };
                return true;
            }
        }
    }

    ui.showModal("Plan Complete!", "Congratulations! You've completed all the workouts in this plan. You can start a new one from the settings.", [{ text: 'Go to Settings', class: 'cta-button', action: () => ui.showView('settings') }]);
    return false;
}


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
    const mesoLengthEl = ui.elements.modal.querySelector('.meso-length-card.active');
    const mesoLength = mesoLengthEl ? mesoLengthEl.dataset.value : null;

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
    
    const hasAtLeastOneExercise = state.builderPlan.days.some(day =>
        day.muscleGroups.some(mg =>
            mg.exercises.some(ex => ex && ex !== 'Select an Exercise')
        )
    );
    if (!hasAtLeastOneExercise) {
        ui.showModal("Incomplete Plan", "Please select at least one exercise for your plan before saving.");
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

    const focusSetMap = { 'Primary': 3, 'Secondary': 2 }; // Adjusted set counts for better balance
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
                                stallCount: 0,
                                note: '' // Add note property to exercise
                            };
                        })
                    )
            };
        });
    }

    if (state.editingPlanId) {
        const planIndex = state.allPlans.findIndex(p => p.id === state.editingPlanId);
        if (planIndex !== -1) {
            state.allPlans[planIndex] = newMeso;
        }
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
    ui.closeModal(); // Close the confirmation modal
    ui.renderSettings(); // Re-render the settings view to reflect the change
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

function calculateE1RM(weight, reps) {
    if (!weight || !reps || reps < 1) return 0;
    if (reps === 1) return weight;
    // Brzycki formula
    return weight / (1.0278 - 0.0278 * reps);
}

function checkForPRs(completedWorkout) {
    let newPRsCount = 0;
    completedWorkout.exercises.forEach(ex => {
        if (!ex.sets || ex.sets.length === 0) return;

        const topSetOfTheSession = ex.sets.reduce((best, current) => {
            if (!current.weight || !current.reps) return best;
            const currentE1RM = calculateE1RM(current.weight, current.reps);
            return currentE1RM > best.e1rm ? { ...current, e1rm: currentE1RM } : best;
        }, { e1rm: 0 });

        if (topSetOfTheSession.e1rm === 0) return;

        const existingPR = state.personalRecords
            .filter(pr => pr.exerciseId === ex.exerciseId)
            .reduce((max, pr) => (pr.e1rm > max.e1rm ? pr : max), { e1rm: 0 });

        if (topSetOfTheSession.e1rm > existingPR.e1rm) {
            newPRsCount++;
            const newPR = {
                id: `pr_${ex.exerciseId}_${Date.now()}`,
                exerciseId: ex.exerciseId,
                exerciseName: ex.name,
                date: new Date().toISOString(),
                weight: topSetOfTheSession.weight,
                reps: topSetOfTheSession.reps,
                e1rm: Math.round(topSetOfTheSession.e1rm),
                units: state.settings.units
            };
            // Remove old PR for the same exercise if it exists
            state.personalRecords = state.personalRecords.filter(pr => pr.exerciseId !== ex.exerciseId);
            state.personalRecords.push(newPR);
        }
    });
    return newPRsCount;
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
    ui.closeModal();

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
    
    const newPRsCount = checkForPRs(workout);
    state.workoutSummary.newPRs = newPRsCount;

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
    ui.closeModal();
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
        state.editingPlanId = null; 
        ui.elements.builderTitle.textContent = `New Plan from "${template.name}"`;
        ui.showView('builder');
    }
}

function setChartType(chartType) {
    const weightContainer = ui.elements.weightChartContainer;
    const e1rmContainer = ui.elements.e1rmChartContainer;
    const toggleButtons = document.querySelectorAll('.chart-toggle-switch .toggle-btn');

    toggleButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.chartType === chartType);
    });

    if (chartType === 'weight') {
        weightContainer.classList.remove('hidden');
        e1rmContainer.classList.add('hidden');
    } else { // e1rm
        weightContainer.classList.add('hidden');
        e1rmContainer.classList.remove('hidden');
    }
}

// --- TIMER FUNCTIONS ---

function startStopwatch() {
    if (state.workoutTimer.isRunning) return;
    state.workoutTimer.isRunning = true;
    state.workoutTimer.startTime = Date.now() - (state.workoutTimer.elapsed * 1000); // Resume from elapsed time
    state.workoutTimer.instance = setInterval(ui.updateStopwatchDisplay, 1000);
}

function stopStopwatch() {
    if (!state.workoutTimer.isRunning) return;
    state.workoutTimer.isRunning = false;
    state.workoutTimer.elapsed = Math.floor((Date.now() - state.workoutTimer.startTime) / 1000);
    clearInterval(state.workoutTimer.instance);
    ui.updateStopwatchDisplay();
}

function startRestTimer() {
    if (state.restTimer.isRunning) return;
    stopRestTimer(); // Clear any existing timer before starting a new one
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

function openExerciseNotes(exerciseIndex) {
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    const workout = activePlan.weeks[state.currentView.week][state.currentView.day];
    const exercise = workout.exercises[exerciseIndex];
    const note = exercise.note || '';

    ui.showModal(
        `Notes for ${exercise.name}`,
        `<textarea id="exercise-note-input" class="modal-input modal-textarea" placeholder="e.g., Felt strong, focus on form...">${note}</textarea>`,
        [
            { text: 'Cancel', class: 'secondary-button' },
            {
                text: 'Save Note',
                class: 'cta-button',
                action: () => {
                    const newNote = document.getElementById('exercise-note-input').value;
                    exercise.note = newNote;
                    ui.renderDailyWorkout(); // Re-render to show the 'has-note' class on the button
                    ui.closeModal();
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
        for (const weekKey in activePlan.weeks) {
            const week = activePlan.weeks[weekKey];
            for (const dayKey in week) {
                const day = week[dayKey];
                 if (day.completed) {
                    const exerciseInstance = day.exercises.find(ex => ex.exerciseId === exerciseId);
                    if (exerciseInstance && exerciseInstance.sets.length > 0) {
                        historyHTML += `<div class="history-item">`;
                        historyHTML += `<div class="history-date">${new Date(day.completedDate).toLocaleDateString()} - ${day.name}</div>`;
                        if (exerciseInstance.note) {
                            historyHTML += `<div class="history-note">"${exerciseInstance.note}"</div>`;
                        }
                        exerciseInstance.sets.forEach((set, index) => {
                            if (set.weight && (set.reps || set.rir)) {
                                historyHTML += `<div class="history-performance">Set ${index + 1}: ${set.weight}${state.settings.units} x ${set.rawInput}</div>`;
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
            const { builderPlan } = planGenerator.generate(state.userSelections, state.exercises);
            
            const newMeso = {
                id: `meso_${Date.now()}`,
                name: "My First Plan",
                startDate: new Date().toISOString(),
                durationWeeks: 4,
                builderTemplate: builderPlan,
                weeks: {}
            };

            const focusSetMap = { 'Primary': 3, 'Secondary': 2 };
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
                                        stallCount: 0,
                                        note: ''
                                    };
                                })
                            )
                    };
                });
            }
            
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
            
            setTimeout(() => {
                ui.showModal(
                    'Plan Generated!',
                    'Your first workout plan is ready. You can edit it from the settings menu or start your first workout from the home screen.',
                    [{ text: 'Let\'s Go!', class: 'cta-button', action: () => ui.showView('home') }]
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

        const actions = {
            nextOnboardingStep,
            previousOnboardingStep,
            selectOnboardingCard: () => selectOnboardingCard(target, dataset.field, dataset.value),
            showView: () => {
                if (dataset.viewName === 'workout') {
                    const workoutFound = findAndSetNextWorkout();
                    if (workoutFound) {
                        if (!state.workoutTimer.isRunning) startStopwatch();
                        ui.showView(dataset.viewName);
                    }
                } else {
                    ui.showView(dataset.viewName);
                }
            },
            selectCard: () => selectCard(target, dataset.field, dataset.value, dataset.shouldSave === 'true'),
            setTheme: () => setTheme(dataset.theme),
            setUnits: () => setUnits(dataset.unit),
            setProgressionModel: () => setProgressionModel(dataset.progression),
            setWeightIncrement: () => setWeightIncrement(parseFloat(dataset.increment)),
            setRestDuration: () => setRestDuration(parseInt(dataset.duration)),
            setChartType: () => setChartType(dataset.chartType),
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
                const setIndex = exercise.sets.length;
                const lastWeight = setIndex > 0 ? exercise.sets[setIndex - 1].weight : (exercise.targetLoad || '');
                exercise.sets.push({ weight: lastWeight, reps: '', rir: '', rawInput: '' });
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
            openExerciseNotes: () => openExerciseNotes(dataset.exerciseIndex),
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
        if (!dayCard) return;
        const dayIndex = parseInt(dayCard.dataset.dayIndex, 10);
    
        if (button.matches('.add-muscle-group-btn')) {
            state.builderPlan.days[dayIndex].muscleGroups.push({ muscle: 'selectamuscle', focus: 'Primary', exercises: ['', '', ''] });
            state.isPlanBuilderDirty = true;
            ui.renderBuilder();
            return;
        }
    
        const muscleGroupBlock = e.target.closest('.muscle-group-block');
        if (!muscleGroupBlock) return;
        const muscleIndex = parseInt(muscleGroupBlock.dataset.muscleIndex, 10);
    
        if (button.matches('.delete-muscle-group-btn')) {
            state.builderPlan.days[dayIndex].muscleGroups.splice(muscleIndex, 1);
            state.isPlanBuilderDirty = true;
            ui.renderBuilder();
        }
    
        if (button.matches('.focus-btn')) {
            const focus = button.dataset.focus;
            const muscleGroup = state.builderPlan.days[dayIndex].muscleGroups[muscleIndex];
            muscleGroup.focus = focus;
            
            const exerciseCount = focus === 'Primary' ? 3 : 2;
            muscleGroup.exercises = muscleGroup.exercises.slice(0, exerciseCount);
            while (muscleGroup.exercises.length < exerciseCount) {
                muscleGroup.exercises.push('');
            }
            
            state.isPlanBuilderDirty = true;
            ui.renderBuilder();
        }
    });

    ui.elements.scheduleContainer.addEventListener('change', (e) => {
        const { dayIndex, muscleIndex, exerciseSelectIndex } = e.target.dataset;
        if (e.target.matches('.muscle-select')) {
            const muscleGroup = state.builderPlan.days[dayIndex].muscleGroups[muscleIndex];
            const newMuscleValue = e.target.value;
            
            // *** FIX: Only reset exercises if the muscle group *actually* changes ***
            if (muscleGroup.muscle !== newMuscleValue) {
                muscleGroup.muscle = newMuscleValue;
                const exerciseCount = muscleGroup.focus === 'Primary' ? 3 : 2;
                muscleGroup.exercises = Array(exerciseCount).fill('');
                state.isPlanBuilderDirty = true;
                ui.renderBuilder();
            }
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
            const workout = activePlan?.weeks[state.currentView.week][state.currentView.day];
            if (!workout) return;
            const exercise = workout.exercises[exerciseIndex];
            if (!exercise) return;
            if (!exercise.sets[setIndex]) exercise.sets[setIndex] = {};
            const set = exercise.sets[setIndex];

            if (e.target.classList.contains('weight-input')) {
                set.weight = parseFloat(e.target.value) || '';
            } else if (e.target.classList.contains('rep-rir-input')) {
                const value = e.target.value.toLowerCase();
                set.rawInput = value;
                const repMatch = value.match(/^(\d+)/);
                const rirMatch = value.match(/(\d+)\s*rir/);
                
                if (rirMatch) {
                    set.rir = parseInt(rirMatch[1]);
                    const repsBeforeRir = value.substring(0, rirMatch.index).trim();
                    set.reps = parseInt(repsBeforeRir) || '';
                } else if (repMatch) {
                    set.reps = parseInt(repMatch[1]);
                    set.rir = '';
                } else {
                    set.reps = '';
                    set.rir = '';
                }

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

    ui.elements.exerciseTrackerSelect?.addEventListener('change', (e) => {
        const exerciseName = e.target.value;
        if (exerciseName) {
            ui.renderProgressChart(exerciseName);
            ui.renderE1RMChart(exerciseName);
        }
    });

    // This listener is for a wizard that is not fully implemented.
    // It can be removed or completed later.
    // ui.elements.customPlanWizardView.addEventListener('click', e => { ... });
}
