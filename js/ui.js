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
    // Updated Timer elements
    workoutStopwatchDisplay: document.getElementById('workout-stopwatch-display'),
    restTimerDisplay: document.getElementById('rest-timer-display'),
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

/**
 * Shows a specific view and hides the current one, with an optional animation.
 * @param {string} viewName - The name of the view to show.
 * @param {boolean} skipAnimation - If true, the transition will be immediate.
 */
export function showView(viewName, skipAnimation = false) {
    // If the user hasn't completed onboarding, force them to the onboarding view
    if (viewName !== 'onboarding' && !state.userSelections.onboardingCompleted) {
        viewName = 'onboarding';
    }

    const currentViewId = viewMap[state.currentViewName];
    const newViewId = viewMap[viewName];
    if (!newViewId) {
        console.error(`View "${viewName}" not found in viewMap.`);
        return;
    }

    const currentViewEl = document.getElementById(currentViewId);
    const newViewEl = document.getElementById(newViewId);
    if (!newViewEl) {
        console.error(`Element with ID "${newViewId}" not found.`);
        return;
    }

    const transition = () => {
        if (currentViewEl) {
            currentViewEl.classList.add('hidden');
            currentViewEl.classList.remove('fade-out');
        }
        newViewEl.classList.remove('hidden');

        // Call the specific render function for the new view
        switch (viewName) {
            case 'home': renderHomeScreen(); break;
            case 'planHub': renderPlanHub(); break;
            case 'templateLibrary': renderTemplateLibrary(); break;
            case 'workout': renderDailyWorkout(); break;
            case 'builder': renderBuilder(); break;
            case 'performanceSummary': renderPerformanceSummary(); break;
            case 'settings': renderSettings(); break;
            case 'customPlanWizard': customPlanWizard.render(); break;
            case 'workoutSummary': renderWorkoutSummary(); break;
            case 'onboarding': renderOnboardingStep(); break;
        }

        state.currentViewName = viewName;
    };

    if (skipAnimation || !currentViewEl || currentViewEl === newViewEl) {
        transition();
    } else {
        currentViewEl.classList.add('fade-out');
        setTimeout(transition, 400); // Match animation duration in CSS
    }
}


// --- RENDER FUNCTIONS ---

/** Renders the main home screen. */
export function renderHomeScreen() {
    const container = document.querySelector('#home-screen .home-nav-buttons');
    container.innerHTML = `
        <button class="hub-option home-nav-btn" data-action="showView" data-view-name="workout">
            <div class="hub-option-icon">▶️</div>
            <div class="hub-option-text"><h3>Start Next Workout</h3></div>
        </button>
        <button class="hub-option home-nav-btn" data-action="showView" data-view-name="planHub">
            <div class="hub-option-icon">📖</div>
            <div class="hub-option-text"><h3>Plan Mesocycle</h3></div>
        </button>
        <button class="hub-option home-nav-btn" data-action="showView" data-view-name="performanceSummary">
            <div class="hub-option-icon">📊</div>
            <div class="hub-option-text"><h3>Performance Summary</h3></div>
        </button>
    `;

    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    if (activePlan) {
        elements.activePlanDisplay.textContent = `Active Plan: ${activePlan.name}`;
    } else {
        elements.activePlanDisplay.textContent = 'No active plan. Create one!';
    }
}

/** Renders the plan hub view. */
export function renderPlanHub() {
    const container = document.getElementById('plan-hub-options');
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    let optionsHTML = `
        <button class="hub-option" data-hub-action="template">
            <div class="hub-option-icon">📖</div>
            <div class="hub-option-text"><h3>Start with a Template</h3><p>Choose from dozens of evidence-based templates.</p></div>
        </button>
        <button class="hub-option" data-hub-action="scratch">
            <div class="hub-option-icon">✏️</div>
            <div class="hub-option-text"><h3>Start from Scratch</h3><p>Use the wizard to design your own custom plan.</p></div>
        </button>
    `;
    if (activePlan) {
        optionsHTML = `
            <button class="hub-option" data-hub-action="resume">
                <div class="hub-option-icon">▶️</div>
                <div class="hub-option-text"><h3>Resume Current Plan</h3><p>Pick up where you left off on "${activePlan.name}".p></div>
            </button>
            <button class="hub-option" data-hub-action="copy">
                <div class="hub-option-icon">🔁</div>
                <div class="hub-option-text"><h3>Copy a Mesocycle</h3><p>Start a new plan based on a previous one.</p></div>
            </button>
        ` + optionsHTML;
    }
    container.innerHTML = optionsHTML;
}

/** Renders the template library view. */
export function renderTemplateLibrary() {
    const container = document.getElementById('template-list-container');
    const progressionTemplates = planGenerator.getAllTemplates ? planGenerator.getAllTemplates() : [];

    let templatesHTML = progressionTemplates.map(template => `
        <div class="hub-option" data-action="selectTemplate" data-template-id="${template.id}">
            <div class="hub-option-icon">${template.icon}</div>
            <div class="hub-option-text"><h3>${template.name}</h3><p>${template.description}</p></div>
        </div>
    `).join('');

    container.innerHTML = templatesHTML || '<p class="placeholder-text">No templates available.</p>';
}

/** Renders the workout builder view. */
export function renderBuilder() {
    const container = elements.scheduleContainer;
    container.innerHTML = '';
    if (state.builderPlan.days.length === 0) {
        container.innerHTML = `<p class="placeholder-text">Click "Add a Day" to start building your schedule.</p>`;
        return;
    }
    const muscleList = ['Select a Muscle', 'Rest Day', ...new Set(state.exercises.map(ex => ex.muscle))];
    const muscleOptions = muscleList.map(m => `<option value="${m.toLowerCase().replace(/ /g, '')}">${m === 'Rest Day' ? m + ' 🌙' : m}</option>`).join('');
    const exerciseSlotsByFocus = { 'Primary': 3, 'Secondary': 2, 'Maintenance': 1 };

    state.builderPlan.days.forEach((day, dayIndex) => {
        const dayCard = document.createElement('div');
        dayCard.className = `day-card ${day.isExpanded ? 'expanded' : 'collapsed'}`;
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
                        <button class="delete-btn delete-muscle-group-btn" data-muscle-index="${muscleIndex}" aria-label="Delete muscle group"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                    ${!isRestDay && mg.muscle !== 'selectamuscle' ? `<div class="exercise-selection-group"><label>Exercises:</label>${exerciseDropdowns}</div>` : ''}
                </div>
            `;
        }).join('');

        dayCard.innerHTML = `
            <div class="day-header">
                <select class="builder-select day-label-selector" data-day-index="${dayIndex}">
                    <option>Add a label</option><option ${day.label === 'Monday' ? 'selected' : ''}>Monday</option><option ${day.label === 'Tuesday' ? 'selected' : ''}>Tuesday</option><option ${day.label === 'Wednesday' ? 'selected' : ''}>Wednesday</option><option ${day.label === 'Thursday' ? 'selected' : ''}>Thursday</option><option ${day.label === 'Friday' ? 'selected' : ''}>Friday</option><option ${day.label === 'Saturday' ? 'selected' : ''}>Saturday</option><option ${day.label === 'Sunday' ? 'selected' : ''}>Sunday</option>
                </select>
                <button class="delete-btn delete-day-btn" aria-label="Delete day"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            </div>
            <div class="day-content">${muscleGroupsHTML}<button class="cta-button secondary-button add-muscle-group-btn">+ Add a Muscle Group</button></div>
        `;
        container.appendChild(dayCard);
    });
}

/** Renders the settings view. */
export function renderSettings() {
    const goalCardsContainer = document.getElementById('settings-goal-cards');
    goalCardsContainer.innerHTML = `
        <div class="goal-card" data-action="selectCard" data-field="goal" data-should-save="true" data-value="strength" role="button" tabindex="0"><div class="icon">🏋️</div><h3>Get Strong</h3></div>
        <div class="goal-card" data-action="selectCard" data-field="goal" data-should-save="true" data-value="muscle" role="button" tabindex="0"><div class="icon">💪</div><h3>Build Muscle</h3></div>
        <div class="goal-card" data-action="selectCard" data-field="goal" data-should-save="true" data-value="endurance" role="button" tabindex="0"><div class="icon">🏃</div><h3>Muscular Endurance</h3></div>
        <div class="goal-card" data-action="selectCard" data-field="goal" data-should-save="true" data-value="cardio" role="button" tabindex="0"><div class="icon">🔥</div><h3>Cardio Endurance</h3></div>
    `;

    const experienceCardsContainer = document.getElementById('settings-experience-cards');
    experienceCardsContainer.innerHTML = `
        <div class="goal-card" data-action="selectCard" data-field="experience" data-should-save="true" data-value="beginner" role="button" tabindex="0"><div class="icon">🌱</div><h3>Beginner</h3></div>
        <div class="goal-card" data-action="selectCard" data-field="experience" data-should-save="true" data-value="experienced" role="button" tabindex="0"><div class="icon">⚡️</div><h3>Experienced</h3></div>
        <div class="goal-card" data-action="selectCard" data-field="experience" data-should-save="true" data-value="advanced" role="button" tabindex="0"><div class="icon">🔥</div><h3>Advanced</h3></div>
    `;

    goalCardsContainer.querySelector(`.goal-card[data-value="${state.userSelections.goal}"]`)?.classList.add('active');
    experienceCardsContainer.querySelector(`.goal-card[data-value="${state.userSelections.experience}"]`)?.classList.add('active');
    
    document.querySelectorAll('[data-action="setUnits"]').forEach(btn => btn.classList.toggle('active', btn.dataset.unit === state.settings.units));
    document.querySelectorAll('[data-action="setTheme"]').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === state.settings.theme));
    document.querySelectorAll('[data-action="setProgressionModel"]').forEach(btn => btn.classList.toggle('active', btn.dataset.progression === state.settings.progressionModel));
    document.querySelectorAll('[data-action="setWeightIncrement"]').forEach(btn => btn.classList.toggle('active', parseFloat(btn.dataset.increment) === state.settings.weightIncrement));

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
                <span class="plan-name-container">
                    <input type="text" class="plan-name-input hidden" value="${plan.name}" data-plan-id="${plan.id}" />
                    <span class="plan-name-text">${plan.name}</span>
                </span>
                <div class="plan-actions">
                    <button class="plan-btn" data-action="toggleEditPlanName" data-plan-id="${plan.id}">Edit</button>
                    <button class="plan-btn" data-action="openBuilderForEdit" data-plan-id="${plan.id}">Build</button>
                    <button class="plan-btn" data-action="confirmDeletePlan" data-plan-id="${plan.id}">Delete</button>
                    <button class="plan-btn" data-action="setActivePlan" data-plan-id="${plan.id}" ${isActive ? 'disabled' : ''}>${isActive ? 'Active' : 'Set Active'}</button>
                </div>
            `;
            elements.planManagementList.appendChild(planItem);
        });
    }
}

/** Renders the daily workout view. */
export function renderDailyWorkout() {
    const container = document.getElementById('exercise-list-container');
    const workoutTitle = document.getElementById('workout-day-title');
    const workoutDate = document.getElementById('workout-date');
    container.innerHTML = '';
    workoutDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Reset stopwatch when view loads
    state.workoutTimer.elapsed = 0;
    state.workoutTimer.startTime = 0;
    state.workoutTimer.isRunning = false;
    clearInterval(state.workoutTimer.instance);
    updateStopwatchDisplay();

    // Reset rest timer when view loads
    state.restTimer.isRunning = false;
    clearInterval(state.restTimer.instance);
    state.restTimer.remaining = state.restTimer.duration;
    updateRestTimerDisplay();


    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    if (!activePlan) {
        workoutTitle.textContent = "No Active Plan";
        container.innerHTML = `<p class="placeholder-text">Please create and set an active plan in Settings.</p>`;
        document.getElementById('complete-workout-btn').classList.add('hidden');
        return;
    }

    const { week, day } = state.currentView;
    const workout = activePlan.weeks[week]?.[day];
    const lastWeekWorkout = activePlan.weeks[week - 1]?.[day];

    if (!workout) {
        workoutTitle.textContent = "No Workout Today";
        container.innerHTML = `<p class="placeholder-text">You either have no workout scheduled for today or your plan is incomplete.</p>`;
        document.getElementById('complete-workout-btn').classList.add('hidden');
        return;
    }
    document.getElementById('complete-workout-btn').classList.remove('hidden');
    workoutTitle.textContent = workout.name;
    if (workout.exercises.length === 0) {
        container.innerHTML = `<p class="placeholder-text">This is a rest day. Enjoy it!</p>`;
        document.getElementById('complete-workout-btn').classList.remove('hidden');
        return;
    }
    
    workout.exercises.forEach((ex, exIndex) => {
        const lastWeekEx = lastWeekWorkout?.exercises.find(e => e.exerciseId === ex.exerciseId);
        const setsHTML = Array.from({ length: ex.targetSets }).map((_, setIndex) => {
            const set = ex.sets[setIndex] || {};
            const lastWeekSet = lastWeekEx?.sets[setIndex];
            return utils.createSetRowHTML(exIndex, setIndex, set, lastWeekSet, ex.targetReps, ex.targetRIR, week);
        }).join('');

        const exerciseCard = document.createElement('div');
        exerciseCard.className = 'exercise-card';
        exerciseCard.innerHTML = `
            <div class="exercise-card-header">
                <div class="exercise-title-group">
                    <h3>${ex.name}</h3>
                    <button class="swap-exercise-btn" data-action="swapExercise" data-exercise-index="${exIndex}" aria-label="Swap Exercise">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.883L13.865 6.43L18 7.062L14.938 9.938L15.703 14.117L12 12.2L8.297 14.117L9.062 9.938L6 7.062L10.135 6.43L12 2.883z" stroke-width="0" fill="currentColor"/><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1 14H8v-2h3v-3H8V9h3V6h2v3h3v2h-3v3h3v2h-3v3h-2v-3z"/></svg>
                    </button>
                    <button class="history-btn" data-action="showHistory" data-exercise-id="${ex.exerciseId}" aria-label="View History">
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
            <button class="add-set-btn" data-action="addSet" data-exercise-index="${exIndex}">+ Add Set</button>
        `;
        container.appendChild(exerciseCard);
    });
}

/** Renders the workout history list on the performance summary page. */
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

/** Renders the performance summary view and its charts. */
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
    Object.values(activePlan.weeks).forEach(week => {
        Object.values(week).forEach(day => {
            if (day.completed) {
                completedWorkouts.push(day);
                day.exercises.forEach(ex => uniqueExercises.add(ex.name));
            }
        });
    });
    
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

/** Renders the volume chart on the performance summary page. */
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

/** Renders the consistency calendar on the performance summary page. */
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

/** Renders the exercise progress chart on the performance summary page. */
export function renderProgressChart(exerciseName) {
    const ctx = document.getElementById('progress-chart').getContext('2d');
    if (state.progressChart) state.progressChart.destroy();
    if (!exerciseName) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); return; }
    const labels = [];
    const dataPoints = [];
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    if (activePlan) {
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

/** Renders the workout summary screen. */
export function renderWorkoutSummary() {
    const { week, day } = state.currentView;
    const activePlan = state.allPlans.find(p => p.id === state.activePlanId);
    const workout = activePlan.weeks[week]?.[day];

    if (!workout) return;

    const totalSeconds = state.workoutTimer.elapsed;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    const totalVolume = workout.exercises.reduce((sum, ex) => sum + (ex.totalVolume || 0), 0);
    const totalSets = workout.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);

    document.getElementById('summary-time').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('summary-volume').textContent = `${totalVolume} ${state.settings.units}`;
    document.getElementById('summary-sets').textContent = totalSets;
    document.getElementById('summary-prs').textContent = 0; // Placeholder for now

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

/**
 * Displays a modal with a title, message, and customizable buttons.
 * @param {string} title - The title of the modal.
 * @param {string} message - The body content of the modal (can be HTML).
 * @param {Array} buttons - An array of button objects, e.g., [{ text, class, action }].
 * @param {string} layout - The layout for the buttons ('horizontal' or 'vertical').
 */
export function showModal(title, message, buttons = [], layout = 'horizontal') {
    elements.modalBody.innerHTML = `<h2>${title}</h2><p>${message}</p>`;
    elements.modalActions.innerHTML = '';
    elements.modalActions.className = `modal-actions ${layout}`;

    if (buttons.length === 0) {
        buttons.push({ text: 'OK', class: 'cta-button', action: closeModal });
    }
    
    buttons.forEach(btnInfo => {
        const button = document.createElement('button');
        button.textContent = btnInfo.text;
        button.className = btnInfo.class;
        button.addEventListener('click', (e) => {
            if (btnInfo.action) btnInfo.action(e);
            if (!btnInfo.noClose) closeModal();
        });
        elements.modalActions.appendChild(button);
    });
    elements.modal.classList.add('active');
}

/** Closes the currently active modal. */
export function closeModal() {
    elements.modal.classList.remove('active');
}

/** Applies the current theme (dark/light) to the body element. */
export function applyTheme() {
    document.body.dataset.theme = state.settings.theme;
}

/** Updates the workout stopwatch display. */
export function updateStopwatchDisplay() {
    const totalSeconds = state.workoutTimer.isRunning 
        ? state.workoutTimer.elapsed + Math.floor((Date.now() - state.workoutTimer.startTime) / 1000) 
        : state.workoutTimer.elapsed;

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    elements.workoutStopwatchDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Updates the rest timer countdown display. */
export function updateRestTimerDisplay() {
    const minutes = Math.floor(state.restTimer.remaining / 60);
    const seconds = state.restTimer.remaining % 60;
    elements.restTimerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// --- ONBOARDING WIZARD ---

/** Renders the current step of the onboarding wizard. */
export function renderOnboardingStep() {
    const { currentStep } = state.onboarding;
    const allSteps = document.querySelectorAll('#onboarding-container .step');
    
    allSteps.forEach(step => step.classList.remove('fade-out'));

    allSteps.forEach(step => {
        step.classList.toggle('active', parseInt(step.dataset.step) === currentStep);
    });

    updateOnboardingProgress();
}

/** Updates the visual progress bar for the onboarding wizard. */
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
                <button class="cta-button" data-action="finishWizard">Generate My Plan</button>
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
