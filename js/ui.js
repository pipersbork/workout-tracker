import { state } from './state.js';
import { createSetRowHTML, capitalize } from './utils.js';
import { planGenerator } from './planGenerator.js';

/**
 * @file ui.js handles all DOM manipulation and UI rendering for the application.
 * It is responsible for keeping the user interface in sync with the application's state.
 */

// --- DOM ELEMENT CACHE ---
export const elements = {
    // Views
    onboardingView: document.getElementById('onboarding-container'),
    homeScreenView: document.getElementById('home-screen'),
    planHubView: document.getElementById('plan-hub-view'),
    templateLibraryView: document.getElementById('template-library-view'),
    customPlanWizardView: document.getElementById('custom-plan-wizard-view'),
    builderView: document.getElementById('builder-view'),
    workoutView: document.getElementById('daily-workout-view'),
    workoutSummaryView: document.getElementById('workout-summary-view'),
    performanceSummaryView: document.getElementById('performance-summary-view'),
    settingsView: document.getElementById('settings-view'),

    // Onboarding
    onboardingProgressBar: document.getElementById('onboarding-progress'),

    // Home Screen
    activePlanDisplay: document.getElementById('active-plan-display'),

    // Builder
    builderTitle: document.getElementById('builder-title'),
    scheduleContainer: document.getElementById('schedule-container'),

    // Daily Workout
    workoutDayTitle: document.getElementById('workout-day-title'),
    workoutDate: document.getElementById('workout-date'),
    exerciseListContainer: document.getElementById('exercise-list-container'),
    workoutStopwatch: document.getElementById('workout-stopwatch-display'),
    restTimer: document.getElementById('rest-timer-display'),

    // Plan Hub
    planHubOptions: document.getElementById('plan-hub-options'),
    templateListContainer: document.getElementById('template-list-container'),

    // Settings
    settingsContent: document.getElementById('settings-content'),
    planManagementList: document.getElementById('plan-management-list'),

    // Performance Summary
    consistencyCalendar: document.getElementById('consistency-calendar'),
    volumeChartCanvas: document.getElementById('volume-chart'),
    progressChartCanvas: document.getElementById('progress-chart'),
    e1rmChartCanvas: document.getElementById('e1rm-chart'), // New canvas for e1RM chart
    exerciseTrackerSelect: document.getElementById('exercise-tracker-select'),
    workoutHistoryList: document.getElementById('workout-history-list'),
    trophyCaseList: document.getElementById('trophy-case-list'), // New container for PRs
    weightChartContainer: document.getElementById('weight-chart-container'),
    e1rmChartContainer: document.getElementById('e1rm-chart-container'),

    // Workout Summary
    summaryTime: document.getElementById('summary-time'),
    summaryVolume: document.getElementById('summary-volume'),
    summarySets: document.getElementById('summary-sets'),
    summaryPRs: document.getElementById('summary-prs'),
    summaryProgressionList: document.getElementById('summary-progression-list'),

    // Modal
    modal: document.getElementById('modal'),
    modalBody: document.getElementById('modal-body'),
    modalActions: document.getElementById('modal-actions'),
};

// --- VIEW MANAGEMENT ---

/**
 * Shows a specific view and hides all others.
 * @param {string} viewName - The name of the view to show (e.g., 'home', 'workout').
 * @param {boolean} [skipAnimation=false] - If true, skips the fade-in animation.
 */
export function showView(viewName, skipAnimation = false) {
    if (state.isPlanBuilderDirty) {
        showModal(
            'Unsaved Changes',
            'You have unsaved changes in the plan builder. Are you sure you want to leave? Your changes will be lost.',
            [
                { text: 'Cancel', class: 'secondary-button' },
                {
                    text: 'Leave Anyway',
                    class: 'cta-button',
                    action: () => {
                        state.isPlanBuilderDirty = false;
                        _performViewChange(viewName, skipAnimation);
                    }
                }
            ]
        );
        return;
    }
    _performViewChange(viewName, skipAnimation);
}

function _performViewChange(viewName, skipAnimation) {
    // Redirect to onboarding if it's not completed, unless the user is already there.
    if (!state.userSelections.onboardingCompleted && viewName !== 'onboarding') {
        viewName = 'onboarding';
    }

    const currentViewEl = document.querySelector('.view:not(.hidden)');
    if (currentViewEl) {
        currentViewEl.classList.add('fade-out');
        setTimeout(() => {
            currentViewEl.classList.add('hidden');
            currentViewEl.classList.remove('fade-out');
        }, 400);
    }

    const viewMap = {
        onboarding: elements.onboardingView,
        home: elements.homeScreenView,
        planHub: elements.planHubView,
        templateLibrary: elements.templateLibraryView,
        customWizard: elements.customPlanWizardView,
        builder: elements.builderView,
        workout: elements.workoutView,
        workoutSummary: elements.workoutSummaryView,
        performanceSummary: elements.performanceSummaryView,
        settings: elements.settingsView,
    };

    const targetViewEl = viewMap[viewName];

    if (targetViewEl) {
        setTimeout(() => {
            targetViewEl.classList.remove('hidden');
            if (skipAnimation) {
                targetViewEl.style.animation = 'none';
            } else {
                targetViewEl.style.animation = '';
            }
            state.currentViewName = viewName;
            // Call the corresponding render function for the view
            const renderFunction = `render${capitalize(viewName)}`;
            if (typeof self[renderFunction] === 'function') {
                self[renderFunction]();
            }
        }, currentViewEl ? 400 : 0);
    }
}

// --- RENDER FUNCTIONS ---

export function renderOnboardingStep() {
    const { currentStep, totalSteps } = state.onboarding;
    const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    elements.onboardingProgressBar.style.width = `${progressPercentage}%`;

    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active', 'fade-out');
        if (parseInt(step.dataset.step) === currentStep) {
            step.classList.add('active');
        }
    });
}

export function renderHomeScreen() {
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    if (activePlan) {
        elements.activePlanDisplay.textContent = `Active Plan: ${activePlan.name}`;
    } else {
        elements.activePlanDisplay.textContent = 'No active plan. Create one to get started!';
    }
}

export function renderDailyWorkout() {
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    if (!activePlan) {
        elements.exerciseListContainer.innerHTML = '<p class="placeholder-text">No active plan selected.</p>';
        return;
    }

    const { week, day } = state.currentView;
    const workout = activePlan.weeks[week]?.[day];
    const lastWeekWorkout = activePlan.weeks[week - 1]?.[day];

    if (!workout || !workout.exercises || workout.exercises.length === 0) {
        elements.workoutDayTitle.textContent = workout?.name || "Rest Day";
        elements.workoutDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        elements.exerciseListContainer.innerHTML = '<p class="placeholder-text">No exercises scheduled for today. Enjoy your rest!</p>';
        document.getElementById('complete-workout-btn').style.display = 'none'; // Hide complete button on rest day
        return;
    }

    document.getElementById('complete-workout-btn').style.display = 'block'; // Show complete button
    elements.workoutDayTitle.textContent = workout.name;
    elements.workoutDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    updateStopwatchDisplay();
    updateRestTimerDisplay();

    let html = '';
    workout.exercises.forEach((ex, exIndex) => {
        const lastWeekEx = lastWeekWorkout?.exercises.find(e => e.exerciseId === ex.exerciseId);
        html += `
            <div class="exercise-card" data-exercise-index="${exIndex}">
                <div class="exercise-card-header">
                    <div class="exercise-title-group">
                        <h3>${ex.name}</h3>
                        <button class="swap-exercise-btn" data-action="swapExercise" data-exercise-index="${exIndex}" aria-label="Swap Exercise">
                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.6v-2.6c0-2.2 1.8-4 4-4h14"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.4v2.6c0 2.2-1.8 4-4 4H3"/></svg>
                        </button>
                        <button class="history-btn" data-action="showHistory" data-exercise-id="${ex.exerciseId}" aria-label="View History">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.19-9.35L1 10"/></svg>
                        </button>
                    </div>
                    <span class="exercise-target">Target: ${ex.targetSets} sets of ${ex.targetReps} reps @ ${ex.targetRIR} RIR</span>
                </div>
                <div class="sets-container">
                    <div class="set-row header">
                        <div class="set-number">SET</div>
                        <div class="set-inputs">
                            <span>${state.settings.units.toUpperCase()}</span>
                            <span>REPS / RIR</span>
                        </div>
                        <div class="set-actions"></div>
                    </div>
                    ${[...Array(ex.targetSets)].map((_, setIndex) => {
                        const currentSet = ex.sets?.[setIndex] || {};
                        const lastWeekSet = lastWeekEx?.sets?.[setIndex];
                        return createSetRowHTML(exIndex, setIndex, currentSet, lastWeekSet, ex.targetReps, ex.targetRIR, week);
                    }).join('')}
                </div>
                <button class="add-set-btn" data-action="addSet" data-exercise-index="${exIndex}">+ Add Set</button>
            </div>
        `;
    });
    elements.exerciseListContainer.innerHTML = html;
}

export function renderBuilder() {
    const { days } = state.builderPlan;
    const allMuscles = [...new Set(state.exercises.map(ex => ex.muscle))].sort();

    elements.scheduleContainer.innerHTML = days.map((day, dayIndex) => `
        <div class="day-card" data-day-index="${dayIndex}">
            <div class="day-header">
                <input type="text" class="builder-input day-label-input" value="${day.label}" data-day-index="${dayIndex}" placeholder="Day Label (e.g., Upper Body)">
                <button class="delete-btn" data-action="deleteDayFromBuilder" aria-label="Delete Day">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
            ${day.muscleGroups.map((mg, muscleIndex) => {
                const availableExercises = state.exercises.filter(ex => ex.muscle.toLowerCase() === mg.muscle.toLowerCase());
                const exerciseCount = mg.focus === 'Primary' ? 3 : 2; // Dynamic exercise count
                return `
                <div class="muscle-group-block" data-muscle-index="${muscleIndex}">
                    <div class="muscle-group-header">
                        <div class="muscle-group-selectors">
                            <select class="builder-select muscle-select" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}">
                                <option value="selectamuscle">Select a Muscle</option>
                                ${allMuscles.map(m => `<option value="${m.toLowerCase()}" ${mg.muscle.toLowerCase() === m.toLowerCase() ? 'selected' : ''}>${m}</option>`).join('')}
                            </select>
                            <div class="focus-buttons">
                                <button class="focus-btn ${mg.focus === 'Primary' ? 'active' : ''}" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" data-focus="Primary">Primary</button>
                                <button class="focus-btn ${mg.focus === 'Secondary' ? 'active' : ''}" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" data-focus="Secondary">Secondary</button>
                            </div>
                        </div>
                         <button class="delete-btn delete-muscle-group-btn" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" aria-label="Delete Muscle Group">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div class="exercise-selection-group">
                        ${[...Array(exerciseCount)].map((_, exIndex) => `
                            <select class="builder-select exercise-select" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" data-exercise-select-index="${exIndex}" ${mg.muscle === 'selectamuscle' ? 'disabled' : ''}>
                                <option>Select an Exercise</option>
                                ${availableExercises.map(ex => `<option value="${ex.name}" ${mg.exercises[exIndex] === ex.name ? 'selected' : ''}>${ex.name}</option>`).join('')}
                            </select>
                        `).join('')}
                    </div>
                </div>
            `}).join('')}
            <button class="add-set-btn add-muscle-group-btn" data-day-index="${dayIndex}">+ Add Muscle Group</button>
        </div>
    `).join('');
}

export function renderSettings() {
    const { settings, allPlans, activePlanId } = state;

    // Render toggles
    document.querySelectorAll('.toggle-switch').forEach(group => {
        const field = group.parentElement.querySelector('.settings-label')?.textContent.toLowerCase().replace(' ', '') || group.id.split('-')[0];
        const activeValue = settings[field] || (field === 'weightincrement' ? settings.weightIncrement : settings.restDuration);
        group.querySelectorAll('.toggle-btn').forEach(btn => {
            const btnValue = btn.dataset[field] || btn.dataset.increment || btn.dataset.duration;
            btn.classList.toggle('active', btnValue == activeValue);
        });
    });

    // Render cards
    document.querySelectorAll('.settings-card-group').forEach(group => {
        const field = group.dataset.field;
        const activeValue = state.userSelections[field];
        group.querySelectorAll('.goal-card').forEach(card => {
            card.classList.toggle('active', card.dataset.value === activeValue);
        });
    });

    // Render plan management list
    if (allPlans.length > 0) {
        elements.planManagementList.innerHTML = allPlans.map(plan => `
            <div class="plan-item ${plan.id === activePlanId ? 'active' : ''}">
                <span class="plan-name-text">${plan.name}</span>
                <div class="plan-actions">
                    ${plan.id !== activePlanId ? `<button class="cta-button plan-btn" data-action="setActivePlan" data-plan-id="${plan.id}">Set Active</button>` : ''}
                    <button class="secondary-button plan-btn" data-action="openBuilderForEdit" data-plan-id="${plan.id}">Edit</button>
                    <button class="secondary-button plan-btn" data-action="savePlanAsTemplate" data-plan-id="${plan.id}">Save as Template</button>
                    <button class="secondary-button plan-btn" data-action="confirmDeletePlan" data-plan-id="${plan.id}">Delete</button>
                </div>
            </div>
        `).join('');
    } else {
        elements.planManagementList.innerHTML = '<p class="placeholder-text">You haven\'t created any plans yet.</p>';
    }
}

export function renderPerformanceSummary() {
    renderTrophyCase();
    renderConsistencyCalendar();
    renderVolumeChart();
    populateExerciseTrackerSelect();
    const initialExercise = elements.exerciseTrackerSelect.value || state.exercises[0]?.name;
    if (initialExercise) {
        renderProgressChart(initialExercise);
        renderE1RMChart(initialExercise);
    }
    renderWorkoutHistory();
}

export function renderProgressChart(exerciseName) {
    const { allPlans, progressChart, settings } = state;
    const labels = [];
    const data = [];

    // Combine workout history from all plans
    const history = [];
    allPlans.forEach(plan => {
        Object.values(plan.weeks).forEach(week => {
            Object.values(week).forEach(day => {
                if (day.completed) {
                    const ex = day.exercises.find(e => e.name === exerciseName);
                    if (ex && ex.sets && ex.sets.length > 0) {
                        const topSet = ex.sets.reduce((max, set) => ((set.weight || 0) > max.weight ? set : max), { weight: 0 });
                        if (topSet.weight > 0) {
                            history.push({ date: new Date(day.completedDate), value: topSet.weight });
                        }
                    }
                }
            });
        });
    });

    // Sort by date and populate chart data
    history.sort((a, b) => a.date - b.date).forEach(item => {
        labels.push(item.date.toLocaleDateString());
        data.push(item.value);
    });


    if (progressChart) progressChart.destroy();

    state.progressChart = new Chart(elements.progressChartCanvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `Top Set Weight (${settings.units})`,
                data,
                borderColor: 'var(--color-accent-primary)',
                backgroundColor: 'rgba(255, 122, 0, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderE1RMChart(exerciseName) {
    const { personalRecords, e1rmChart, settings } = state;
    const exercisePRs = personalRecords
        .filter(pr => pr.exerciseName === exerciseName)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = exercisePRs.map(pr => new Date(pr.date).toLocaleDateString());
    const data = exercisePRs.map(pr => pr.e1rm);

    if (e1rmChart) e1rmChart.destroy();

    state.e1rmChart = new Chart(elements.e1rmChartCanvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `Estimated 1-Rep Max (${settings.units})`,
                data,
                borderColor: 'var(--color-state-success)',
                backgroundColor: 'rgba(52, 199, 89, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

export function renderVolumeChart() {
    const { allPlans, volumeChart } = state;
    const muscleVolume = {};

    allPlans.forEach(plan => {
        Object.values(plan.weeks).forEach(week => {
            Object.values(week).forEach(day => {
                if (day.completed) {
                    day.exercises.forEach(ex => {
                        const volume = ex.totalVolume || 0;
                        muscleVolume[ex.muscle] = (muscleVolume[ex.muscle] || 0) + volume;
                    });
                }
            });
        });
    });

    const labels = Object.keys(muscleVolume);
    const data = Object.values(muscleVolume);

    if (volumeChart) volumeChart.destroy();

    state.volumeChart = new Chart(elements.volumeChartCanvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                label: 'Total Volume by Muscle',
                data,
                backgroundColor: ['#FF7A00', '#FFA500', '#FFC04D', '#FFDB8D', '#FFEDC2', '#38383A', '#5A5A5A'],
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderTrophyCase() {
    const { personalRecords } = state;
    if (personalRecords.length === 0) {
        elements.trophyCaseList.innerHTML = '<p class="placeholder-text">You haven\'t set any personal records yet. Keep lifting!</p>';
        return;
    }

    const bestPRs = {};
    personalRecords.forEach(pr => {
        if (!bestPRs[pr.exerciseId] || pr.e1rm > bestPRs[pr.exerciseId].e1rm) {
            bestPRs[pr.exerciseId] = pr;
        }
    });

    const sortedBestPRs = Object.values(bestPRs).sort((a, b) => new Date(b.date) - new Date(a.date));

    elements.trophyCaseList.innerHTML = sortedBestPRs.map(pr => `
        <div class="pr-item">
            <div class="pr-exercise-name">${pr.exerciseName}</div>
            <div class="pr-details">
                <span class="pr-lift">${pr.weight} ${pr.units} x ${pr.reps}</span>
                <span class="pr-e1rm">~${pr.e1rm} ${pr.units} e1RM</span>
            </div>
            <div class="pr-date">${new Date(pr.date).toLocaleDateString()}</div>
        </div>
    `).join('');
}


function renderConsistencyCalendar() {
    const calendarEl = elements.consistencyCalendar;
    calendarEl.innerHTML = ''; // Clear previous
    const completedDates = new Set(state.workoutHistory.map(h => new Date(h.completedDate).toDateString()));
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    calendarEl.innerHTML += `<div class="calendar-header">${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}</div>`;
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
        calendarEl.innerHTML += `<div class="calendar-day-name">${day}</div>`;
    });

    for (let i = 0; i < startDate.getDay(); i++) {
        calendarEl.innerHTML += '<div></div>';
    }

    for (let i = 1; i <= endDate.getDate(); i++) {
        const currentDate = new Date(today.getFullYear(), today.getMonth(), i);
        const isCompleted = completedDates.has(currentDate.toDateString());
        calendarEl.innerHTML += `<div class="calendar-day ${isCompleted ? 'completed' : ''}">${i}</div>`;
    }
}

function populateExerciseTrackerSelect() {
    // Get unique exercises from workouts that have been completed at least once.
    const completedExercises = new Set();
    state.allPlans.forEach(plan => {
        Object.values(plan.weeks).forEach(week => {
            Object.values(week).forEach(day => {
                if (day.completed) {
                    day.exercises.forEach(ex => completedExercises.add(ex.name));
                }
            });
        });
    });
    const uniqueExercises = [...completedExercises].sort();
    elements.exerciseTrackerSelect.innerHTML = uniqueExercises.map(name => `<option value="${name}">${name}</option>`).join('');
}

function renderWorkoutHistory() {
    if (state.workoutHistory.length > 0) {
        elements.workoutHistoryList.innerHTML = state.workoutHistory.map(h => `
            <div class="summary-item">
                <div>
                    <h4>${h.workoutName}</h4>
                    <p>${new Date(h.completedDate).toLocaleDateString()}</p>
                </div>
                <p>${Math.round(h.volume)} ${state.settings.units}</p>
            </div>
        `).join('');
    } else {
        elements.workoutHistoryList.innerHTML = '<p class="placeholder-text">No completed workouts yet.</p>';
    }
}

export function renderTemplateLibrary(activeTab = 'progression') {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${activeTab}"]`).classList.add('active');

    let templates = [];
    if (activeTab === 'progression') {
        templates = planGenerator.getAllTemplates();
    } else {
        templates = state.savedTemplates;
    }

    if (templates.length > 0) {
        elements.templateListContainer.innerHTML = templates.map(template => `
            <button class="hub-option" data-action="${activeTab === 'progression' ? 'selectTemplate' : 'selectSavedTemplate'}" data-template-id="${template.id}">
                <div class="hub-option-icon">${template.icon || '💾'}</div>
                <div class="hub-option-text">
                    <h3>${template.name}</h3>
                    <p>${template.description || `A custom template you created.`}</p>
                </div>
            </button>
        `).join('');
    } else {
        elements.templateListContainer.innerHTML = `<p class="placeholder-text">You have no saved templates yet. Save a plan from the settings menu to create one.</p>`;
    }
}

export function renderPlanHub() {
    elements.planHubOptions.innerHTML = `
        <button class="hub-option" data-hub-action="scratch">
            <div class="hub-option-icon">✨</div>
            <div class="hub-option-text">
                <h3>Start from Scratch</h3>
                <p>Use the builder to create a fully custom plan.</p>
            </div>
        </button>
        <button class="hub-option" data-hub-action="template">
            <div class="hub-option-icon">📚</div>
            <div class="hub-option-text">
                <h3>Use a Template</h3>
                <p>Start with a proven template from Progression or one you've saved.</p>
            </div>
        </button>
         <button class="hub-option" data-hub-action="manage">
            <div class="hub-option-icon">⚙️</div>
            <div class="hub-option-text">
                <h3>Manage My Plans</h3>
                <p>Edit, delete, or change your active workout plan.</p>
            </div>
        </button>
    `;
}

export function renderWorkoutSummary() {
    const { workoutSummary, settings } = state;
    const { totalVolume, totalSets, suggestions, newPRs } = workoutSummary;
    const totalSeconds = state.workoutTimer.elapsed;
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    elements.summaryTime.textContent = `${minutes}:${seconds}`;
    elements.summaryVolume.textContent = `${Math.round(totalVolume)} ${settings.units}`;
    elements.summarySets.textContent = totalSets;
    elements.summaryPRs.textContent = newPRs || '0'; // Display the count of new PRs

    if (suggestions && suggestions.length > 0) {
        elements.summaryProgressionList.innerHTML = suggestions.map(s => `
            <div class="summary-item">
                <h4>${s.exerciseName}</h4>
                <p>${s.suggestion}</p>
            </div>
        `).join('');
    } else {
        elements.summaryProgressionList.innerHTML = '<p class="placeholder-text">Great work! Continue with this plan for your next session.</p>';
    }
}

// --- MODAL & TIMERS ---

export function showModal(title, content, actions = [{ text: 'OK', class: 'cta-button' }]) {
    elements.modalBody.innerHTML = `<h2>${title}</h2><div class="modal-content-body">${content}</div>`;
    elements.modalActions.innerHTML = actions.map(action =>
        `<button class="${action.class}" data-action="closeModal">${action.text}</button>`
    ).join('');

    // Re-attach listeners for programmatically added actions
    elements.modalActions.querySelectorAll('button').forEach((button, index) => {
        if (actions[index].action) {
            button.addEventListener('click', actions[index].action, { once: true });
        }
    });

    elements.modal.classList.add('active');
}

export function closeModal() {
    elements.modal.classList.remove('active');
}

export function updateStopwatchDisplay() {
    const totalSeconds = state.workoutTimer.elapsed + (state.workoutTimer.isRunning ? Math.floor((Date.now() - state.workoutTimer.startTime) / 1000) : 0);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    elements.workoutStopwatch.textContent = `${minutes}:${seconds}`;
}

export function updateRestTimerDisplay() {
    const minutes = Math.floor(state.restTimer.remaining / 60).toString().padStart(2, '0');
    const seconds = (state.restTimer.remaining % 60).toString().padStart(2, '0');
    elements.restTimer.textContent = `${minutes}:${seconds}`;
}

// --- THEME ---
export function applyTheme() {
    document.body.dataset.theme = state.settings.theme;
}

// --- CUSTOM PLAN WIZARD ---
// This could be its own module, but keeping it here for simplicity
export const customPlanWizard = {
    // ... wizard logic would go here if it were more complex
};

// Expose functions to be used in other modules if needed
const self = {
    renderOnboardingStep,
    renderHomeScreen,
    renderDailyWorkout,
    renderBuilder,
    renderSettings,
    renderPerformanceSummary,
    renderTemplateLibrary,
    renderPlanHub,
    renderWorkoutSummary,
    renderE1RMChart,
};
