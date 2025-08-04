document.addEventListener('DOMContentLoaded', () => {

    // ===========================
    //  APP STATE & CONFIGURATION
    // ===========================
    const app = {
        state: {
            currentStep: 1,
            totalSteps: 6, // UPDATED from 5 to 6
            userSelections: {
                goal: "",
                experience: "",
                style: "",
                days: "",
                mesoLength: "" // ADDED for new step
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
                this.state.userSelections = JSON.parse(localStorage.getItem("userSelections"));
                const savedPlans = JSON.parse(localStorage.getItem("savedPlans"));
                if (savedPlans && savedPlans.length > 0) {
                    this.state.plan = savedPlans[0];
                    this.state.allPlans = savedPlans;
                } else {
                    this.state.plan = this.generateMesocycle(
                        this.state.userSelections.goal,
                        this.state.userSelections.experience,
                        this.state.userSelections.days,
                        this.state.userSelections.mesoLength // Pass new value
                    );
                }
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
            localStorage.setItem("savedPlans", JSON.stringify(this.state.allPlans));
        },

        // ===========================
        //  EVENT LISTENERS
        // ===========================
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
            // ADDED listener for the new step's button
            document.getElementById('mesoLengthNextBtn')?.addEventListener('click', () => this.validateAndProceed('mesoLength'));
            document.getElementById('finishOnboardingBtn')?.addEventListener('click', () => this.finishOnboarding());

            // Onboarding Card Selections (this is generic and will work for the new cards)
            document.querySelectorAll('.card-group .goal-card').forEach(card => {
                card.addEventListener('click', () => {
                    const field = card.parentElement.dataset.field;
                    const value = card.dataset.value;
                    this.selectCard(card, field, value);
                });
            });

            // Listeners for the workout view
            this.elements.workoutView.addEventListener('click', (e) => {
                 if (e.target.matches('.add-set-btn')) {
                    this.addSet(e.target.dataset.exerciseIndex);
                }
                if (e.target.matches('#complete-workout-btn')) {
                    this.completeWorkout();
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
        showStep(stepNumber) {
            document.querySelectorAll('.step.active').forEach(step => step.classList.remove('active'));
            // The step IDs are now step1, step2... step6
            document.getElementById(`step${stepNumber}`)?.classList.add('active');
            this.updateProgress();
        },
        updateProgress() {
            const percentage = ((this.state.currentStep - 1) / (this.state.totalSteps - 1)) * 100;
            this.elements.progress.style.width = `${percentage}%`;
        },
        nextStep() {
            if (this.state.currentStep < this.state.totalSteps) {
                this.state.currentStep++;
                this.showStep(this.state.currentStep);
            }
        },
        validateStep(field) {
            if (!this.state.userSelections[field]) {
                alert("Please select an option before continuing.");
                return false;
            }
            return true;
        },
        validateAndProceed(field) {
            if (this.validateStep(field)) {
                this.nextStep();
            }
        },
        selectCard(element, field, value) {
            this.state.userSelections[field] = value;
            element.parentElement.querySelectorAll('.goal-card').forEach(card => card.classList.remove('active'));
            element.classList.add('active');
        },

        finishOnboarding() {
            this.state.plan = this.generateMesocycle(
                this.state.userSelections.goal,
                this.state.userSelections.experience,
                this.state.userSelections.days,
                this.state.userSelections.mesoLength // Pass new value
            );
            this.state.allPlans.push(this.state.plan);
            this.saveStateToStorage();
            this.showWorkoutView();
        },

        // ===========================
        //  PLAN GENERATION
        // ===========================
        // UPDATED function to accept mesoLength
        generateMesocycle(goal = 'Hypertrophy', experience = 'beginner', daysPerWeek = 4, mesoLength = 6) {
            const mevSets = {
                beginner: { chest: 8, back: 10, quads: 8, hamstrings: 6, shoulders: 6, arms: 4 },
                experienced: { chest: 10, back: 12, quads: 10, hamstrings: 8, shoulders: 8, arms: 6 },
                advanced: { chest: 12, back: 14, quads: 12, hamstrings: 10, shoulders: 10, arms: 8 }
            };
            const currentMev = mevSets[experience];
            const exerciseDatabase = {
                'Barbell Bench Press': { type: goal === 'Strength' ? 'PrimaryStrength' : 'PrimaryHypertrophy', muscle: 'chest' },
                'Incline Dumbbell Press': { type: 'SecondaryHypertrophy', muscle: 'chest' },
                'Barbell Squat': { type: 'PrimaryStrength', muscle: 'quads' },
                'Leg Press': { type: 'SecondaryHypertrophy', muscle: 'quads' },
                'Romanian Deadlift': { type: 'PrimaryHypertrophy', muscle: 'hamstrings' },
                'Leg Curl': { type: 'SecondaryHypertrophy', muscle: 'hamstrings' },
                'Pull-Up': { type: 'PrimaryHypertrophy', muscle: 'back' },
                'Barbell Row': { type: 'SecondaryHypertrophy', muscle: 'back' },
                'Overhead Press': { type: 'PrimaryHypertrophy', muscle: 'shoulders' },
                'Lateral Raise': { type: 'SecondaryHypertrophy', muscle: 'shoulders' },
                'Barbell Curl': { type: 'SecondaryHypertrophy', muscle: 'arms' },
                'Triceps Pushdown': { type: 'SecondaryHypertrophy', muscle: 'arms' }
            };
            const split = {
                '1': { name: 'Upper Body Strength', muscles: ['chest', 'back', 'shoulders', 'arms'] },
                '2': { name: 'Lower Body Strength', muscles: ['quads', 'hamstrings'] },
                '3': { name: 'Upper Body Hypertrophy', muscles: ['chest', 'back', 'shoulders', 'arms'] },
                '4': { name: 'Lower Body Hypertrophy', muscles: ['quads', 'hamstrings'] },
                '5': { name: 'Full Body', muscles: ['chest', 'back', 'quads', 'shoulders'] },
                '6': { name: 'Full Body', muscles: ['chest', 'back', 'quads', 'shoulders', 'arms'] }
            };
            const mesocycle = {
                id: `meso_${Date.now()}`,
                startDate: new Date().toISOString(),
                durationWeeks: parseInt(mesoLength), // Use the selected length
                goal: goal,
                experience: experience,
                weeklyFeedback: {},
                weeks: {}
            };
            // Loop for the selected number of weeks
            for (let i = 1; i <= mesocycle.durationWeeks; i++) {
                mesocycle.weeks[i] = {};
                // The last week is always a deload
                const isDeload = (i === mesocycle.durationWeeks);
                const dps = parseInt(daysPerWeek)
                for (let j = 1; j <= dps; j++) {
                    const dayInfo = split[j];
                    if(!dayInfo) continue;
                    mesocycle.weeks[i][j] = { name: dayInfo.name, completed: false, exercises: [] };
                    for (const muscle of dayInfo.muscles) {
                        const exercisesForMuscle = Object.entries(exerciseDatabase).filter(([_, details]) => details.muscle === muscle);
                        const primaryExercise = exercisesForMuscle.find(([_, details]) => details.type.includes('Primary'));
                        if (primaryExercise) {
                            const [exerciseName, exerciseDetails] = primaryExercise;
                            mesocycle.weeks[i][j].exercises.push({
                                exerciseId: `ex_${exerciseName.replace(/\s+/g, '_')}`,
                                name: exerciseName,
                                type: exerciseDetails.type,
                                targetSets: isDeload ? Math.ceil(currentMev[muscle] / 2 / 2) : Math.ceil(currentMev[muscle] / 2),
                                targetReps: exerciseDetails.type.includes('Strength') ? 5 : 10,
                                targetRIR: isDeload ? 4 : (exerciseDetails.type.includes('Strength') ? 3 : 2),
                                targetLoad: null,
                                sets: []
                            });
                        }
                    }
                }
            }
            return mesocycle;
        },

        // ==============================================
        //  DAILY WORKOUT VIEW & LOGIC
        // ==============================================
        showWorkoutView() { /* ... function content is unchanged ... */ },
        renderDailyWorkout(weekNumber, dayNumber) { /* ... function content is unchanged ... */ },
        handleSetInput(inputElement) { /* ... function content is unchanged ... */ },
        addSet(exerciseIndex) { /* ... function content is unchanged ... */ },
        completeWorkout() { /* ... function content is unchanged ... */ },
        calculateNextWeekProgression(completedWeekNumber) { /* ... function content is unchanged ... */ },

        // ===========================
        //  UTILITY
        // ===========================
        capitalize(str) {
            return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
        }
    };
    
    // Helper to bind 'this' to the app object for all methods.
    // This is a failsafe to ensure 'this' is always correct.
    for (const key in app) {
        if (typeof app[key] === 'function') {
            app[key] = app[key].bind(app);
        }
    }

    app.init();
});
