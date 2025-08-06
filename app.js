document.addEventListener('DOMContentLoaded', () => {

    const app = {
        state: {
            currentStep: 1,
            totalSteps: 4,
            userSelections: { 
                goal: "muscle", 
                experience: "beginner", 
                style: "gym", 
                // REMOVED: days is no longer part of initial user selections
            },
            settings: {
                units: 'lbs',
                theme: 'dark',
                progressionModel: 'linear',
                weightIncrement: 5,
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

            const initialView = history.state ? history.state.view : (localStorage.getItem("onboardingCompleted") ? 'home' : 'onboarding');
            this.showView(initialView, true);
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
            // UPDATED: Validation no longer checks for 'days'
            document.getElementById('finishOnboardingBtn')?.addEventListener('click', () => {
                if (this.validateStep('style')) this.finishOnboarding();
            });
            document.querySelectorAll('.back-btn-onboarding').forEach(button => button.addEventListener('click', () => this.previousStep()));
            
            // Home Screen & Navigation
            document.getElementById('startWorkoutBtn')?.addEventListener('click', () => this.showView('workout'));
            document.getElementById('planMesoBtn')?.addEventListener('click', () => this.showView('builder'));
            document.getElementById('reviewWorkoutsBtn')?.addEventListener('click', () => this.showView('performanceSummary'));
            document.getElementById('settingsBtn')?.addEventListener('click', () => this.showView('settings'));
            document.getElementById('backToHomeBtn')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromBuilder')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromSummary')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromSettings')?.addEventListener('click', () => this.showView('home'));
            window.addEventListener('popstate', (event) => {
                const view = (event.state && event.state.view) ? event.state.view : 'home';
                this.showView(view, true);
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
        
        openMesoLengthModal() { /* ... same as before ... */ },
        closeModal() { /* ... same as before ... */ },
        showView(viewName, isPoppedState = false) { /* ... same as before ... */ },
        renderSettings() { /* ... same as before ... */ },
        setUnits(unit) { /* ... same as before ... */ },
        setTheme(theme) { /* ... same as before ... */ },
        applyTheme() { /* ... same as before ... */ },
        setProgressionModel(model) { /* ... same as before ... */ },
        setWeightIncrement(increment) { /* ... same as before ... */ },
        renderBuilder() { /* ... same as before ... */ },
        addDayToBuilder() { /* ... same as before ... */ },
        deleteDayFromBuilder(dayIndex) { /* ... same as before ... */ },
        updateDayLabel(dayIndex, newLabel) { /* ... same as before ... */ },
        addMuscleGroupToDay(dayIndex) { /* ... same as before ... */ },
        deleteMuscleGroupFromDay(dayIndex, muscleIndex) { /* ... same as before ... */ },
        updateMuscleGroup(dayIndex, muscleIndex, newMuscle) { /* ... same as before ... */ },
        updateMuscleFocus(dayIndex, muscleIndex, newFocus) { /* ... same as before ... */ },
        updateExerciseSelection(dayIndex, muscleIndex, exerciseSelectIndex, newExercise) { /* ... same as before ... */ },
        finalizeAndStartPlan(mesoLength) { /* ... same as before ... */ },
        
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
            // UPDATED: Defaults to a 3-day plan, as 'days' is no longer selected
            this.state.plan = this.generateMesocycle(this.state.userSelections.goal, this.state.userSelections.experience, '3', 6);
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
