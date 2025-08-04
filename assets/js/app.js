document.addEventListener('DOMContentLoaded', () => {

    // ===========================
    //  APP STATE & CONFIGURATION
    // ===========================
    const app = {
        state: {
            currentStep: 1,
            totalSteps: 5,
            userSelections: {
                goal: "",
                experience: "",
                style: "",
                days: ""
            },
            plan: null,
            currentView: {
                week: 1,
                day: 1,
            },
            allPlans: [],
            exercises: [],
        },

        // ===========================
        //  DOM ELEMENTS
        // ===========================
        elements: {
            onboardingContainer: document.getElementById('onboarding-container'),
            dashboard: document.getElementById('dashboard'),
            progress: document.querySelector('.progress'),
            modal: document.getElementById('modal'),
            modalBody: document.getElementById('modal-body'),
            workoutList: document.getElementById('workoutList'),
            workoutView: document.getElementById('daily-workout-view'),
        },

        // ===========================
        //  INITIALIZATION
        // ===========================
        async init() {
            await this.loadExercises();
            this.loadStateFromStorage();
            this.addEventListeners();

            if (localStorage.getItem("onboardingCompleted") === "true") {
                this.state.plan = this.generateMesocycle(
                    this.state.userSelections.goal,
                    this.state.userSelections.experience,
                    this.state.userSelections.days
                );
                this.showWorkoutView();
            } else {
                this.showStep(1);
            }
        },

        // ===========================
        //  DATA HANDLING
        // ===========================
        async loadExercises() {
            try {
                const response = await fetch('exercises.json');
                if (!response.ok) throw new Error('Network response was not ok.');
                this.state.exercises = await response.json();
            } catch (error) {
                console.error("Failed to load exercises:", error);
                this.state.exercises = [];
            }
        },

        loadStateFromStorage() {
            const completed = localStorage.getItem("onboardingCompleted");
            if (completed === "true") {
                this.state.userSelections = JSON.parse(localStorage.getItem("userSelections")) || this.state.userSelections;
                this.state.allPlans = JSON.parse(localStorage.getItem("savedPlans")) || [];
            }
        },

        saveStateToStorage() {
            localStorage.setItem("onboardingCompleted", "true");
            localStorage.setItem("userSelections", JSON.stringify(this.state.userSelections));
            // We now save the entire mesocycle plan
            localStorage.setItem("savedPlans", JSON.stringify(this.state.allPlans));
        },

        // ===========================
        //  EVENT LISTENERS
        // ===========================
        // --- UPDATED to handle workout logging ---
        addEventListeners() {
            // Onboarding Buttons
            document.getElementById('beginOnboardingBtn')?.addEventListener('click', () => this.nextStep());
            document.getElementById('goalNextBtn')?.addEventListener('click', () => this.validateAndProceed('goal'));
            document.getElementById('experienceNextBtn')?.addEventListener('click', () => this.validateAndProceed('experience'));
            document.getElementById('prefsNextBtn')?.addEventListener('click', () => {
                if (this.validateStep('style') && this.validateStep('days')) {
                    this.nextStep();
                }
            });
            document.getElementById('finishOnboardingBtn')?.addEventListener('click', () => this.finishOnboarding());

            // Onboarding Card Selections
            document.querySelectorAll('.card-group .goal-card').forEach(card => {
                card.addEventListener('click', () => {
                    const field = card.parentElement.dataset.field;
                    const value = card.dataset.value;
                    this.selectCard(card, field, value);
                });
            });

            // Listeners for the workout view using event delegation
            this.elements.workoutView.addEventListener('click', (e) => {
                 if (e.target.matches('.add-set-btn')) {
                    this.addSet(e.target.dataset.exerciseIndex);
                }
                if (e.target.matches('#complete-workout-btn')) {
                    console.log('Completing workout...');
                    // We will implement this later
                }
            });
            
            this.elements.workoutView.addEventListener('input', (e) => {
                if(e.target.matches('.weight-input, .reps-input, .rir-input')) {
                    this.handleSetInput(e.target);
                }
            });
        },

        // ===========================
        //  ONBOARDING LOGIC
        // ===========================
        showStep(stepNumber) { /* ... unchanged ... */ },
        updateProgress() { /* ... unchanged ... */ },
        nextStep() { /* ... unchanged ... */ },
        validateStep(field) { /* ... unchanged ... */ },
        validateAndProceed(field) { /* ... unchanged ... */ },
        selectCard(element, field, value) { /* ... unchanged ... */ },
        finishOnboarding() {
            this.state.plan = this.generateMesocycle(
                this.state.userSelections.goal,
                this.state.userSelections.experience,
                this.state.userSelections.days
            );
            this.state.allPlans.push(this.state.plan);
            this.saveStateToStorage();
            this.showWorkoutView();
        },

        // ===========================
        //  PLAN GENERATION
        // ===========================
        generateMesocycle(goal, experience, daysPerWeek) { /* ... unchanged ... */ },

        // ==============================================
        //  DAILY WORKOUT VIEW & LOGIC
        // ==============================================
        showWorkoutView() { /* ... unchanged ... */ },
        renderDailyWorkout(weekNumber, dayNumber) { /* ... unchanged, but will now re-render on changes ... */ },

        // +++ NEW: Function to handle user input for sets +++
        /**
         * Saves the value from a set input field into the app's state.
         * @param {HTMLElement} inputElement The input element that changed.
         */
        handleSetInput(inputElement) {
            const { week, day, exercise, set } = inputElement.dataset;
            const value = parseFloat(inputElement.value) || 0;
            const property = inputElement.classList.contains('weight-input') ? 'load' : 
                             inputElement.classList.contains('reps-input') ? 'reps' : 'rir';

            const exerciseData = this.state.plan.weeks[week][day].exercises[exercise];

            // Ensure the sets array is initialized
            while (exerciseData.sets.length <= set) {
                exerciseData.sets.push({});
            }

            // Update the state
            exerciseData.sets[set][property] = value;
            console.log('State updated:', this.state.plan.weeks[week][day].exercises[exercise].sets);
        },
        
        // +++ NEW: Function to add a set to an exercise +++
        /**
         * Adds a new, empty set to an exercise and re-renders the view.
         * @param {number} exerciseIndex The index of the exercise to add a set to.
         */
        addSet(exerciseIndex) {
            const { week, day } = this.state.currentView;
            const exerciseData = this.state.plan.weeks[week][day].exercises[exerciseIndex];
            
            // Add a new empty set to the state
            // We use the last performed set as a template, or an empty object if no sets were performed
            const lastSet = exerciseData.sets[exerciseData.sets.length - 1] || {};
            exerciseData.sets.push({ ...lastSet, rir: '' }); // Copy last set's weight/reps but clear RIR

            // Re-render the entire workout view to show the new set
            this.renderDailyWorkout(week, day);
        },

        // ===========================
        //  UTILITY
        // ===========================
        capitalize(str) {
            return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
        }
    };

    // Re-pasting unchanged functions for completeness
    app.showStep = app.showStep.bind(app);
    app.updateProgress = app.updateProgress.bind(app);
    app.nextStep = app.nextStep.bind(app);
    app.validateStep = app.validateStep.bind(app);
    app.validateAndProceed = app.validateAndProceed.bind(app);
    app.selectCard = app.selectCard.bind(app);
    app.generateMesocycle = app.generateMesocycle.bind(app);
    app.showWorkoutView = app.showWorkoutView.bind(app);
    app.renderDailyWorkout = app.renderDailyWorkout.bind(app);


    app.init();
});
