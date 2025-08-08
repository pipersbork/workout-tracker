import { state } from './state.js';
import { planGenerator } from './planGenerator.js';
import * as utils from './utils.js';

/**
 * @file ui.js handles all direct DOM manipulation and rendering.
 * It's responsible for what the user sees.
 */

// --- DOM ELEMENT REFERENCES ---
export const elements = {
    onboardingContainer: document.getElementById('onboarding-container'),
    homeScreen: document.getElementById('home-screen'),
    planHubView: document.getElementById('plan-hub-view'),
    templateLibraryView: document.getElementById('template-library-view'),
    workoutView: document.getElementById('daily-workout-view'),
    builderView: document.getElementById('builder-view'),
    performanceSummaryView: document.getElementById('performance-summary-view'),
    settingsView: document.getElementById('settings-view'),
    customPlanWizardView: document.getElementById('custom-plan-wizard-view'),
    workoutSummaryView: document.getElementById('workout-summary-view'),
    scheduleContainer: document.getElementById('schedule-container'),
    modal: document.getElementById('modal'),
    modalBody: document.getElementById('modal-body'),
    modalActions: document.getElementById('modal-actions'),
    activePlanDisplay: document.getElementById('active-plan-display'),
    builderTitle: document.getElementById('builder-title'),
    planManagementList: document.getElementById('plan-management-list'),
    workoutStopwatchDisplay: document.getElementById('workout-stopwatch-display'),
    restTimerDisplay: document.getElementById('rest-timer-display'),
    templateListContainer: document.getElementById('template-list-container'),
};

// --- VIEW MANAGEMENT ---

const viewMap = {
    onboarding: 'onboarding-container',
    home: 'home-screen',
    planHub: 'plan-hub-view',
    templateLibrary: 'template-library-view',
    customPlanWizard: 'custom-plan-wizard-view',
    builder: 'builder-view',
    workout: 'daily-workout-view',
    performanceSummary: 'performance-summary-view',
    settings: 'settings-view',
    workoutSummary: 'workout-summary-view',
};

export function showView(viewName, skipAnimation = false) {
    if (viewName !== 'onboarding' && !state.userSelections.onboardingCompleted) {
        viewName = 'onboarding';
    }

    const currentViewId = viewMap[state.currentViewName];
    const newViewId = viewMap[viewName];
    if (!newViewId) return;

    const currentViewEl = document.getElementById(currentViewId);
    const newViewEl = document.getElementById(newViewId);
    if (!newViewEl) return;

    const transition = () => {
        if (currentViewEl) {
            currentViewEl.classList.add('hidden');
            currentViewEl.classList.remove('fade-out');
        }
        newViewEl.classList.remove('hidden');

        const renderActions = {
            home: renderHomeScreen,
            planHub: renderPlanHub,
            templateLibrary: renderTemplateLibrary,
            workout: renderDailyWorkout,
            builder: renderBuilder,
            performanceSummary: renderPerformanceSummary,
            settings: renderSettings,
            customPlanWizard: customPlanWizard.render,
            workoutSummary: renderWorkoutSummary,
            onboarding: renderOnboardingStep,
        };
        
        renderActions[viewName]?.();
        state.currentViewName = viewName;
    };

    if (skipAnimation || !currentViewEl || currentViewEl === newViewEl) {
        transition();
    } else {
        currentViewEl.classList.add('fade-out');
        setTimeout(transition, 400);
    }
}

// --- RENDER FUNCTIONS ---

export function renderHomeScreen() {
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    if (activePlan) {
        elements.activePlanDisplay.textContent = `Active Plan: ${activePlan.name}`;
    } else {
        elements.activePlanDisplay.innerHTML = `No active plan. <a href="#" data-action="showView" data-view-name="planHub">Create one!</a>`;
    }
}

export function renderPlanHub() {
    const container = document.getElementById('plan-hub-options');
    let optionsHTML = `
        <button class="hub-option animated-button" data-hub-action="template">
            <div class="hub-option-icon">📖</div>
            <div class="hub-option-text"><h3>Start with a Template</h3><p>Choose from evidence-based or your own saved templates.</p></div>
        </button>
        <button class="hub-option animated-button" data-hub-action="scratch">
            <div class="hub-option-icon">✏️</div>
            <div class="hub-option-text"><h3>Start from Scratch</h3><p>Use the wizard to design a new custom plan.</p></div>
        </button>
    `;
    if (state.allPlans.length > 0) {
        optionsHTML += `
            <button class="hub-option animated-button" data-hub-action="manage">
                <div class="hub-option-icon">⚙️</div>
                <div class="hub-option-text"><h3>Manage My Plans</h3><p>Edit, delete, or set your active workout plan.</p></div>
            </button>
        `;
    }
    container.innerHTML = optionsHTML;
}

export function renderTemplateLibrary(activeTab = 'progression') {
    const container = elements.templateListContainer;
    const progressionTemplates = planGenerator.getAllTemplates ? planGenerator.getAllTemplates() : [];

    document.querySelectorAll('#template-library-view .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === activeTab);
    });

    let templatesHTML = '';
    if (activeTab === 'progression') {
        templatesHTML = progressionTemplates.map(template => `
            <div class="hub-option animated-button" data-action="selectTemplate" data-template-id="${template.id}">
                <div class="hub-option-icon">${template.icon}</div>
                <div class="hub-option-text"><h3>${template.name}</h3><p>${template.description}</p></div>
            </div>
        `).join('');
    } else { // 'saved' tab
        if (state.savedTemplates.length > 0) {
            templatesHTML = state.savedTemplates.map(template => `
                <div class="hub-option animated-button" data-action="selectSavedTemplate" data-template-id="${template.id}">
                    <div class="hub-option-icon">💪</div>
                    <div class="hub-option-text"><h3>${template.name}</h3><p>${template.builderTemplate.days.length}-day split</p></div>
                </div>
            `).join('');
        }
    }

    if (!templatesHTML) {
        container.innerHTML = `<div class="placeholder-text">You have no saved templates yet. Create a plan and save it as a template from the Settings screen!</div>`;
    } else {
        container.innerHTML = templatesHTML;
    }
}

export function renderBuilder() {
    const container = elements.scheduleContainer;
    container.innerHTML = '';
    if (!state.builderPlan || state.builderPlan.days.length === 0) {
        container.innerHTML = `<p class="placeholder-text">Click "Add a Day" to start building your schedule.</p>`;
        return;
    }
    const muscleList = ['Select a Muscle', 'Rest Day', ...new Set(state.exercises.map(ex => ex.muscle))];
    const muscleOptions = muscleList.map(m => `<option value="${m.toLowerCase().replace(/ /g, '')}">${m === 'Rest Day' ? m + ' 🌙' : m}</option>`).join('');
    const exerciseSlotsByFocus = { 'Primary': 3, 'Secondary': 2, 'Maintenance': 1 };

    state.builderPlan.days.forEach((day, dayIndex) => {
        const dayCard = document.createElement('div');
        dayCard.className = `day-card expanded`;
        dayCard.dataset.dayIndex = dayIndex;

        const muscleGroupsHTML = day.muscleGroups.map((mg, muscleIndex) => {
            const exercisesForMuscle = state.exercises.filter(ex => ex.muscle.toLowerCase() === mg.muscle);
            const exerciseOptions = [{name: 'Select an Exercise'}, ...exercisesForMuscle].map(ex => `<option value="${ex.name}" ${mg.exercises.includes(ex.name) ? 'selected' : ''}>${ex.name}</option>`).join('');
            const numSlots = exerciseSlotsByFocus[mg.focus] || 3;
            const exerciseDropdowns = Array.from({ length: numSlots }).map((_, exerciseSelectIndex) => `
                <select class="builder-select exercise-select" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" data-exercise-select-index="${exerciseSelectIndex}">
                    ${exerciseOptions.replace(`value="${mg.exercises[exerciseSelectIndex]}"`, `value="${mg.exercises[exerciseSelectIndex]}" selected`)}
                </select>
            `).join('');
            const focusButtons = ['Primary', 'Secondary', 'Maintenance'].map(focusLevel => `
                <button class="focus-btn ${mg.focus === focusLevel ? 'active' : ''}" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" data-focus="${focusLevel}">${focusLevel}</button>
            `).join('');
            const isRestDay = mg.muscle === 'restday';
            return `
                <div class="muscle-group-block">
                    <div class="muscle-group-header">
                        <div class="muscle-group-selectors">
                            <select class="builder-select muscle-select" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}">${muscleOptions.replace(`value="${mg.muscle}"`, `value="${mg.muscle}" selected`)}</select>
                            ${!isRestDay ? `<div class="focus-buttons">${focusButtons}</div>` : ''}
                        </div>
                        <button class="delete-btn animated-button" data-muscle-index="${muscleIndex}" aria-label="Delete muscle group"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                    ${!isRestDay && mg.muscle !== 'selectamuscle' ? `<div class="exercise-selection-group"><label>Exercises:</label>${exerciseDropdowns}</div>` : ''}
                </div>
            `;
        }).join('');

        dayCard.innerHTML = `
            <div class="day-header">
                <input class="builder-input day-label-input" type="text" value="${day.label}" placeholder="e.g., Push Day" data-day-index="${dayIndex}">
                <button class="delete-btn animated-button" data-action="deleteDayFromBuilder" aria-label="Delete day"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            </div>
            <div class="day-content">${muscleGroupsHTML}<button class="cta-button secondary-button add-muscle-group-btn animated-button">+ Add a Muscle Group</button></div>
        `;
        container.appendChild(dayCard);
    });
}

export function renderSettings() {
    // Render preference cards
    document.getElementById('settings-goal-cards').querySelector(`.goal-card[data-value="${state.userSelections.goal}"]`)?.classList.add('active');
    document.getElementById('settings-experience-cards').querySelector(`.goal-card[data-value="${state.userSelections.experience}"]`)?.classList.add('active');
    
    // Render toggle buttons
    document.querySelectorAll('[data-action="setUnits"]').forEach(btn => btn.classList.toggle('active', btn.dataset.unit === state.settings.units));
    document.querySelectorAll('[data-action="setTheme"]').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === state.settings.theme));
    document.querySelectorAll('[data-action="setProgressionModel"]').forEach(btn => btn.classList.toggle('active', btn.dataset.progression === state.settings.progressionModel));
    document.querySelectorAll('[data-action="setWeightIncrement"]').forEach(btn => btn.classList.toggle('active', parseFloat(btn.dataset.increment) === state.settings.weightIncrement));
    document.querySelectorAll('[data-action="setRestDuration"]').forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.duration) === state.settings.restDuration));

    // Render plan management list
    elements.planManagementList.innerHTML = '';
    if (state.allPlans.length === 0) {
        elements.planManagementList.innerHTML = `<p class="placeholder-text">You haven't created any plans yet.</p>`;
    } else {
        state.allPlans.forEach(plan => {
            const isActive = plan.id === state.activePlanId;
            const planItem = document.createElement('div');
            planItem.className = `plan-item ${isActive ? 'active' : ''}`;
            planItem.dataset.planId = plan.id;
            planItem.innerHTML = `
                <span class="plan-name-text">${plan.name}</span>
                <div class="plan-actions">
                    <button class="plan-btn animated-button" data-action="savePlanAsTemplate" data-plan-id="${plan.id}">Template</button>
                    <button class="plan-btn animated-button" data-action="openBuilderForEdit" data-plan-id="${plan.id}">Edit</button>
                    <button class="plan-btn animated-button" data-action="confirmDeletePlan" data-plan-id="${plan.id}">Delete</button>
                    <button class="plan-btn animated-button" data-action="setActivePlan" data-plan-id="${plan.id}" ${isActive ? 'disabled' : ''}>${isActive ? 'Active' : 'Set Active'}</button>
                </div>
            `;
            elements.planManagementList.appendChild(planItem);
        });
    }
}

export function renderDailyWorkout() {
    const container = document.getElementById('exercise-list-container');
    const workoutTitle = document.getElementById('workout-day-title');
    const workoutDate = document.getElementById('workout-date');
    container.innerHTML = '';
    workoutDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    state.workoutTimer.elapsed = 0;
    state.workoutTimer.startTime = 0;
    state.workoutTimer.isRunning = false;
    clearInterval(state.workoutTimer.instance);
    updateStopwatchDisplay();

    state.restTimer.isRunning = false;
    clearInterval(state.restTimer.instance);
    state.restTimer.remaining = state.settings.restDuration;
    updateRestTimerDisplay();

    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    if (!activePlan) {
        workoutTitle.textContent = "No Active Plan";
        container.innerHTML = `<p class="placeholder-text">Please create and set an active plan in Settings.</p>`;
        document.getElementById('complete-workout-btn').classList.add('hidden');
        return;
    }

    const { week, day } = state.currentView;
    const workout = activePlan.weeks?.[week]?.[day];
    const lastWeekWorkout = activePlan.weeks?.[week - 1]?.[day];

    if (!workout) {
        workoutTitle.textContent = "Workout Not Found";
        container.innerHTML = `<p class="placeholder-text">Could not find a workout for Week ${week}, Day ${day}. Your plan might be incomplete or finished.</p>`;
        document.getElementById('complete-workout-btn').classList.add('hidden');
        return;
    }

    document.getElementById('complete-workout-btn').classList.remove('hidden');
    workoutTitle.textContent = workout.name;
    if (workout.exercises.length === 0) {
        container.innerHTML = `<p class="placeholder-text">This is a rest day. Enjoy it!</p>`;
        return;
    }
    
    workout.exercises.forEach((ex, exIndex) => {
        const lastWeekEx = lastWeekWorkout?.exercises.find(e => e.exerciseId === ex.exerciseId);
        const setsHTML = (ex.sets || []).map((set, setIndex) => {
            const lastWeekSet = lastWeekEx?.sets[setIndex];
            return utils.createSetRowHTML(exIndex, setIndex, set, lastWeekSet, ex.targetReps, ex.targetRIR, week);
        }).join('');

        const exerciseCard = document.createElement('div');
        exerciseCard.className = 'exercise-card';
        exerciseCard.innerHTML = `
            <div class="exercise-card-header">
                <div class="exercise-title-group">
                    <h3>${ex.name}</h3>
                    <button class="swap-exercise-btn animated-button" data-action="swapExercise" data-exercise-index="${exIndex}" aria-label="Swap Exercise">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.883L13.865 6.43L18 7.062L14.938 9.938L15.703 14.117L12 12.2L8.297 14.117L9.062 9.938L6 7.062L10.135 6.43L12 2.883z" stroke-width="0" fill="currentColor"/><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1 14H8v-2h3v-3H8V9h3V6h2v3h3v2h-3v3h3v2h-3v3h-2v-3z"/></svg>
                    </button>
                    <button class="history-btn animated-button" data-action="showHistory" data-exercise-id="${ex.exerciseId}" aria-label="View History">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                    </button>
                </div>
                <span class="exercise-target">${ex.targetSets} Sets @ ${ex.targetRIR} RIR</span>
            </div>
            <div class="sets-container" id="sets-for-ex-${exIndex}">
                <div class="set-row header">
                    <div class="set-number">SET</div>
                    <div class="set-inputs">
                        <span>WEIGHT (${state.settings.units.toUpperCase()})</span>
                        <span>REPS / RIR</span>
                    </div>
                    <div class="set-actions"></div>
                </div>
                ${setsHTML}
            </div>
            <button class="add-set-btn animated-button" data-action="addSet" data-exercise-index="${exIndex}">+ Add Set</button>
        `;
        container.appendChild(exerciseCard);
    });
}

function renderWorkoutHistory() {
    const container = document.getElementById('workout-history-list');
    if (!container) return;

    if (!state.workoutHistory || state.workoutHistory.length === 0) {
        container.innerHTML = '<p class="placeholder-text">You haven\'t completed any workouts yet.</p>';
        return;
    }

    container.innerHTML = state.workoutHistory.map(entry => `
        <div class="summary-item">
            <div>
                <h4>${entry.workoutName}</h4>
                <p>${new Date(entry.completedDate).toLocaleDateString()}</p>
            </div>
            <span>${entry.volume} ${state.settings.units}</span>
        </div>
    `).join('');
}

export function renderPerformanceSummary() {
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    if (!activePlan) {
        document.getElementById('summary-content').innerHTML = `<p class="placeholder-text">Select an active plan to see its summary.</p>`;
        return;
    }

    const exerciseSelect = document.getElementById('exercise-tracker-select');
    exerciseSelect.innerHTML = '<option value="">Select an exercise to track</option>';
    
    const completedWorkouts = [];
    const uniqueExercises = new Set();
    if (activePlan.weeks) {
        Object.values(activePlan.weeks).forEach(week => {
            Object.values(week).forEach(day => {
                if (day.completed) {
                    completedWorkouts.push(day);
                    day.exercises.forEach(ex => uniqueExercises.add(ex.name));
                }
            });
        });
    }
    
    uniqueExercises.forEach(exName => {
        const option = document.createElement('option');
        option.value = exName;
        option.textContent = exName;
        exerciseSelect.appendChild(option);
    });

    renderWorkoutHistory();
    renderProgressChart("");
    renderVolumeChart(completedWorkouts);
    renderConsistencyCalendar(completedWorkouts);
}

function renderVolumeChart(completedWorkouts) {
    const ctx = document.getElementById('volume-chart').getContext('2d');
    if (state.volumeChart) state.volumeChart.destroy();
    const volumeByMuscle = {};
    completedWorkouts.forEach(day => {
        day.exercises.forEach(ex => {
            const muscle = utils.capitalize(ex.muscle);
            if (!volumeByMuscle[muscle]) volumeByMuscle[muscle] = 0;
            volumeByMuscle[muscle] += ex.totalVolume || 0;
        });
    });
    const unitLabel = state.settings.units.toUpperCase();
    state.volumeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(volumeByMuscle),
            datasets: [{
                label: `Total Volume (${unitLabel})`,
                data: Object.values(volumeByMuscle),
                backgroundColor: 'rgba(255, 122, 0, 0.5)',
                borderColor: 'var(--color-accent-primary)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { y: { ticks: { color: 'var(--color-text-secondary)' }, grid: { display: false } }, x: { ticks: { color: 'var(--color-text-secondary)' }, grid: { color: 'var(--color-border-primary)' } } },
            plugins: { legend: { display: false } }
        }
    });
}

function renderConsistencyCalendar(completedWorkouts) {
    const calendarEl = document.getElementById('consistency-calendar');
    calendarEl.innerHTML = '';
    const completedDates = new Set(completedWorkouts.map(w => new Date(w.completedDate).toDateString()));
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    calendarEl.innerHTML += `<div class="calendar-header">${today.toLocaleString('default', { month: 'long' })} ${year}</div>`;
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    daysOfWeek.forEach(day => { calendarEl.innerHTML += `<div class="calendar-day-name">${day}</div>`; });
    for (let i = 0; i < firstDay; i++) { calendarEl.innerHTML += `<div></div>`; }
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        const isCompleted = completedDates.has(date.toDateString());
        calendarEl.innerHTML += `<div class="calendar-day ${isCompleted ? 'completed' : ''}">${i}</div>`;
    }
}

export function renderProgressChart(exerciseName) {
    const ctx = document.getElementById('progress-chart').getContext('2d');
    if (state.progressChart) state.progressChart.destroy();
    if (!exerciseName) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); return; }
    const labels = [];
    const dataPoints = [];
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    if (activePlan && activePlan.weeks) {
         Object.values(activePlan.weeks).forEach((week, weekIndex) => {
            Object.values(week).forEach(day => {
                if (day.completed) {
                    const exercise = day.exercises.find(ex => ex.name === exerciseName);
                    if (exercise && exercise.sets?.length > 0) {
                        const maxWeight = Math.max(...exercise.sets.map(s => s.weight || 0));
                        if (maxWeight > 0) {
                            labels.push(`W${weekIndex + 1}`);
                            dataPoints.push(maxWeight);
                        }
                    }
                }
            });
        });
    }
    const unitLabel = state.settings.units.toUpperCase();
    state.progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Max Weight for ${exerciseName} (${unitLabel})`,
                data: dataPoints,
                borderColor: 'var(--color-accent-primary)',
                backgroundColor: 'rgba(255, 122, 0, 0.2)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { color: 'var(--color-text-secondary)' }, grid: { color: 'var(--color-border-primary)' } }, x: { ticks: { color: 'var(--color-text-secondary)' }, grid: { color: 'var(--color-border-primary)' } } },
            plugins: { legend: { labels: { color: 'var(--color-text-primary)' } } }
        }
    });
}

export function renderWorkoutSummary() {
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    if (!activePlan) return;

    const totalSeconds = state.workoutTimer.elapsed;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    document.getElementById('summary-time').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('summary-volume').textContent = `${state.workoutSummary.totalVolume || 0} ${state.settings.units}`;
    document.getElementById('summary-sets').textContent = state.workoutSummary.totalSets || 0;
    document.getElementById('summary-prs').textContent = 0;

    const suggestionContainer = document.getElementById('summary-progression-list');
    if (state.workoutSummary.suggestions && state.workoutSummary.suggestions.length > 0) {
        suggestionContainer.innerHTML = state.workoutSummary.suggestions.map(s => `
            <div class="summary-item">
                <h4>${s.exerciseName}</h4>
                <p>${s.suggestion}</p>
            </div>
        `).join('');
    } else {
        suggestionContainer.innerHTML = `<p class="placeholder-text">No specific progression suggestions for next week. Keep up the great work!</p>`;
    }
}

// --- MODAL, THEME, & TIMER ---

export function showModal(title, message, buttons = [], layout = 'horizontal') {
    elements.modalBody.innerHTML = `<h2>${title}</h2><div>${message}</div>`;
    elements.modalActions.innerHTML = '';
    elements.modalActions.className = `modal-actions ${layout}`;

    if (buttons.length === 0) {
        buttons.push({ text: 'OK', class: 'cta-button', action: closeModal });
    }
    
    buttons.forEach(btnInfo => {
        const button = document.createElement('button');
        button.textContent = btnInfo.text;
        button.className = btnInfo.class + ' animated-button';
        button.addEventListener('click', (e) => {
            if (btnInfo.action) btnInfo.action(e);
            if (!btnInfo.noClose) closeModal();
        });
        elements.modalActions.appendChild(button);
    });
    elements.modal.classList.add('active');
}

export function closeModal() {
    elements.modal.classList.remove('active');
}

export function applyTheme() {
    document.body.dataset.theme = state.settings.theme;
}

export function updateStopwatchDisplay() {
    const totalSeconds = state.workoutTimer.isRunning 
        ? state.workoutTimer.elapsed + Math.floor((Date.now() - state.workoutTimer.startTime) / 1000) 
        : state.workoutTimer.elapsed;

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    elements.workoutStopwatchDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function updateRestTimerDisplay() {
    const minutes = Math.floor(state.restTimer.remaining / 60);
    const seconds = state.restTimer.remaining % 60;
    elements.restTimerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// --- ONBOARDING WIZARD ---

export function renderOnboardingStep() {
    const { currentStep } = state.onboarding;
    const allSteps = document.querySelectorAll('#onboarding-container .step');
    
    allSteps.forEach(step => step.classList.remove('fade-out'));

    allSteps.forEach(step => {
        step.classList.toggle('active', parseInt(step.dataset.step) === currentStep);
    });

    updateOnboardingProgress();
}

export function updateOnboardingProgress() {
    const { currentStep, totalSteps } = state.onboarding;
    const progressPercent = (currentStep - 1) / (totalSteps - 1) * 100;
    const progressBar = document.getElementById('onboarding-progress');
    if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
    }
}

// --- CUSTOM PLAN WIZARD ---

export const customPlanWizard = {
    config: {},
    render() {
        const contentEl = document.getElementById('custom-wizard-content');
        contentEl.innerHTML = `
            <div class="settings-section">
                <h3>How many days per week do you want to train?</h3>
                <div class="card-group">
                    ${[2,3,4,5,6].map(d => `<div class="goal-card day-card" data-value="${d}" role="button" tabindex="0"><h3>${d} Days</h3></div>`).join('')}
                </div>
            </div>
            <div class="settings-section">
                <h3>What is your primary training goal?</h3>
                <div class="card-group settings-card-group">
                    <div class="goal-card focus-card" data-value="strength" role="button" tabindex="0"><div class="icon">🏋️</div><h3>Get Strong</h3></div>
                    <div class="goal-card focus-card" data-value="muscle" role="button" tabindex="0"><div class="icon">💪</div><h3>Build Muscle</h3></div>
                    <div class="goal-card focus-card" data-value="endurance" role="button" tabindex="0"><div class="icon">🏃</div><h3>Muscular Endurance</h3></div>
                    <div class="goal-card focus-card" data-value="hybrid" role="button" tabindex="0"><div class="icon">🔥</div><h3>Hybrid</h3></div>
                </div>
            </div>
            <div class="settings-section">
                <h3 id="priority-muscles-title">Any priority muscles? (Select up to 2)</h3>
                <div class="card-group">
                    ${['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Biceps', 'Triceps', 'Glutes', 'Traps', 'Calves'].map(m => `<div class="goal-card muscle-card" data-value="${m}" role="button" tabindex="0"><h3>${m}</h3></div>`).join('')}
                </div>
            </div>
            <div class="wizard-actions">
                <button class="cta-button animated-button" data-action="finishWizard">Generate My Plan</button>
            </div>
        `;
    },
    getPriorityMuscleLimit() {
        const experience = state.userSelections.experience;
        const days = this.config.days || 0;
        if (days >= 6 && (experience === 'experienced' || experience === 'advanced')) return 4;
        if (days >= 4 && (experience === 'experienced' || experience === 'advanced')) return 3;
        return 2;
    },
    updatePriorityMuscleLimit() {
        const limit = this.getPriorityMuscleLimit();
        document.getElementById('priority-muscles-title').textContent = `Any priority muscles? (Select up to ${limit})`;
        const selected = this.config.priorityMusacles || [];
        if (selected.length > limit) {
            this.config.priorityMuscles = selected.slice(0, limit);
            document.querySelectorAll('.muscle-card.active').forEach(card => {
                if (!this.config.priorityMuscles.includes(card.dataset.value)) {
                    card.classList.remove('active');
                }
            });
        }
    },
    finish() {
        if (!this.config.days || !this.config.focus) {
            showModal("Incomplete", "Please select your training days and primary goal.");
            return;
        }
        const generatedPlan = planGenerator.generate(
            {
                experience: state.userSelections.experience,
                goal: this.config.focus,
                style: state.userSelections.style,
                days: this.config.days,
                priorityMuscles: this.config.priorityMuscles || []
            },
            state.exercises,
            true
        );
        state.builderPlan = generatedPlan.builderPlan;
        elements.builderTitle.textContent = "Your Custom Plan";
        showView('builder');
    }
};
