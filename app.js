document.addEventListener('DOMContentLoaded', () => {

    const app = {
        state: {
            currentStep: 1,
            totalSteps: 6,
            userSelections: { goal: "", experience: "", style: "", days: "", mesoLength: "" },
            plan: null,
            currentView: { week: 1, day: 1 },
            allPlans: [],
            exercises: [],
        },

        elements: {
            onboardingContainer: document.getElementById('onboarding-container'),
            homeScreen: document.getElementById('home-screen'),
            dashboard: document.getElementById('dashboard'),
            progress: document.querySelector('.progress'),
            workoutView: document.getElementById('daily-workout-view'),
        },

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
                    this.finishOnboarding();
                    return;
                }
                this.showView('home');
            } else {
                this.showView('onboarding');
            }
        },

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
            document.getElementById('mesoLengthNextBtn')?.addEventListener('click', () => this.validateAndProceed('mesoLength'));
            document.getElementById('finishOnboardingBtn')?.addEventListener('click', () => this.finishOnboarding());
            
            // Home Screen Buttons
            document.getElementById('startWorkoutBtn')?.addEventListener('click', () => this.showView('workout'));
            document.getElementById('planMesoBtn')?.addEventListener('click', () => alert('Feature coming soon!'));
            document.getElementById('reviewWorkoutsBtn')?.addEventListener('click', () => alert('Feature coming soon!'));

            // Back Buttons
            document.getElementById('backToHomeBtn')?.addEventListener('click', () => this.showView('home'));
            document.querySelectorAll('.back-btn-onboarding').forEach(button => {
                button.addEventListener('click', () => this.previousStep());
            });

            // Onboarding Card Selections
            document.querySelectorAll('.card-group .goal-card').forEach(card => {
                card.addEventListener('click', () => {
                    const field = card.parentElement.dataset.field;
                    const value = card.dataset.value;
                    this.selectCard(card, field, value);
                });
            });

            // Workout View Listeners
            this.elements.workoutView.addEventListener('click', (e) => {
                 if (e.target.matches('.add-set-btn')) { this.addSet(e.target.dataset.exerciseIndex); }
                if (e.target.matches('#complete-workout-btn')) { this.completeWorkout(); }
            });
            this.elements.workoutView.addEventListener('input', (e) => {
                if(e.target.matches('.weight-input, .reps-input, .rir-input')) { this.handleSetInput(e.target); }
            });
        },
        
        showView(viewName) {
            this.elements.onboardingContainer.classList.add('hidden');
            this.elements.homeScreen.classList.add('hidden');
            this.elements.workoutView.classList.add('hidden');
            this.elements.dashboard.classList.add('hidden');

            if (viewName === 'onboarding') {
                this.elements.onboardingContainer.classList.remove('hidden');
                this.showStep(this.state.currentStep);
            } else if (viewName === 'home') {
                this.elements.homeScreen.classList.remove('hidden');
            } else if (viewName === 'workout') {
                this.elements.workoutView.classList.remove('hidden');
                this.renderDailyWorkout(this.state.currentView.week, this.state.currentView.day);
            }
        },

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

        previousStep() {
            if (this.state.currentStep > 1) {
                this.state.currentStep--;
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
                this.state.userSelections.mesoLength
            );
            this.state.allPlans.push(this.state.plan);
            this.saveStateToStorage();
            this.showView('home');
        },

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
                durationWeeks: parseInt(mesoLength) || 6,
                goal: goal,
                experience: experience,
                weeklyFeedback: {},
                weeks: {}
            };
            for (let i = 1; i <= mesocycle.durationWeeks; i++) {
                mesocycle.weeks[i] = {};
                const isDeload = (i === mesocycle.durationWeeks);
                const dps = parseInt(daysPerWeek) || 4;
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
                                targetSets: isDeload ? Math.ceil((currentMev[muscle] || 8) / 2 / 2) : Math.ceil((currentMev[muscle] || 8) / 2),
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

        renderDailyWorkout(weekNumber, dayNumber) {
            const plan = this.state.plan;
            if (!plan || !plan.weeks[weekNumber] || !plan.weeks[weekNumber][dayNumber]) {
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
                        <span class="exercise-target">Target: ${exercise.targetLoad ? `${exercise.targetLoad}lbs for` : ''} ${exercise.targetReps} reps @ ${exercise.targetRIR} RIR</span>
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
        
        completeWorkout() {
            const { week, day } = this.state.currentView;
            const plan = this.state.plan;
            if (!plan || !plan.weeks[week] || !plan.weeks[week][day]) {
                alert("Could not find workout to complete.");
                return;
            }
            plan.weeks[week][day].completed = true;
            const planIndex = this.state.allPlans.findIndex(p => p.id === plan.id);
            if (planIndex > -1) { this.state.allPlans[planIndex] = plan; } 
            else { this.state.allPlans.push(plan); }
            this.saveStateToStorage();
            alert(`Workout for Week ${week}, Day ${day} saved!`);
            const daysPerWeek = parseInt(this.state.userSelections.days);
            if (day === daysPerWeek) {
                this.calculateNextWeekProgression(week);
                alert(`Week ${week} complete! Your plan for next week has been updated based on your performance.`);
            }
            let nextDay = day + 1;
            let nextWeek = week;
            if (nextDay > daysPerWeek) {
                nextDay = 1;
                nextWeek++;
            }
            if (nextWeek > plan.durationWeeks) {
                alert("Mesocycle complete! Well done!");
            } else {
                this.state.currentView = { week: nextWeek, day: nextDay };
                this.showView('workout');
            }
        },

        calculateNextWeekProgression(completedWeekNumber) {
            const plan = this.state.plan;
            const nextWeekNumber = completedWeekNumber + 1;
            if (!plan.weeks[nextWeekNumber]) { return; }
            for (const day in plan.weeks[completedWeekNumber]) {
                const completedDayData = plan.weeks[completedWeekNumber][day];
                const nextWeekDayData = plan.weeks[nextWeekNumber][day];
                if (!nextWeekDayData) continue;
                completedDayData.exercises.forEach((completedExercise, exerciseIndex) => {
                    const nextWeekExercise = nextWeekDayData.exercises[exerciseIndex];
                    if (!nextWeekExercise) return;
                    const lastSet = completedExercise.sets.filter(s => s.load && s.reps).pop();
                    if (!lastSet) {
                        nextWeekExercise.targetLoad = completedExercise.targetLoad || 135;
                        return;
                    }
                    const { load, reps, rir } = lastSet;
                    const { targetReps, targetRIR } = completedExercise;
                    let newTargetLoad = load;
                    let newTargetReps = targetReps;
                    if (reps >= targetReps && rir >= targetRIR) {
                        newTargetLoad = load + 5;
                        newTargetReps = targetReps;
                    } else if (reps >= targetReps && rir < targetRIR) {
                        newTargetLoad = load;
                        newTargetReps = targetReps + 1;
                    } else {
                        newTargetLoad = load;
                        newTargetReps = targetReps;
                    }
                    nextWeekExercise.targetLoad = newTargetLoad;
                    nextWeekExercise.targetReps = newTargetReps;
                    nextWeekExercise.targetSets = completedExercise.targetSets + 1;
                });
            }
            this.saveStateToStorage();
        },

        capitalize(str) {
            return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
        }
    };

    for (const key in app) {
        if (typeof app[key] === 'function') {
            app[key] = app[key].bind(app);
        }
    }
    
    app.init();
});
