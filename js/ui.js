import { state } from './state.js';
import { createSetRowHTML, capitalize } from './utils.js';
import { workoutEngine } from './planGenerator.js';
import { findLastPerformance } from './eventHandlers.js'; // Import the new function

/**
 * @file ui.js handles all DOM manipulation and UI rendering for the application.
 * It is responsible for keeping the user interface in sync with the application's state.
 */

// --- DOM ELEMENT CACHE ---
export const elements = {
    // Views
    onboardingView: document.getElementById('onboarding-container'),
    homeScreenView: document.getElementById('home-screen'),
    templatePortalView: document.getElementById('template-portal-view'),
    workoutView: document.getElementById('daily-workout-view'),
    workoutSummaryView: document.getElementById('workout-summary-view'),
    performanceSummaryView: document.getElementById('performance-summary-view'),
    settingsView: document.getElementById('settings-view'),

    // Onboarding
    onboardingProgressBar: document.getElementById('onboarding-progress'),
    onboardingProgressBarContainer: document.getElementById('onboarding-progress-bar'),

    // Home Screen
    activePlanDisplay: document.getElementById('active-plan-display'),

    // Daily Workout
    workoutDayTitle: document.getElementById('workout-day-title'),
    workoutDate: document.getElementById('workout-date'),
    exerciseListContainer: document.getElementById('exercise-list-container'),
    workoutStopwatch: document.getElementById('workout-stopwatch-display'),
    restTimer: document.getElementById('rest-timer-display'),

    // Template Portal
    templatePortalOptions: document.getElementById('template-portal-options'),

    // Settings
    settingsContent: document.getElementById('settings-content'),
    planManagementList: document.getElementById('plan-management-list'),

    // Performance Summary
    consistencyCalendar: document.getElementById('consistency-calendar'),
    volumeChartCanvas: document.getElementById('volume-chart'),
    progressChartCanvas: document.getElementById('progress-chart'),
    e1rmChartCanvas: document.getElementById('e1rm-chart'),
    exerciseTrackerSelect: document.getElementById('exercise-tracker-select'),
    workoutHistoryList: document.getElementById('workout-history-list'),
    trophyCaseList: document.getElementById('trophy-case-list'),
    weightChartContainer: document.getElementById('weight-chart-container'),
    e1rmChartContainer: document.getElementById('e1rm-chart-container'),

    // Workout Summary
    summaryTime: document.getElementById('summary-time'),
    summaryVolume: document.getElementById('summary-volume'),
    summarySets: document.getElementById('summary-sets'),
    summaryPRs: document.getElementById('summary-prs'),
    summaryProgressionList: document.getElementById('summary-progression-list'),
    summaryMesoCompleted: document.getElementById('summary-meso-completed'),
    summaryMesoIncomplete: document.getElementById('summary-meso-incomplete'),

    // Modals
    modal: document.getElementById('modal'),
    modalBody: document.getElementById('modal-body'),
    modalActions: document.getElementById('modal-actions'),
    feedbackModal: document.getElementById('feedback-modal'),
    feedbackModalTitle: document.getElementById('feedback-modal-title'),
    feedbackModalQuestion: document.getElementById('feedback-modal-question'),
    feedbackModalOptions: document.getElementById('feedback-modal-options'),
    dailyCheckinModal: document.getElementById('daily-checkin-modal'),
    sleepSlider: document.getElementById('sleep-slider'),
    stressSlider: document.getElementById('stress-slider'),
    sleepLabel: document.getElementById('sleep-label'),
    stressLabel: document.getElementById('stress-label'),

    // Tooltip
    tooltip: document.createElement('div'),
};

// Initialize Tooltip
elements.tooltip.className = 'tooltip';
document.body.appendChild(elements.tooltip);


// --- VIEW MANAGEMENT ---

export function showView(viewName, skipAnimation = false) {
    _performViewChange(viewName, skipAnimation);
}

function _performViewChange(viewName, skipAnimation) {
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
        templatePortal: elements.templatePortalView,
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
            
            switch (viewName) {
                case 'onboarding': renderOnboardingStep(); break;
                case 'home': renderHomeScreen(); break;
                case 'templatePortal': renderTemplatePortal(); break;
                case 'workout': renderDailyWorkout(); break;
                case 'workoutSummary': renderWorkoutSummary(); break;
                case 'performanceSummary': renderPerformanceSummary(); break;
                case 'settings': renderSettings(); break;
            }
        }, currentViewEl ? 400 : 0);
    }
}

// --- RENDER FUNCTIONS ---

export function renderOnboardingStep() {
    const { currentStep, totalSteps } = state.onboarding;
    const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    elements.onboardingProgressBar.style.width = `${progressPercentage}%`;

    // Add shimmer effect when loading the last step
    if (currentStep === totalSteps) {
        const shimmer = document.createElement('div');
        shimmer.className = 'shimmer-wrapper';
        elements.onboardingProgressBarContainer.appendChild(shimmer);
    } else {
        const shimmer = elements.onboardingProgressBarContainer.querySelector('.shimmer-wrapper');
        if (shimmer) {
            shimmer.remove();
        }
    }

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
    
    if (!workout || !workout.exercises || workout.exercises.length === 0) {
        elements.workoutDayTitle.textContent = workout?.name || "Rest Day";
        elements.workoutDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        elements.exerciseListContainer.innerHTML = '<p class="placeholder-text">No exercises scheduled for today. Enjoy your rest!</p>';
        document.getElementById('complete-workout-btn').style.display = 'none';
        return;
    }

    document.getElementById('complete-workout-btn').style.display = 'block';
    elements.workoutDayTitle.textContent = workout.name;
    elements.workoutDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    updateStopwatchDisplay();
    updateRestTimerDisplay();

    let html = '';
    workout.exercises.forEach((ex, exIndex) => {
        const hasNote = ex.note && ex.note.trim() !== '';
        const isStalled = ex.stallCount >= 2;
        
        const lastPerformance = findLastPerformance(ex.exerciseId);
        let lastPerformanceHTML = '';
        if (lastPerformance) {
            lastPerformanceHTML = `<div class="last-performance-display">Last Time: ${lastPerformance.weight} ${state.settings.units} x ${lastPerformance.reps}</div>`;
        }

        html += `
            <div class="exercise-card ${isStalled ? 'stalled' : ''}" data-exercise-index="${exIndex}">
                <div class="exercise-card-header">
                    <div class="exercise-title-group">
                        <h3 data-tooltip="This is your main lift for the day. Focus on good form and progressive overload.">${ex.name} ${isStalled ? '<span class="stall-indicator" data-tooltip="You\'ve stalled on this exercise. Consider swapping it.">⚠️</span>' : ''}</h3>
                        <button class="swap-exercise-btn" data-action="swapExercise" data-exercise-index="${exIndex}" aria-label="Swap Exercise" data-tooltip="Swap for an alternative exercise">
                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.6v-2.6c0-2.2 1.8-4 4-4h14"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.4v2.6c0 2.2-1.8 4-4 4H3"/></svg>
                        </button>
                        <button class="history-btn" data-action="showHistory" data-exercise-id="${ex.exerciseId}" aria-label="View History" data-tooltip="View past performance for this exercise">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.19-9.35L1 10"/></svg>
                        </button>
                        <button class="note-btn ${hasNote ? 'has-note' : ''}" data-action="openExerciseNotes" data-exercise-index="${exIndex}" aria-label="Add or view exercise notes" data-tooltip="Add or view exercise notes">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                    </div>
                    ${lastPerformanceHTML}
                </div>
                <div class="sets-container">
                    <div class="set-row header">
                        <div class="set-number">SET</div>
                        <div class="set-inputs-wrapper">
                            <div class="set-inputs">
                                <span>${state.settings.units.toUpperCase()}</span>
                                <span>REPS / RIR</span>
                            </div>
                        </div>
                        <div class="set-actions"></div>
                    </div>
                    ${[...Array(ex.targetSets)].map((_, setIndex) => {
                        const currentSet = ex.sets?.[setIndex] || {};
                        const lastWeekSet = null;
                        return createSetRowHTML(exIndex, setIndex, currentSet, lastWeekSet, ex.targetReps, ex.targetRIR, week);
                    }).join('')}
                </div>
                <button class="add-set-btn" data-action="addSet" data-exercise-index="${exIndex}">+ Add Set</button>
            </div>
        `;
    });
    elements.exerciseListContainer.innerHTML = html;
}

export function renderSettings() {
    const { settings, userSelections, allPlans, activePlanId } = state;

    // Helper function to update a toggle switch
    const updateToggleSwitch = (switchId, stateValue, dataAttribute) => {
        const switchElement = document.getElementById(switchId);
        if (switchElement) {
            switchElement.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset[dataAttribute] == stateValue);
            });
        }
    };

    // Update all toggle switches
    updateToggleSwitch('progression-model-switch', settings.progressionModel, 'progression');
    updateToggleSwitch('weight-increment-switch', settings.weightIncrement, 'increment');
    updateToggleSwitch('rest-duration-switch', settings.restDuration, 'duration');
    updateToggleSwitch('units-switch', settings.units, 'unit');
    updateToggleSwitch('theme-switch', settings.theme, 'theme');


    document.querySelectorAll('.settings-card-group').forEach(group => {
        const field = group.dataset.field;
        const activeValue = state.userSelections[field];
        group.querySelectorAll('.goal-card').forEach(card => {
            card.classList.toggle('active', card.dataset.value == activeValue);
        });
    });

    if (allPlans.length > 0) {
        elements.planManagementList.innerHTML = allPlans.map(plan => `
            <div class="plan-item ${plan.id === activePlanId ? 'active' : ''}">
                <span class="plan-name-text" data-action="startPlanWorkout" data-plan-id="${plan.id}">${plan.name}</span>
                <div class="plan-actions">
                    ${plan.id !== activePlanId ? `<button class="cta-button plan-btn" data-action="setActivePlan" data-plan-id="${plan.id}">Set Active</button>` : ''}
                    <button class="secondary-button plan-btn" data-action="editPlan" data-plan-id="${plan.id}">Edit</button>
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
                backgroundColor: ['#FF7A00', '#FFA500', '#FFC04D', '#FFDB8D', '#FFEDC2', '#3838A', '#5A5A5A'],
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
    calendarEl.innerHTML = '';
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

export function renderTemplatePortal() {
    elements.templatePortalOptions.innerHTML = `
        <button class="hub-option" data-hub-action="new">
            <div class="hub-option-icon">✨</div>
            <div class="hub-option-text">
                <h3>Create New Intelligent Plan</h3>
                <p>Generate a new mesocycle based on your current profile.</p>
            </div>
        </button>
        <button class="hub-option" data-hub-action="premade">
            <div class="hub-option-icon">📚</div>
            <div class="hub-option-text">
                <h3>Premade Templates</h3>
                <p>Choose from a list of expert-designed workout plans.</p>
            </div>
        </button>
        <button class="hub-option" data-hub-action="custom">
            <div class="hub-option-icon">✏️</div>
            <div class="hub-option-text">
                <h3>Custom Plans</h3>
                <p>Build your own workout from scratch or edit a template.</p>
            </div>
        </button>
         <button class="hub-option" data-hub-action="manage">
            <div class="hub-option-icon">⚙️</div>
            <div class="hub-option-text">
                <h3>Manage My Plans</h3>
                <p>View, delete, or change your active workout plan.</p>
            </div>
        </button>
    `;
}

export function renderWorkoutSummary() {
    const { workoutSummary, settings } = state;
    const { totalVolume, totalSets, suggestions, newPRs, mesocycleStats } = workoutSummary;
    const totalSeconds = state.workoutTimer.elapsed;
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    elements.summaryTime.textContent = `${minutes}:${seconds}`;
    elements.summaryVolume.textContent = `${Math.round(totalVolume)} ${settings.units}`;
    elements.summarySets.textContent = totalSets;
    elements.summaryPRs.textContent = newPRs || '0';

    if (mesocycleStats) {
        elements.summaryMesoCompleted.textContent = mesocycleStats.completed;
        elements.summaryMesoIncomplete.textContent = mesocycleStats.incomplete;
    }

    if (suggestions && suggestions.length > 0) {
        elements.summaryProgressionList.innerHTML = suggestions.map(s => `
            <div class="summary-item">
                <h4>${s.exerciseName}</h4>
                <p>${s.suggestion}</p>
            </div>
        `).join('');
    } else {
        elements.summaryProgressionList.innerHTML = '<p class="placeholder-text">Great work! You have completed your mesocycle.</p>';
    }
}

// --- MODAL & TIMERS ---

export function showModal(title, content, actions = [{ text: 'OK', class: 'cta-button' }]) {
    elements.modalBody.innerHTML = `<h2>${title}</h2><div class="modal-content-body">${content}</div>`;
    elements.modalActions.innerHTML = actions.map(action =>
        `<button class="${action.class}" data-action="closeModal">${action.text}</button>`
    ).join('');

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

export function showFeedbackModal(title, question, options, callback) {
    elements.feedbackModalTitle.textContent = title;
    elements.feedbackModalQuestion.textContent = question;
    elements.feedbackModalOptions.innerHTML = options.map(opt => 
        `<button class="cta-button secondary-button" data-value="${opt.value}">${opt.text}</button>`
    ).join('');

    elements.feedbackModalOptions.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', () => {
            if (callback) {
                callback(button.dataset.value);
            }
            closeFeedbackModal();
        }, { once: true });
    });

    elements.feedbackModal.classList.add('active');
}

export function closeFeedbackModal() {
    elements.feedbackModal.classList.remove('active');
}

export function showDailyCheckinModal() {
    elements.dailyCheckinModal.classList.add('active');
}

export function closeDailyCheckinModal() {
    elements.dailyCheckinModal.classList.remove('active');
}

export function displayIntraWorkoutRecommendation(exerciseIndex, setIndex, recommendationText) {
    const nextSetIndex = setIndex + 1;
    const recommendationEl = document.querySelector(`.recommendation-text[data-exercise-index="${exerciseIndex}"][data-set-index="${nextSetIndex}"]`);
    
    if (recommendationEl) {
        recommendationEl.textContent = recommendationText;
        recommendationEl.style.display = 'block';
    }
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

// --- TOOLTIPS ---
export function showTooltip(target) {
    const tooltipText = target.dataset.tooltip;
    if (!tooltipText) return;

    elements.tooltip.textContent = tooltipText;
    elements.tooltip.classList.add('active');

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = elements.tooltip.getBoundingClientRect();

    elements.tooltip.style.left = `${targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)}px`;
    elements.tooltip.style.top = `${targetRect.top - tooltipRect.height - 10}px`;
}

export function hideTooltip() {
    elements.tooltip.classList.remove('active');
}
