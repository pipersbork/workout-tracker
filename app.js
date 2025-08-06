document.addEventListener('DOMContentLoaded', () => {

    const app = {
        state: {
            currentStep: 1,
            totalSteps: 4,
            userSelections: { 
                goal: "muscle", 
                experience: "beginner", 
                style: "gym", 
                days: "3", 
            },
            settings: {
                units: 'lbs', // 'lbs' or 'kg'
                theme: 'dark', // 'dark' or 'light'
                progressionModel: 'linear', // 'linear' or 'double'
                weightIncrement: 5, // 2.5, 5, 10
            },
            plan: null,
            currentView: { week: 1, day: 1 },
            builderPlan: {
                days: [] 
            },
            allPlans: [],
            exercises: [],
            progressChart: null,
        },

        elements: {
            onboardingContainer: document.getElementById('onboarding-container'),
            homeScreen: document.getElementById('home-screen'),
            workoutView: document.getElementById('daily-workout-view'),
            builderView: document.getElementById('builder-view'),
            performanceSummaryView: document.getElementById('performance-summary-view'),
            settingsView: document.getElementById('settings-view'),
            scheduleContainer: document.getElementById('schedule-container'),
            progress: document.querySelector('.progress'),
            modal: document.getElementById('modal'),
            modalBody: document.getElementById('modal-body'),
        },

        async init() {
            await this.loadExercises();
            this.loadStateFromStorage();
            this.addEventListeners();
            this.applyTheme();

            // Initial view logic based on history or onboarding status
            const initialView = history.state ? history.state.view : (localStorage.getItem("onboardingCompleted") ? 'home' : 'onboarding');
            this.showView(initialView, true); // true to prevent pushing a new history state
        },


        async loadExercises() {
            try {
                const response = await fetch('exercises.json');
                if (!response.ok) throw new Error('Network response was not ok.');
                this.state.exercises = await response.json();
            } catch (error) {
                console.error("Failed to load exercises.json:", error);
                this.state.exercises = [];
            }
        },

        loadStateFromStorage() {
            const completed = localStorage.getItem("onboardingCompleted");
            if (completed) {
                this.state.userSelections = JSON.parse(localStorage.getItem("userSelections")) || this.state.userSelections;
                this.state.settings = { ...this.state.settings, ...JSON.parse(localStorage.getItem("settings")) };
                this.state.allPlans = JSON.parse(localStorage.getItem("savedPlans")) || [];
                const savedView = JSON.parse(localStorage.getItem("currentView"));
                if (savedView) this.state.currentView = savedView;
                if (this.state.allPlans.length > 0) this.state.plan = this.state.allPlans[0];
            }
        },

        saveStateToStorage() {
            localStorage.setItem("onboardingCompleted", "true");
            localStorage.setItem("userSelections", JSON.stringify(this.state.userSelections));
            localStorage.setItem("settings", JSON.stringify(this.state.settings));
            if (this.state.plan) {
                const planIndex = this.state.allPlans.findIndex(p => p.id === this.state.plan.id);
                if (planIndex > -1) this.state.allPlans[planIndex] = this.state.plan;
                else this.state.allPlans.push(this.state.plan);
            }
            localStorage.setItem("savedPlans", JSON.stringify(this.state.allPlans));
            localStorage.setItem("currentView", JSON.stringify(this.state.currentView));
        },

        addEventListeners() {
            // Onboarding
            document.getElementById('beginOnboardingBtn')?.addEventListener('click', () => this.nextStep());
            document.getElementById('goalNextBtn')?.addEventListener('click', () => this.validateAndProceed('goal'));
            document.getElementById('experienceNextBtn')?.addEventListener('click', () => this.validateAndProceed('experience'));
            document.getElementById('finishOnboardingBtn')?.addEventListener('click', () => {
                if (this.validateStep('style') && this.validateStep('days')) this.finishOnboarding();
            });
            document.querySelectorAll('.back-btn-onboarding').forEach(button => button.addEventListener('click', () => this.previousStep()));
            
            // Home Screen
            document.getElementById('startWorkoutBtn')?.addEventListener('click', () => this.showView('workout'));
            document.getElementById('planMesoBtn')?.addEventListener('click', () => this.showView('builder'));
            document.getElementById('reviewWorkoutsBtn')?.addEventListener('click', () => this.showView('performanceSummary'));
            document.getElementById('settingsBtn')?.addEventListener('click', () => this.showView('settings'));

            // Back Buttons (within app UI)
            document.getElementById('backToHomeBtn')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromBuilder')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromSummary')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromSettings')?.addEventListener('click', () => this.showView('home'));

            // NEW: Browser navigation handler
            window.addEventListener('popstate', (event) => {
                if (event.state && event.state.view) {
                    this.showView(event.state.view, true); // true to prevent pushing another history state
                } else {
                    // Fallback for initial state or unexpected null state
                    this.showView(localStorage.getItem("onboardingCompleted") ? 'home' : 'onboarding', true);
                }
            });

            // Builder
            document.getElementById('add-day-btn')?.addEventListener('click', () => this.addDayToBuilder());
            document.getElementById('done-planning-btn')?.addEventListener('click', () => this.openMesoLengthModal());
            this.elements.scheduleContainer.addEventListener('click', (e) => {
                const { dayIndex, muscleIndex, focus } = e.target.dataset;
                if (e.target.matches('.add-muscle-group-btn')) this.addMuscleGroupToDay(dayIndex);
                if (e.target.matches('.delete-day-btn')) this.deleteDayFromBuilder(dayIndex);
                if (e.target.matches('.delete-muscle-group-btn')) this.deleteMuscleGroupFromDay(dayIndex, muscleIndex);
                if (e.target.matches('.focus-btn')) this.updateMuscleFocus(dayIndex, muscleIndex, focus);
            });
            this.elements.scheduleContainer.addEventListener('change', (e) => {
                const { dayIndex, muscleIndex, exerciseSelectIndex } = e.target.dataset;
                if (e.target.matches('.day-label-selector')) this.updateDayLabel(dayIndex, e.target.value);
                if (e.target.matches('.muscle-select')) this.updateMuscleGroup(dayIndex, muscleIndex, e.target.value);
                if (e.target.matches('.exercise-select')) this.updateExerciseSelection(dayIndex, muscleIndex, exerciseSelectIndex, e.target.value);
            });

            // Modal
            this.elements.modal.addEventListener('click', (e) => {
                if (e.target.matches('.close-btn')) this.closeModal();
                if (e.target.matches('.meso-length-card')) {
                    const length = e.target.dataset.value;
                    this.closeModal();
                    if (confirm('Are you sure you want to proceed with this work routine?')) this.finalizeAndStartPlan(length);
                }
            });

            // Card Selections
            document.querySelectorAll('.card-group').forEach(group => {
                group.addEventListener('click', (e) => {
                    const card = e.target.closest('.goal-card');
                    if (card) {
                        const field = card.closest('.card-group').dataset.field;
                        const value = card.dataset.value;
                        this.selectCard(card, field, value);
                        if (field === 'goal' || field === 'experience') this.saveStateToStorage();
                    }
                });
            });

            // Workout View
            this.elements.workoutView.addEventListener('click', (e) => {
                if (e.target.matches('.add-set-btn')) this.addSet(e.target.dataset.exerciseIndex);
                if (e.target.matches('#complete-workout-btn')) this.completeWorkout();
            });
            this.elements.workoutView.addEventListener('input', (e) => {
                if(e.target.matches('.weight-input, .reps-input, .rir-input')) this.handleSetInput(e.target);
            });
            
            // Performance Summary
            document.getElementById('exercise-tracker-select')?.addEventListener('change', (e) => this.renderProgressChart(e.target.value));

            // Settings Toggles
            document.getElementById('units-lbs-btn')?.addEventListener('click', () => this.setUnits('lbs'));
            document.getElementById('units-kg-btn')?.addEventListener('click', () => this.setUnits('kg'));
            document.getElementById('theme-dark-btn')?.addEventListener('click', () => this.setTheme('dark'));
            document.getElementById('theme-light-btn')?.addEventListener('click', () => this.setTheme('light'));
            document.getElementById('prog-linear-btn')?.addEventListener('click', () => this.setProgressionModel('linear'));
            document.getElementById('prog-double-btn')?.addEventListener('click', () => this.setProgressionModel('double'));
            document.getElementById('weight-increment-switch')?.addEventListener('click', (e) => {
                if (e.target.matches('.toggle-btn')) {
                    this.setWeightIncrement(parseFloat(e.target.dataset.increment));
                }
            });
        },
        
        openMesoLengthModal() {
            const modalBody = this.elements.modalBody;
            modalBody.innerHTML = `
                <h2>Select Mesocycle Length</h2>
                <p>How many weeks should this training block last? (This includes a 1-week deload at the end)</p>
                <div class="card-group">
                    <div class="goal-card meso-length-card" data-value="4" role="button" tabindex="0"><h3>4</h3><p>Short</p></div>
                    <div class="goal-card meso-length-card" data-value="6" role="button" tabindex="0"><h3>6</h3><p>Standard</p></div>
                    <div class="goal-card meso-length-card" data-value="8" role="button" tabindex="0"><h3>8</h3><p>Long</p></div>
                    <div class="goal-card meso-length-card" data-value="12" role="button" tabindex="0"><h3>12</h3><p>Extended</p></div>
                </div>
            `;
            this.elements.modal.classList.remove('hidden');
        },

        closeModal() {
            this.elements.modal.classList.add('hidden');
        },

        showView(viewName, isPoppedState = false) {
            // Hide all container views
            Object.values(this.elements).forEach(el => {
                if (el && el.classList && el.classList.contains('container')) {
                    el.classList.add('hidden');
                }
            });

            // Show the correct view
            const viewElement = this.elements[`${viewName}View`] || this.elements[`${viewName}Container`] || this.elements.homeScreen;
            viewElement.classList.remove('hidden');
            
            // Run view-specific render functions
            if (viewName === 'onboarding') this.showStep(this.state.currentStep);
            if (viewName === 'workout') this.renderDailyWorkout(this.state.currentView.week, this.state.currentView.day);
            if (viewName === 'builder') this.renderBuilder();
            if (viewName === 'performanceSummary') this.renderPerformanceSummary();
            if (viewName === 'settings') this.renderSettings();

            // UPDATED: Manage browser history
            if (!isPoppedState) {
                history.pushState({ view: viewName }, '', `#${viewName}`);
            }
        },
        
        // --- SETTINGS METHODS ---
        renderSettings() {
            document.querySelectorAll('#settings-goal-cards .goal-card').forEach(card => card.classList.toggle('active', card.dataset.value === this.state.userSelections.goal));
            document.querySelectorAll('#settings-experience-cards .goal-card').forEach(card => card.classList.toggle('active', card.dataset.value === this.state.userSelections.experience));
            document.getElementById('units-lbs-btn').classList.toggle('active', this.state.settings.units === 'lbs');
            document.getElementById('units-kg-btn').classList.toggle('active', this.state.settings.units === 'kg');
            document.getElementById('theme-dark-btn').classList.toggle('active', this.state.settings.theme === 'dark');
            document.getElementById('theme-light-btn').classList.toggle('active', this.state.settings.theme === 'light');
            document.getElementById('prog-linear-btn').classList.toggle('active', this.state.settings.progressionModel === 'linear');
            document.getElementById('prog-double-btn').classList.toggle('active', this.state.settings.progressionModel === 'double');
            document.querySelectorAll('#weight-increment-switch .toggle-btn').forEach(btn => {
                btn.classList.toggle('active', parseFloat(btn.dataset.increment) === this.state.settings.weightIncrement);
            });
        },
        setUnits(unit) {
            this.state.settings.units = unit;
            this.saveStateToStorage();
            this.renderSettings();
            if (!this.elements.workoutView.classList.contains('hidden')) {
                this.renderDailyWorkout(this.state.currentView.week, this.state.currentView.day);
            }
        },
        setTheme(theme) {
            this.state.settings.theme = theme;
            this.applyTheme();
            this.saveStateToStorage();
            this.renderSettings();
        },
        applyTheme() { document.body.dataset.theme = this.state.settings.theme; },
        setProgressionModel(model) {
            this.state.settings.progressionModel = model;
            this.saveStateToStorage();
            this.renderSettings();
        },
        setWeightIncrement(increment) {
            this.state.settings.weightIncrement = increment;
            this.saveStateToStorage();
            this.renderSettings();
        },

        // --- BUILDER METHODS ---
        renderBuilder() {
            const container = this.elements.scheduleContainer;
            container.innerHTML = ''; 
            if (this.state.builderPlan.days.length === 0) {
                container.innerHTML = `<p class="placeholder-text">Click "Add a Day" to start building your schedule.</p>`;
                return;
            }
            const muscleList = ['Select a Muscle', 'Rest Day 🧘', ...new Set(this.state.exercises.map(ex => ex.muscle))];
            const muscleOptions = muscleList.map(m => `<option value="${m.toLowerCase().replace(' 🧘', '').replace(/ /g, '')}">${m}</option>`).join('');
            const exerciseSlotsByFocus = { 'Primary': 3, 'Secondary': 2, 'Maintenance': 1 };
            this.state.builderPlan.days.forEach((day, dayIndex) => {
                const dayCard = document.createElement('div');
                dayCard.className = 'day-card';
                const muscleGroupsHTML = day.muscleGroups.map((mg, muscleIndex) => {
                    const exercisesForMuscle = this.state.exercises.filter(ex => ex.muscle.toLowerCase() === mg.muscle);
                    const exerciseOptions = [{name: 'Select an Exercise'}, ...exercisesForMuscle].map(ex => `<option value="${ex.name}">${ex.name}</option>`).join('');
                    const numSlots = exerciseSlotsByFocus[mg.focus] || 3;
                    const exerciseDropdowns = Array.from({ length: numSlots }).map((_, exerciseSelectIndex) => `
                        <select class="builder-select exercise-select" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" data-exercise-select-index="${exerciseSelectIndex}">
                            ${exerciseOptions.replace(`value="${mg.exercises[exerciseSelectIndex]}"`, `value="${mg.exercises[exerciseSelectIndex]}" selected`)}
                        </select>
                    `).join('');
                    const focusButtons = ['Primary', 'Secondary', 'Maintenance'].map(focusLevel => `
                        <button class="focus-btn ${mg.focus === focusLevel ? 'active' : ''}" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" data-focus="${focusLevel}">
                            ${focusLevel}
                        </button>
                    `).join('');
                    const isRestDay = mg.muscle === 'restday';
                    return `
                        <div class="muscle-group-block">
                            <div class="muscle-group-header">
                                <div class="muscle-group-selectors">
                                    <select class="builder-select muscle-select" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}">
                                        ${muscleOptions.replace(`value="${mg.muscle}"`, `value="${mg.muscle}" selected`)}
                                    </select>
                                    ${!isRestDay ? `<div class="focus-buttons">${focusButtons}</div>` : ''}
                                </div>
                                <button class="delete-btn delete-muscle-group-btn" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}">🗑️</button>
                            </div>
                            ${!isRestDay && mg.muscle !== 'selectamuscle' ? `<div class="exercise-selection-group"><label>Exercises:</label>${exerciseDropdowns}</div>` : ''}
                        </div>
                    `;
                }).join('');
                dayCard.innerHTML = `
                    <div class="day-header">
                        <select class="builder-select day-label-selector" data-day-index="${dayIndex}">
                            <option>Add a label</option>
                            <option ${day.label === 'Monday' ? 'selected' : ''}>Monday</option>
                            <option ${day.label === 'Tuesday' ? 'selected' : ''}>Tuesday</option>
                            <option ${day.label === 'Wednesday' ? 'selected' : ''}>Wednesday</option>
                            <option ${day.label === 'Thursday' ? 'selected' : ''}>Thursday</option>
                            <option ${day.label === 'Friday' ? 'selected' : ''}>Friday</option>
                            <option ${day.label === 'Saturday' ? 'selected' : ''}>Saturday</option>
                            <option ${day.label === 'Sunday' ? 'selected' : ''}>Sunday</option>
                        </select>
                        <button class="delete-btn delete-day-btn" data-day-index="${dayIndex}">🗑️</button>
                    </div>
                    <div class="day-content">
                        ${muscleGroupsHTML}
                        <button class="cta-button secondary-button add-muscle-group-btn" data-day-index="${dayIndex}">+ Add a Muscle Group</button>
                    </div>
                `;
                container.appendChild(dayCard);
            });
        },
        addDayToBuilder() { 
            this.state.builderPlan.days.push({ 
                label: 'Add a label', 
                muscleGroups: [{ muscle: 'selectamuscle', focus: 'Primary', exercises: ['', '', ''] }] 
            }); 
            this.renderBuilder(); 
        },
        deleteDayFromBuilder(dayIndex) { this.state.builderPlan.days.splice(dayIndex, 1); this.renderBuilder(); },
        updateDayLabel(dayIndex, newLabel) { this.state.builderPlan.days[dayIndex].label = newLabel; },
        addMuscleGroupToDay(dayIndex) { 
            this.state.builderPlan.days[dayIndex].muscleGroups.push({ muscle: 'selectamuscle', focus: 'Primary', exercises: ['', '', ''] }); 
            this.renderBuilder(); 
        },
        deleteMuscleGroupFromDay(dayIndex, muscleIndex) { this.state.builderPlan.days[dayIndex].muscleGroups.splice(muscleIndex, 1); this.renderBuilder(); },
        updateMuscleGroup(dayIndex, muscleIndex, newMuscle) { 
            this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].muscle = newMuscle; 
            this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises = ['', '', '']; 
            this.renderBuilder(); 
        },
        updateMuscleFocus(dayIndex, muscleIndex, newFocus) { 
            this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].focus = newFocus; 
            this.renderBuilder();
        },
        updateExerciseSelection(dayIndex, muscleIndex, exerciseSelectIndex, newExercise) { this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises[exerciseSelectIndex] = newExercise; },
        
        finalizeAndStartPlan(mesoLength) {
            if (this.state.builderPlan.days.length === 0) {
                alert("Please add at least one day to your plan before saving.");
                return;
            }
            const newMeso = { id: `meso_${Date.now()}`, startDate: new Date().toISOString(), durationWeeks: parseInt(mesoLength) || 6, goal: 'custom', experience: this.state.userSelections.experience, weeks: {} };
            const focusSetMap = { 'Primary': 5, 'Secondary': 4, 'Maintenance': 2 };
            for (let i = 1; i <= newMeso.durationWeeks; i++) {
                newMeso.weeks[i] = {};
                const isDeload = (i === newMeso.durationWeeks);
                this.state.builderPlan.days.forEach((day, dayIndex) => {
                    newMeso.weeks[i][dayIndex + 1] = {
                        name: day.label === 'Add a label' ? `Day ${dayIndex + 1}` : day.label,
                        completed: false,
                        exercises: day.muscleGroups
                            .filter(mg => mg.muscle !== 'restday')
                            .flatMap(mg => 
                                mg.exercises.filter(ex => ex && ex !== 'Select an Exercise').map(exName => {
                                    const exerciseDetails = this.state.exercises.find(e => e.name === exName) || {};
                                    const setsPerExercise = focusSetMap[mg.focus] || 3;
                                    return {
                                        exerciseId: `ex_${exName.replace(/\s+/g, '_')}`, name: exName, muscle: exerciseDetails.muscle || 'Unknown', type: mg.focus,
                                        targetSets: isDeload ? Math.ceil(setsPerExercise / 2) : setsPerExercise,
                                        targetRepRange: [8, 12],
                                        targetReps: 10, targetRIR: isDeload ? 4 : 2, targetLoad: null, sets: []
                                    };
                                })
                        )
                    };
                });
            }
            this.state.plan = newMeso;
            this.state.allPlans = [newMeso];
            this.state.currentView = { week: 1, day: 1 };
            this.saveStateToStorage();
            this.showView('home');
        },
        
        // --- ONBOARDING METHODS ---
        showStep(stepNumber) {
            document.querySelectorAll('.step.active').forEach(step => step.classList.remove('active'));
            document.getElementById(`step${stepNumber}`)?.classList.add('active');
            this.updateProgress();
        },
        updateProgress() {
            const percentage = ((this.state.currentStep - 1) / (this.state.totalSteps - 1)) * 100;
            this.elements.progress.style.width = `${percentage}%`;
        },
        nextStep() { if (this.state.currentStep < this.state.totalSteps) { this.state.currentStep++; this.showStep(this.state.currentStep); } },
        previousStep() { if (this.state.currentStep > 1) { this.state.currentStep--; this.showStep(this.state.currentStep); } },
        validateStep(field) {
            if (!this.state.userSelections[field]) { alert("Please select an option before continuing."); return false; }
            return true;
        },
        validateAndProceed(field) { if (this.validateStep(field)) this.nextStep(); },
        selectCard(element, field, value) {
            this.state.userSelections[field] = value;
            element.closest('.card-group').querySelectorAll('.goal-card').forEach(card => card.classList.remove('active'));
            element.classList.add('active');
        },
        finishOnboarding() {
            this.state.plan = this.generateMesocycle(this.state.userSelections.goal, this.state.userSelections.experience, this.state.userSelections.days, 6);
            this.state.allPlans.push(this.state.plan);
            this.saveStateToStorage();
            this.showView('home');
        },
        
        // --- PLAN GENERATION & WORKOUT METHODS ---
        getExercisesByMuscle(muscles, count) { /* ... same as before ... */ },
        generateMesocycle(goal, experience, daysPerWeek, mesoLength) { /* ... same as before ... */ },
        renderDailyWorkout(weekNumber, dayNumber) { /* ... same as before ... */ },
        createSetRowHTML(exIndex, setIndex, weight, reps, rir) { /* ... same as before ... */ },
        handleSetInput(inputElement) { /* ... same as before ... */ },
        addSet(exerciseIndex) { /* ... same as before ... */ },
        completeWorkout() { /* ... same as before ... */ },
        calculateNextWeekProgression(completedWeekNumber) { /* ... same as before ... */ },
        renderPerformanceSummary() { /* ... same as before ... */ },
        renderProgressChart(exerciseName) { /* ... same as before ... */ },
        capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""; }
    };
    
    for (const key in app) {
        if (typeof app[key] === 'function') app[key] = app[key].bind(app);
    }
    
    app.init();
});

