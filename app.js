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
                this.state.userSelections.days
            );
            this.state.allPlans.push(this.state.plan);
            this.saveStateToStorage();
            this.showWorkoutView();
        },

        // ===========================
        //  PLAN GENERATION
        // ===========================
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
        showWorkoutView() {
            this.elements.onboardingContainer.style.display = "none";
            this.elements.dashboard.style.display = 'none'; 
            this.elements.workoutView.classList.remove('hidden');

            this.renderDailyWorkout(this.state.currentView.week, this.state.currentView.day);
        },

        renderDailyWorkout(weekNumber, dayNumber) {
            const plan = this.state.plan;
            if (!plan || !plan.weeks[weekNumber] || !plan.weeks[weekNumber][dayNumber]) {
                console.error(`Plan data not found for Week ${weekNumber}, Day ${dayNumber}.`);
                document.getElementById('exercise-list-container').innerHTML = `<p>Workout plan not available for this day.</p>`;
                return;
            }

            const dayData = plan.weeks[weekNumber][dayNumber];
            const container = document.getElementById('exercise-list-container');
            document.getElementById('workout-day-title').textContent = `Week ${weekNumber}, Day ${dayNumber}: ${dayData.name}`;
            document.getElementById('workout-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            container.innerHTML = '';

            dayData.exercises.forEach((exercise, exerciseIndex) => {
                const exerciseCard = document.createElement('div');
                exerciseCard.className = 'exercise-card';
                let setsHTML = '';
                
                // Use targetSets to render the initial empty rows
                const setsToRenderCount = Math.max(exercise.sets.length, exercise.targetSets);

                for (let setIndex = 0; setIndex < setsToRenderCount; setIndex++) {
                    const set = exercise.sets[setIndex] || {};
                     setsHTML += `
                        <div class="set-row">
                            <span class="set-number">Set ${setIndex + 1}</span>
                            <div class="set-inputs">
                                <input type="number" placeholder="lbs" class="weight-input" value="${set.load || ''}" data-week="${weekNumber}" data-day="${dayNumber}" data-exercise="${exerciseIndex}" data-set="${setIndex}">
                                <input type="number" placeholder="reps" class="reps-input" value="${set.reps || ''}" data-week="${weekNumber}" data-day="${dayNumber}" data-exercise="${exerciseIndex}" data-set="${setIndex}">
                                <input type="number" placeholder="RIR" class="rir-input" value="${set.rir || ''}" data-week="${weekNumber}" data-day="${dayNumber}" data-exercise="${exerciseIndex}" data-set="${setIndex}">
                            </div>
                        </div>
                    `;
                }

                exerciseCard.innerHTML = `
                    <div class="exercise-card-header">
                        <h3>${exercise.name}</h3>
                        <span class="exercise-target">Target: ${exercise.targetReps} reps @ ${exercise.targetRIR} RIR</span>
                    </div>
                    <div class="sets-container">
                        <div class="set-row header">
                            <span></span>
                            <div class="set-inputs">
                                <span>Weight</span>
                                <span>Reps</span>
                                <span>RIR</span>
                            </div>
                        </div>
                        ${setsHTML}
                    </div>
                    <button class="add-set-btn" data-exercise-index="${exerciseIndex}">+ Add Set</button>
                `;
                container.appendChild(exerciseCard);
            });
        },
        
        handleSetInput(inputElement) {
            const { week, day, exercise, set } = inputElement.dataset;
            const value = parseFloat(inputElement.value) || 0;
            const property = inputElement.classList.contains('weight-input') ? 'load' : 
                             inputElement.classList.contains('reps-input') ? 'reps' : 'rir';

            const exerciseData = this.state.plan.weeks[week][day].exercises[exercise];
            while (exerciseData.sets.length <= set) {
                exerciseData.sets.push({});
            }
            exerciseData.sets[set][property] = value;
        },
        
        addSet(exerciseIndex) {
            const { week, day } = this.state.currentView;
            const exerciseData = this.state.plan.weeks[week][day].exercises[exerciseIndex];
            const lastSet = exerciseData.sets[exerciseData.sets.length - 1] || {};
            exerciseData.sets.push({ ...lastSet, rir: '' }); 
            this.renderDailyWorkout(week, day);
        },

        // ===========================
        //  UTILITY
        // ===========================
        capitalize(str) {
            return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
        }
    };

    app.init();
});
