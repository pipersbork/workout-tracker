document.addEventListener('DOMContentLoaded', () => {

    const app = {
        state: {
            currentStep: 1,
            totalSteps: 4, // UPDATED: Reduced to 4 steps for a quicker onboarding
            userSelections: { 
                goal: "", 
                experience: "", 
                style: "", 
                days: "", 
            },
            plan: null,
            currentView: { week: 1, day: 1 },
            builderPlan: {
                days: [] 
            },
            allPlans: [],
            exercises: [],
        },

        elements: {
            onboardingContainer: document.getElementById('onboarding-container'),
            homeScreen: document.getElementById('home-screen'),
            workoutView: document.getElementById('daily-workout-view'),
            builderView: document.getElementById('builder-view'),
            scheduleContainer: document.getElementById('schedule-container'),
            progress: document.querySelector('.progress'),
            modal: document.getElementById('modal'),
            modalBody: document.getElementById('modal-body'),
        },

        // Initializes the application
        async init() {
            await this.loadExercises();
            this.loadStateFromStorage();
            this.addEventListeners();
            // Check if user has completed onboarding before
            if (localStorage.getItem("onboardingCompleted") === "true") {
                this.state.userSelections = JSON.parse(localStorage.getItem("userSelections"));
                const savedPlans = JSON.parse(localStorage.getItem("savedPlans"));
                if (savedPlans && savedPlans.length > 0) {
                    this.state.plan = savedPlans[0]; // Load the most recent plan
                    this.state.allPlans = savedPlans;
                } else { 
                    // If onboarding was done but no plan exists, generate one
                    this.finishOnboarding();
                    return;
                }
                this.showView('home');
            } else {
                this.showView('onboarding');
            }
        },

        // Fetches the list of exercises from the JSON file
        async loadExercises() {
            try {
                const response = await fetch('exercises.json');
                if (!response.ok) throw new Error('Network response was not ok.');
                this.state.exercises = await response.json();
            } catch (error) {
                console.error("Failed to load exercises.json:", error);
                // You could show an error to the user here
                this.state.exercises = []; // Set to empty array to prevent further errors
            }
        },

        // Loads user data from localStorage
        loadStateFromStorage() {
            const completed = localStorage.getItem("onboardingCompleted");
            if (completed === "true") {
                this.state.userSelections = JSON.parse(localStorage.getItem("userSelections")) || this.state.userSelections;
                this.state.allPlans = JSON.parse(localStorage.getItem("savedPlans")) || [];
                const savedView = JSON.parse(localStorage.getItem("currentView"));
                if (savedView) {
                    this.state.currentView = savedView;
                }
            }
        },

        // Saves user data to localStorage
        saveStateToStorage() {
            localStorage.setItem("onboardingCompleted", "true");
            localStorage.setItem("userSelections", JSON.stringify(this.state.userSelections));
            localStorage.setItem("savedPlans", JSON.stringify(this.state.allPlans));
            localStorage.setItem("currentView", JSON.stringify(this.state.currentView));
        },

        // Central location for all event listeners
        addEventListeners() {
            // Onboarding Buttons
            document.getElementById('beginOnboardingBtn')?.addEventListener('click', () => this.nextStep());
            document.getElementById('goalNextBtn')?.addEventListener('click', () => this.validateAndProceed('goal'));
            document.getElementById('experienceNextBtn')?.addEventListener('click', () => this.validateAndProceed('experience'));
            // UPDATED: The final button now finishes onboarding
            document.getElementById('finishOnboardingBtn')?.addEventListener('click', () => {
                if (this.validateStep('style') && this.validateStep('days')) {
                    this.finishOnboarding();
                }
            });
            
            // Home Screen Buttons
            document.getElementById('startWorkoutBtn')?.addEventListener('click', () => this.showView('workout'));
            document.getElementById('planMesoBtn')?.addEventListener('click', () => this.showView('builder'));
            document.getElementById('reviewWorkoutsBtn')?.addEventListener('click', () => alert('Feature coming soon!'));

            // Back Buttons
            document.getElementById('backToHomeBtn')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromBuilder')?.addEventListener('click', () => this.showView('home'));
            document.querySelectorAll('.back-btn-onboarding').forEach(button => {
                button.addEventListener('click', () => this.previousStep());
            });

            // Builder Listeners
            document.getElementById('add-day-btn')?.addEventListener('click', () => this.addDayToBuilder());
            document.getElementById('done-planning-btn')?.addEventListener('click', () => this.openMesoLengthModal());

            this.elements.scheduleContainer.addEventListener('click', (e) => {
                const { dayIndex, muscleIndex, focus } = e.target.dataset;
                if (e.target.matches('.add-muscle-group-btn')) { this.addMuscleGroupToDay(dayIndex); }
                if (e.target.matches('.delete-day-btn')) { this.deleteDayFromBuilder(dayIndex); }
                if (e.target.matches('.delete-muscle-group-btn')) { this.deleteMuscleGroupFromDay(dayIndex, muscleIndex); }
                if (e.target.matches('.focus-btn')) { this.updateMuscleFocus(dayIndex, muscleIndex, focus); }
            });
            this.elements.scheduleContainer.addEventListener('change', (e) => {
                const { dayIndex, muscleIndex, exerciseSelectIndex } = e.target.dataset;
                if (e.target.matches('.day-label-selector')) { this.updateDayLabel(dayIndex, e.target.value); }
                if (e.target.matches('.muscle-select')) { this.updateMuscleGroup(dayIndex, muscleIndex, e.target.value); }
                if (e.target.matches('.exercise-select')) { this.updateExerciseSelection(dayIndex, muscleIndex, exerciseSelectIndex, e.target.value); }
            });

            // Modal Listener
            this.elements.modal.addEventListener('click', (e) => {
                if (e.target.matches('.close-btn')) { this.closeModal(); }
                if (e.target.matches('.meso-length-card')) {
                    const length = e.target.dataset.value;
                    this.closeModal();
                    if (confirm('Are you sure you want to proceed with this work routine?')) {
                        this.finalizeAndStartPlan(length);
                    }
                }
            });

            // Onboarding Card Selections
            document.querySelectorAll('.card-group .goal-card').forEach(card => {
                card.addEventListener('click', () => {
                    // Find the parent .card-group to get the data-field attribute
                    const field = card.closest('.card-group').dataset.field;
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
        
        // Opens the modal to select mesocycle length (for the builder)
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

        // Closes the modal
        closeModal() {
            this.elements.modal.classList.add('hidden');
        },

        // Switches between the main views of the application
        showView(viewName) {
            this.elements.onboardingContainer.classList.add('hidden');
            this.elements.homeScreen.classList.add('hidden');
            this.elements.workoutView.classList.add('hidden');
            this.elements.builderView.classList.add('hidden');

            if (viewName === 'onboarding') { this.elements.onboardingContainer.classList.remove('hidden'); this.showStep(this.state.currentStep); } 
            else if (viewName === 'home') { this.elements.homeScreen.classList.remove('hidden'); } 
            else if (viewName === 'workout') { this.elements.workoutView.classList.remove('hidden'); this.renderDailyWorkout(this.state.currentView.week, this.state.currentView.day); } 
            else if (viewName === 'builder') { this.elements.builderView.classList.remove('hidden'); this.renderBuilder(); }
        },

        // --- BUILDER METHODS ---
        renderBuilder() {
            const container = this.elements.scheduleContainer;
            container.innerHTML = ''; 
            if (this.state.builderPlan.days.length === 0) {
                container.innerHTML = `<p class="placeholder-text">Click "Add a Day" to start building your schedule.</p>`;
                return;
            }
            const muscleOptions = ['Select a Muscle', ...new Set(this.state.exercises.map(ex => ex.muscle))].map(m => `<option value="${m.toLowerCase()}">${this.capitalize(m)}</option>`).join('');
            this.state.builderPlan.days.forEach((day, dayIndex) => {
                const dayCard = document.createElement('div');
                dayCard.className = 'day-card';
                const muscleGroupsHTML = day.muscleGroups.map((mg, muscleIndex) => {
                    const exercisesForMuscle = this.state.exercises.filter(ex => ex.muscle.toLowerCase() === mg.muscle);
                    const exerciseOptions = [{name: 'Select an Exercise'}, ...exercisesForMuscle].map(ex => `<option value="${ex.name}">${ex.name}</option>`).join('');
                    const exerciseDropdowns = [0, 1, 2].map(exerciseSelectIndex => `
                        <select class="builder-select exercise-select" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" data-exercise-select-index="${exerciseSelectIndex}">
                            ${exerciseOptions.replace(`value="${mg.exercises[exerciseSelectIndex]}"`, `value="${mg.exercises[exerciseSelectIndex]}" selected`)}
                        </select>
                    `).join('');
                    const focusButtons = ['Primary', 'Secondary', 'Maintenance'].map(focusLevel => `
                        <button class="focus-btn ${mg.focus === focusLevel ? 'active' : ''}" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" data-focus="${focusLevel}">
                            ${focusLevel}
                        </button>
                    `).join('');
                    return `
                        <div class="muscle-group-block">
                            <div class="muscle-group-header">
                                <div class="muscle-group-selectors">
                                    <select class="builder-select muscle-select" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}">
                                        ${muscleOptions.replace(`value="${mg.muscle}"`, `value="${mg.muscle}" selected`)}
                                    </select>
                                    <div class="focus-buttons">
                                        ${focusButtons}
                                    </div>
                                </div>
                                <button class="delete-btn delete-muscle-group-btn" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}">🗑️</button>
                            </div>
                            ${mg.muscle !== 'select a muscle' ? `<div class="exercise-selection-group"><label>Exercises:</label>${exerciseDropdowns}</div>` : ''}
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
        addDayToBuilder() { this.state.builderPlan.days.push({ label: 'Add a label', muscleGroups: [] }); this.renderBuilder(); },
        deleteDayFromBuilder(dayIndex) { this.state.builderPlan.days.splice(dayIndex, 1); this.renderBuilder(); },
        updateDayLabel(dayIndex, newLabel) { this.state.builderPlan.days[dayIndex].label = newLabel; },
        addMuscleGroupToDay(dayIndex) { this.state.builderPlan.days[dayIndex].muscleGroups.push({ muscle: 'select a muscle', focus: 'Primary', exercises: ['', '', ''] }); this.renderBuilder(); },
        deleteMuscleGroupFromDay(dayIndex, muscleIndex) { this.state.builderPlan.days[dayIndex].muscleGroups.splice(muscleIndex, 1); this.renderBuilder(); },
        updateMuscleGroup(dayIndex, muscleIndex, newMuscle) { this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].muscle = newMuscle; this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises = ['', '', '']; this.renderBuilder(); },
        updateMuscleFocus(dayIndex, muscleIndex, newFocus) { this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].focus = newFocus; this.renderBuilder(); },
        updateExerciseSelection(dayIndex, muscleIndex, exerciseSelectIndex, newExercise) { this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises[exerciseSelectIndex] = newExercise; },
        
        // Finalizes the custom plan from the builder
        finalizeAndStartPlan(mesoLength) {
            if (this.state.builderPlan.days.length === 0) {
                alert("Please add at least one day to your plan before saving.");
                return;
            }
            const newMeso = {
                id: `meso_${Date.now()}`,
                startDate: new Date().toISOString(),
                durationWeeks: parseInt(mesoLength) || 6,
                goal: 'custom',
                experience: this.state.userSelections.experience,
                weeks: {}
            };
            const focusSetMap = { 'Primary': 4, 'Secondary': 3, 'Maintenance': 2 };
            for (let i = 1; i <= newMeso.durationWeeks; i++) {
                newMeso.weeks[i] = {};
                const isDeload = (i === newMeso.durationWeeks);
                this.state.builderPlan.days.forEach((day, dayIndex) => {
                    newMeso.weeks[i][dayIndex + 1] = {
                        name: day.label === 'Add a label' ? `Day ${dayIndex + 1}` : day.label,
                        completed: false,
                        exercises: day.muscleGroups.flatMap(mg => 
                            mg.exercises.filter(ex => ex && ex !== 'Select an Exercise').map(exName => {
                                const exerciseDetails = this.state.exercises.find(e => e.name === exName) || {};
                                return {
                                    exerciseId: `ex_${exName.replace(/\s+/g, '_')}`,
                                    name: exName,
                                    muscle: exerciseDetails.muscle || 'Unknown',
                                    type: mg.focus,
                                    targetSets: isDeload ? Math.ceil(focusSetMap[mg.focus] / 2) : focusSetMap[mg.focus],
                                    targetReps: 10,
                                    targetRIR: isDeload ? 4 : 2,
                                    targetLoad: null,
                                    sets: []
                                };
                            })
                        )
                    };
                });
            }
            this.state.plan = newMeso;
            this.state.allPlans = [newMeso]; // For now, we just replace plans. We can change this to push later.
            this.state.currentView = { week: 1, day: 1 };
            this.saveStateToStorage();
            this.showView('home'); // Go to home screen after creating a plan
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
            // Deselect other cards in the same group
            element.parentElement.querySelectorAll('.goal-card').forEach(card => card.classList.remove('active'));
            element.classList.add('active');
        },
        finishOnboarding() {
            // Generates a plan based on the guided setup selections
            this.state.plan = this.generateMesocycle(
                this.state.userSelections.goal,
                this.state.userSelections.experience,
                this.state.userSelections.days,
                6 // Defaulting guided plans to 6 weeks
            );
            this.state.allPlans.push(this.state.plan);
            this.saveStateToStorage();
            this.showView('home');
        },
        
        // --- PLAN GENERATION & WORKOUT METHODS ---

        // NEW: Basic implementation to generate a template plan
        generateMesocycle(goal, experience, daysPerWeek, mesoLength) {
            console.log(`Generating a ${mesoLength}-week plan for a ${experience} user with a goal of ${goal}, training ${daysPerWeek} days a week.`);
            // This is a placeholder. A real implementation would have complex logic.
            // For now, let's create a very simple structure.
            const newMeso = {
                id: `meso_${Date.now()}`,
                startDate: new Date().toISOString(),
                durationWeeks: mesoLength,
                goal: goal,
                experience: experience,
                weeks: {}
            };
            // This is a dummy structure. We'll build this out later.
            newMeso.weeks[1] = {
                1: {
                    name: "Full Body Workout",
                    completed: false,
                    exercises: [
                        { exerciseId: "ex_squat", name: "Squat", muscle: "Quads", type: "Primary", targetSets: 3, targetReps: 10, targetRIR: 2, sets: [] },
                        { exerciseId: "ex_bench_press", name: "Bench Press", muscle: "Chest", type: "Primary", targetSets: 3, targetReps: 10, targetRIR: 2, sets: [] },
                        { exerciseId: "ex_pull_ups", name: "Pull Ups", muscle: "Back", type: "Primary", targetSets: 3, targetReps: 10, targetRIR: 2, sets: [] },
                    ]
                }
            };
            return newMeso;
        },

        // NEW: Basic implementation to render the daily workout view
        renderDailyWorkout(weekNumber, dayNumber) {
            const container = document.getElementById('exercise-list-container');
            const workoutTitle = document.getElementById('workout-day-title');
            const workoutDate = document.getElementById('workout-date');

            container.innerHTML = ''; // Clear previous content

            const today = new Date();
            workoutDate.textContent = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            if (!this.state.plan || !this.state.plan.weeks[weekNumber] || !this.state.plan.weeks[weekNumber][dayNumber]) {
                workoutTitle.textContent = "No Workout Today";
                container.innerHTML = `<p class="placeholder-text">You either have no workout scheduled for today or your plan is incomplete. Go to "Plan Mesocycle" to build your schedule.</p>`;
                return;
            }

            const workout = this.state.plan.weeks[weekNumber][dayNumber];
            workoutTitle.textContent = workout.name;

            if (workout.exercises.length === 0) {
                container.innerHTML = `<p class="placeholder-text">This workout has no exercises. Add some in the builder!</p>`;
                return;
            }

            workout.exercises.forEach((ex, index) => {
                const exerciseCard = document.createElement('div');
                exerciseCard.className = 'exercise-card';
                exerciseCard.innerHTML = `
                    <div class="exercise-card-header">
                        <h3>${ex.name}</h3>
                        <span class="exercise-target">${ex.targetSets} Sets &times; ${ex.targetReps} Reps @ RIR ${ex.targetRIR}</span>
                    </div>
                    <div class="sets-container" id="sets-for-ex-${index}">
                        <div class="set-row header">
                            <div class="set-number">SET</div>
                            <div class="set-inputs">
                                <span>WEIGHT (LBS)</span>
                                <span>REPS</span>
                                <span>RIR</span>
                            </div>
                        </div>
                        <!-- Sets will be added here -->
                    </div>
                    <button class="add-set-btn" data-exercise-index="${index}">+ Add Set</button>
                `;
                container.appendChild(exerciseCard);
            });
        },
        handleSetInput(inputElement) { /* ... same as before ... */ },
        addSet(exerciseIndex) { /* ... same as before ... */ },
        completeWorkout() { /* ... same as before ... */ },
        calculateNextWeekProgression(completedWeekNumber) { /* ... same as before ... */ },
        capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""; }
    };
    
    // Bind all methods to the app object to maintain correct `this` context
    for (const key in app) {
        if (typeof app[key] === 'function') {
            app[key] = app[key].bind(app);
        }
    }
    
    // Start the application
    app.init();
});
