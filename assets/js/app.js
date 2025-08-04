document.addEventListener('DOMContentLoaded', () => {

    // ===========================
    //  APP STATE & CONFIGURATION
    // ===========================
    const app = {
        state: {
            // Unchanged from your file
            currentStep: 1,
            totalSteps: 5,
            userSelections: {
                goal: "",
                experience: "",
                style: "",
                days: ""
            },
            plan: null, // This will now hold the entire mesocycle object
            allPlans: [],
            exercises: [],
            charts: {
                volume: null,
                load: null
            }
        },

        // ===========================
        //  DOM ELEMENTS
        // ===========================
        elements: {
            // Unchanged from your file
            onboardingContainer: document.getElementById('onboarding-container'),
            dashboard: document.getElementById('dashboard'),
            progress: document.querySelector('.progress'),
            modal: document.getElementById('modal'),
            modalBody: document.getElementById('modal-body'),
            workoutList: document.getElementById('workoutList'),
        },

        // ===========================
        //  INITIALIZATION
        // ===========================
        async init() {
            await this.loadExercises();
            this.loadStateFromStorage();
            this.addEventListeners();

            if (localStorage.getItem("onboardingCompleted") === "true") {
                // --- UPDATED to use the new mesocycle generation ---
                // We generate the plan from saved selections if it doesn't exist.
                // Note: In the future, we will save and load the plan itself to preserve progress.
                this.state.plan = this.generateMesocycle(
                    this.state.userSelections.goal,
                    this.state.userSelections.experience,
                    this.state.userSelections.days
                );
                this.renderDashboard();
            } else {
                this.showStep(1);
            }
        },

        // ===========================
        //  DATA HANDLING
        // ===========================
        // Unchanged from your file
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
                // Note: We'll add loading the mesocycle itself later to preserve state
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
        // Unchanged from your file
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

            // Card Selections
            document.querySelectorAll('.card-group .goal-card').forEach(card => {
                card.addEventListener('click', () => {
                    const field = card.parentElement.dataset.field;
                    const value = card.dataset.value;
                    this.selectCard(card, field, value);
                });
            });

            // Modal Controls
            document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
            document.getElementById('openLogWorkoutModalBtn').addEventListener('click', () => this.openModal('logWorkout'));
            document.getElementById('openPlannerModalBtn').addEventListener('click', () => this.openModal('planner'));
            document.getElementById('openSettingsModalBtn').addEventListener('click', () => this.openModal('settings'));
            
            this.elements.modalBody.addEventListener('click', (e) => {
                if(e.target.id === 'submitWorkoutBtn') this.submitWorkout();
                if(e.target.id === 'saveManualAdjustBtn') this.saveManualAdjust();
            });
        },

        // ===========================
        //  ONBOARDING LOGIC
        // ===========================
        // Onboarding logic is unchanged...
        showStep(stepNumber) {
            document.querySelectorAll('.step.active').forEach(step => step.classList.remove('active'));
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

        // --- UPDATED finishOnboarding to call the new function ---
        finishOnboarding() {
            this.state.plan = this.generateMesocycle(
                this.state.userSelections.goal,
                this.state.userSelections.experience,
                this.state.userSelections.days
            );
            this.state.allPlans.push(this.state.plan);
            this.saveStateToStorage();
            this.renderDashboard();
        },

        // ===========================
        //  PLAN GENERATION (NEW)
        // ===========================

        // --- REMOVED old `generatePlan` and `getExercisesByMuscle` functions ---

        // +++ NEW MESOCYCLE GENERATION LOGIC +++
        /**
         * Generates a complete, multi-week mesocycle plan based on user goals and experience.
         * This structure is designed to support week-over-week auto-regulation.
         */
        generateMesocycle(goal = 'Hypertrophy', experience = 'beginner', daysPerWeek = 4) {
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
                '4': { name: 'Lower Body Hypertrophy', muscles: ['quads', 'hamstrings'] }
            };
            const mesocycle = {
                id: `meso_${Date.now()}`,
                startDate: new Date().toISOString(),
                durationWeeks: 5,
                goal: goal,
                experience: experience,
                weeklyFeedback: {},
                weeks: {}
            };
            for (let i = 1; i <= mesocycle.durationWeeks; i++) {
                mesocycle.weeks[i] = {};
                const isDeload = (i === mesocycle.durationWeeks);
                for (let j = 1; j <= daysPerWeek; j++) {
                    const dayInfo = split[j];
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

        // ===========================
        //  DASHBOARD & RENDERING (NEEDS REFACTORING)
        // ===========================
        // The functions below WILL NOT WORK correctly with the new mesocycle data structure.
        // They are left here as placeholders for our next phase of development.
        renderDashboard() {
            this.elements.onboardingContainer.style.display = "none";
            this.elements.dashboard.classList.remove('hidden');
            const plan = this.state.plan;

            // This will no longer work as intended.
            document.getElementById('summaryGoal').textContent = this.capitalize(plan.goal);
            document.getElementById('summaryExperience').textContent = this.capitalize(plan.experience);
            document.getElementById('summaryDays').textContent = plan.daysPerWeek || plan.days; // Adjust for new structure

            // These lines will need to be completely re-thought
            document.getElementById('volumeSummary').textContent = `Mesocycle Ready!`;
            document.getElementById('volumeProgress').style.width = `0%`;
            
            // Charts will also need new data sources
            this.renderCharts();
            this.loadWorkouts();
        },

        renderCharts() { /* This function needs to be updated to parse mesocycle data */ },
        loadWorkouts() { /* This function is still okay for now */
            const history = JSON.parse(localStorage.getItem('workoutHistory')) || [];
            this.elements.workoutList.innerHTML = "";
            history.forEach(w => {
                const li = document.createElement('li');
                li.textContent = `${w.notes || "Workout"} - Fatigue: ${w.fatigue} (on ${new Date(w.date).toLocaleDateString()})`;
                this.elements.workoutList.appendChild(li);
            });
        },

        // ===========================
        //  MODAL LOGIC (NEEDS REFACTORING)
        // ===========================
        // The 'planner' modal is now incompatible with the mesocycle data structure.
        openModal(type) { /* ... as before, but 'planner' part is broken ... */ },
        closeModal() { /* ... as before ... */ },
        submitWorkout() { /* ... as before ... */ },
        saveManualAdjust() { /* This function is broken and needs to be replaced */ },

        // ===========================
        //  UTILITY
        // ===========================
        capitalize(str) {
            return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
        }
    };

    app.init();
});
