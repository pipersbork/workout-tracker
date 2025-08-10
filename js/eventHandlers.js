import { state } from './state.js';
import * as ui from './ui.js';
import * as firebase from './firebaseService.js';
import { workoutEngine } from './planGenerator.js';

/**
 * @file eventHandlers.js centralizes all application event listeners and their corresponding actions.
 * It acts as the "controller" of the application, responding to user input and interfacing with the workoutEngine.
 */

// --- ACTION FUNCTIONS ---

function findAndSetNextWorkout() {
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    if (!activePlan || !activePlan.weeks) {
        ui.showModal("No Active Plan", "You don't have an active workout plan. Please create one to get started.");
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

    ui.showModal("Plan Complete!", "Congratulations! You've completed all the workouts in this plan. You can start a new one from the plan hub.", [{ text: 'Go to Plan Hub', class: 'cta-button', action: () => ui.showView('planHub') }]);
    return false;
}


async function selectCard(element, field, value, shouldSave = false) {
    const processedValue = /^\d+$/.test(value) ? parseInt(value) : value;
    state.userSelections[field] = processedValue;
    
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
    ui.closeModal();
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

function calculateE1RM(weight, reps) {
    if (!weight || !reps || reps < 1) return 0;
    if (reps === 1) return weight;
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

        let suggestionText = `Maintain ${nextWeekEx.targetLoad || 'current'} ${state.settings.units} for ${nextWeekEx.targetReps} reps.`;

        if (nextWeekEx.targetLoad > (completedEx.targetLoad || 0)) {
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

    const nextWeekWorkout = activePlan.weeks[week + 1]?.[day];
    if (nextWeekWorkout) {
        workoutEngine.calculateNextWorkoutProgression(workout, nextWeekWorkout);
        state.workoutSummary.suggestions = generateProgressionSuggestions(workout, nextWeekWorkout);
    } else {
        state.workoutSummary.suggestions = [];
    }
    
    ui.showView('workoutSummary');
    findAndSetNextWorkout();
    await firebase.saveState();
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
    } else {
        weightContainer.classList.add('hidden');
        e1rmContainer.classList.remove('hidden');
    }
}

// --- TIMER FUNCTIONS ---

function startStopwatch() {
    if (state.workoutTimer.isRunning) return;
    state.workoutTimer.isRunning = true;
    state.workoutTimer.startTime = Date.now() - (state.workoutTimer.elapsed * 1000);
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
                    ui.renderDailyWorkout();
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
                    if (exerciseInstance && (exerciseInstance.sets.length > 0 || exerciseInstance.note)) {
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
    selectCard(element, field, value);
    nextOnboardingStep();
}

async function nextOnboardingStep() {
    handleStepTransition(async () => {
        state.onboarding.totalSteps = 7;

        if (state.onboarding.currentStep < state.onboarding.totalSteps) {
            state.onboarding.currentStep++;
        }
        
        if (state.onboarding.currentStep === state.onboarding.totalSteps) {
            const newMeso = workoutEngine.generateNewMesocycle(state.userSelections, state.exercises, 4);
            const newPlan = {
                id: `meso_${Date.now()}`,
                name: "My First Intelligent Plan",
                startDate: new Date().toISOString(),
                durationWeeks: 4,
                ...newMeso
            };

            state.allPlans.push(newPlan);
            state.activePlanId = newPlan.id;
            state.userSelections.onboardingCompleted = true;
            
            await firebase.saveState();
            
            setTimeout(() => {
                ui.showModal(
                    'Plan Generated!',
                    'Your first intelligent workout plan is ready. You can view it in settings or start your first workout from the home screen.',
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
            confirmDeletePlan: () => confirmDeletePlan(dataset.planId),
            setActivePlan: () => setActivePlan(dataset.planId),
            confirmCompleteWorkout,
            closeModal: ui.closeModal,
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
        if (hubAction === 'new') {
            ui.showModal("Create New Plan?", 
            "This will generate a new intelligent plan based on your current settings. Are you sure?",
            [
                { text: 'Cancel', class: 'secondary-button' },
                { text: 'Yes, Create', class: 'cta-button', action: async () => {
                    const newMeso = workoutEngine.generateNewMesocycle(state.userSelections, state.exercises, 4);
                    const newPlan = {
                        id: `meso_${Date.now()}`,
                        name: `Intelligent Plan - ${new Date().toLocaleDateString()}`,
                        startDate: new Date().toISOString(),
                        durationWeeks: 4,
                        ...newMeso
                    };
                    state.allPlans.push(newPlan);
                    state.activePlanId = newPlan.id;
                    await firebase.saveState();
                    ui.closeModal();
                    ui.showView('settings');
                }}
            ]);
        }
        if (hubAction === 'manage') ui.showView('settings');
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
                    // --- NEW: Trigger feedback modal on final set completion ---
                    const isFinalSet = parseInt(setIndex) === exercise.targetSets - 1;
                    if (isFinalSet && exercise.type === 'Primary') {
                        setTimeout(() => {
                           ui.showFeedbackModal(
                               'Exercise Feedback',
                               `How was the joint pain during ${exercise.name}?`,
                               [
                                   { text: 'None', value: 'none', action: (value) => state.feedbackState.jointPain[exercise.exerciseId] = value },
                                   { text: 'Mild', value: 'mild', action: (value) => state.feedbackState.jointPain[exercise.exerciseId] = value },
                                   { text: 'Moderate', value: 'moderate', action: (value) => state.feedbackState.jointPain[exercise.exerciseId] = value },
                                   { text: 'Severe', value: 'severe', action: (value) => state.feedbackState.jointPain[exercise.exerciseId] = value }
                               ]
                           );
                        }, 500); // Small delay to feel less abrupt
                    }
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
}
