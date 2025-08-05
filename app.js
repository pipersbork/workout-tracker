document.addEventListener('DOMContentLoaded', () => {

    const app = {
        state: {
            currentStep: 1,
            totalSteps: 4,
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

        // Fetches the list of exercises from the JSON file
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
                 // Set the main plan from allPlans if it exists
                if (this.state.allPlans.length > 0) {
                    this.state.plan = this.state.allPlans[0];
                }
            }
        },

        // Saves user data to localStorage
        saveStateToStorage() {
            localStorage.setItem("onboardingCompleted", "true");
            localStorage.setItem("userSelections", JSON.stringify(this.state.userSelections));
            // Make sure the current plan is updated in the allPlans array before saving
            if (this.state.plan) {
                const planIndex = this.state.allPlans.findIndex(p => p.id === this.state.plan.id);
                if (planIndex > -1) {
                    this.state.allPlans[planIndex] = this.state.plan;
                } else {
                    this.state.allPlans.push(this.state.plan);
                }
            }
            localStorage.setItem("savedPlans", JSON.stringify(this.state.allPlans));
            localStorage.setItem("currentView", JSON.stringify(this.state.currentView));
        },

        // Central location for all event listeners
        addEventListeners() {
            // Onboarding Buttons
            document.getElementById('beginOnboardingBtn')?.addEventListener('click', () => this.nextStep());
            document.getElementById('goalNextBtn')?.addEventListener('click', () => this.validateAndProceed('goal'));
            document.getElementById('experienceNextBtn')?.addEventListener('click', () => this.validateAndProceed('experience'));
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
            document.querySelectorAll('.card-group').forEach(group => {
                group.addEventListener('click', (e) => {
                    const card = e.target.closest('.goal-card');
                    if (card) {
                        const field = card.closest('.card-group').dataset.field;
                        const value = card.dataset.value;
                        this.selectCard(card, field, value);
                    }
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
            
            // UPDATED: Map to control number of exercise slots shown in the UI
            const exerciseSlotsByFocus = { 
                'Primary': 3, 
                'Secondary': 2, 
                'Maintenance': 1 
            };

            this.state.builderPlan.days.forEach((day, dayIndex) => {
                const dayCard = document.createElement('div');
                dayCard.className = 'day-card';
                const muscleGroupsHTML = day.muscleGroups.map((mg, muscleIndex) => {
                    const exercisesForMuscle = this.state.exercises.filter(ex => ex.muscle.toLowerCase() === mg.muscle);
                    const exerciseOptions = [{name: 'Select an Exercise'}, ...exercisesForMuscle].map(ex => `<option value="${ex.name}">${ex.name}</option>`).join('');
                    
                    // UPDATED: Dynamically create dropdowns based on focus
                    const numSlots = exerciseSlotsByFocus[mg.focus] || 3; // Default to 3
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
        addMuscleGroupToDay(dayIndex) { 
            // When adding a new group, it defaults to Primary, which has 3 exercise slots.
            // The underlying array will always have 3 slots to prevent data loss when switching focus.
            this.state.builderPlan.days[dayIndex].muscleGroups.push({ muscle: 'select a muscle', focus: 'Primary', exercises: ['', '', ''] }); 
            this.renderBuilder(); 
        },
        deleteMuscleGroupFromDay(dayIndex, muscleIndex) { this.state.builderPlan.days[dayIndex].muscleGroups.splice(muscleIndex, 1); this.renderBuilder(); },
        updateMuscleGroup(dayIndex, muscleIndex, newMuscle) { this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].muscle = newMuscle; this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises = ['', '', '']; this.renderBuilder(); },
        updateMuscleFocus(dayIndex, muscleIndex, newFocus) { 
            this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].focus = newFocus; 
            this.renderBuilder(); // Re-render to show the correct number of exercise slots
        },
        updateExerciseSelection(dayIndex, muscleIndex, exerciseSelectIndex, newExercise) { this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises[exerciseSelectIndex] = newExercise; },
        
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
            
            const focusSetMap = { 
                'Primary': 5,
                'Secondary': 4,
                'Maintenance': 2
            };

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
                                const setsPerExercise = focusSetMap[mg.focus] || 3;
                                return {
                                    exerciseId: `ex_${exName.replace(/\s+/g, '_')}`,
                                    name: exName,
                                    muscle: exerciseDetails.muscle || 'Unknown',
                                    type: mg.focus,
                                    targetSets: isDeload ? Math.ceil(setsPerExercise / 2) : setsPerExercise,
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
                6
            );
            this.state.allPlans.push(this.state.plan);
            this.saveStateToStorage();
            this.showView('home');
        },
        
        // --- PLAN GENERATION & WORKOUT METHODS ---
        getExercisesByMuscle(muscles, count) {
            const allExercises = this.state.exercises.filter(ex => muscles.includes(ex.muscle));
            // Simple shuffle and slice to get variety
            return allExercises.sort(() => 0.5 - Math.random()).slice(0, count);
        },

        generateMesocycle(goal, experience, daysPerWeek, mesoLength) {
            console.log(`Generating a ${mesoLength}-week plan for a ${experience} user with a goal of ${goal}, training ${daysPerWeek} days a week.`);
            
            const planTemplates = {
                '3': { name: "Full Body Split", days: ["Full Body A", "Full Body B", "Full Body C"]},
                '4': { name: "Upper/Lower Split", days: ["Upper A", "Lower A", "Upper B", "Lower B"]},
                '5': { name: "Push/Pull/Legs Split", days: ["Push", "Pull", "Legs", "Upper", "Lower"]},
                '6': { name: "Push/Pull/Legs x2", days: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"]}
            };

            const dayTemplates = {
                "Full Body A": [ {muscles: ["Chest", "Back"], count: 1}, {muscles: ["Quads"], count: 1}, {muscles: ["Shoulders"], count: 1} ],
                "Full Body B": [ {muscles: ["Chest", "Back"], count: 1}, {muscles: ["Hamstrings"], count: 1}, {muscles: ["Biceps", "Triceps"], count: 1} ],
                "Full Body C": [ {muscles: ["Chest"], count: 1}, {muscles: ["Back"], count: 1}, {muscles: ["Quads", "Hamstrings"], count: 1} ],
                "Upper A": [ {muscles: ["Chest"], count: 2}, {muscles: ["Back"], count: 2}, {muscles: ["Shoulders"], count: 1}, {muscles: ["Biceps"], count: 1}, {muscles: ["Triceps"], count: 1} ],
                "Lower A": [ {muscles: ["Quads"], count: 2}, {muscles: ["Hamstrings"], count: 2}, {muscles: ["Calves"], count: 1} ],
                "Upper B": [ {muscles: ["Back"], count: 2}, {muscles: ["Chest"], count: 2}, {muscles: ["Shoulders"], count: 1}, {muscles: ["Biceps"], count: 1}, {muscles: ["Triceps"], count: 1} ],
                "Lower B": [ {muscles: ["Hamstrings"], count: 2}, {muscles: ["Quads"], count: 2}, {muscles: ["Calves"], count: 1} ],
                "Push": [ {muscles: ["Chest"], count: 2}, {muscles: ["Shoulders"], count: 2}, {muscles: ["Triceps"], count: 2} ],
                "Pull": [ {muscles: ["Back"], count: 3}, {muscles: ["Biceps"], count: 2} ],
                "Legs": [ {muscles: ["Quads"], count: 2}, {muscles: ["Hamstrings"], count: 2}, {muscles: ["Calves"], count: 2} ],
                "Upper": [ {muscles: ["Chest"], count: 2}, {muscles: ["Back"], count: 2}, {muscles: ["Shoulders", "Biceps", "Triceps"], count: 1} ],
                "Lower": [ {muscles: ["Quads", "Hamstrings"], count: 2}, {muscles: ["Calves"], count: 1} ],
                "Push A": [ {muscles: ["Chest"], count: 2}, {muscles: ["Shoulders"], count: 1}, {muscles: ["Triceps"], count: 1} ],
                "Pull A": [ {muscles: ["Back"], count: 2}, {muscles: ["Biceps"], count: 1} ],
                "Legs A": [ {muscles: ["Quads"], count: 2}, {muscles: ["Hamstrings"], count: 1} ],
                "Push B": [ {muscles: ["Shoulders"], count: 2}, {muscles: ["Chest"], count: 1}, {muscles: ["Triceps"], count: 1} ],
                "Pull B": [ {muscles: ["Back"], count: 2}, {muscles: ["Biceps"], count: 1} ],
                "Legs B": [ {muscles: ["Hamstrings"], count: 2}, {muscles: ["Quads"], count: 1} ],
            };

            const selectedTemplate = planTemplates[daysPerWeek] || planTemplates['3']; // Default to 3 days
            const newMeso = {
                id: `meso_${Date.now()}`,
                startDate: new Date().toISOString(),
                durationWeeks: mesoLength,
                goal: goal,
                experience: experience,
                weeks: {}
            };

            const setsByExperience = { beginner: 3, experienced: 4, advanced: 4 };
            const targetSets = setsByExperience[experience] || 3;

            for (let week = 1; week <= mesoLength; week++) {
                newMeso.weeks[week] = {};
                const isDeload = (week === mesoLength);

                selectedTemplate.days.forEach((dayName, index) => {
                    const dayNumber = index + 1;
                    const workoutExercises = [];
                    const dayComposition = dayTemplates[dayName.replace(/ [AB]$/, '')] || dayTemplates[dayName]; // Handles "Upper A" -> "Upper"
                    
                    dayComposition.forEach(group => {
                        this.getExercisesByMuscle(group.muscles, group.count).forEach(ex => {
                            workoutExercises.push({
                                exerciseId: ex.id,
                                name: ex.name,
                                muscle: ex.muscle,
                                type: 'Primary', // Simplified for generated plans
                                targetSets: isDeload ? Math.ceil(targetSets / 2) : targetSets,
                                targetReps: 10,
                                targetRIR: isDeload ? 4 : 2,
                                targetLoad: null, // User establishes weight on first go
                                sets: []
                            });
                        });
                    });

                    newMeso.weeks[week][dayNumber] = {
                        name: dayName,
                        completed: false,
                        exercises: workoutExercises
                    };
                });
            }

            return newMeso;
        },

        renderDailyWorkout(weekNumber, dayNumber) {
            const container = document.getElementById('exercise-list-container');
            const workoutTitle = document.getElementById('workout-day-title');
            const workoutDate = document.getElementById('workout-date');
            container.innerHTML = ''; 

            const today = new Date();
            workoutDate.textContent = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            if (!this.state.plan || !this.state.plan.weeks[weekNumber] || !this.state.plan.weeks[weekNumber][dayNumber]) {
                workoutTitle.textContent = "No Workout Today";
                container.innerHTML = `<p class="placeholder-text">You either have no workout scheduled for today or your plan is incomplete. Go to "Plan Mesocycle" to build your schedule.</p>`;
                document.getElementById('complete-workout-btn').classList.add('hidden');
                return;
            }
             document.getElementById('complete-workout-btn').classList.remove('hidden');

            const workout = this.state.plan.weeks[weekNumber][dayNumber];
            workoutTitle.textContent = workout.name;

            if (workout.exercises.length === 0) {
                container.innerHTML = `<p class="placeholder-text">This workout has no exercises. Add some in the builder!</p>`;
                return;
            }

            workout.exercises.forEach((ex, exIndex) => {
                const setsHTML = ex.sets.map((set, setIndex) => this.createSetRowHTML(exIndex, setIndex, set.weight, set.reps, set.rir)).join('');
                const exerciseCard = document.createElement('div');
                exerciseCard.className = 'exercise-card';
                exerciseCard.innerHTML = `
                    <div class="exercise-card-header">
                        <h3>${ex.name}</h3>
                        <span class="exercise-target">${ex.targetSets} Sets &times; ${ex.targetReps} Reps @ RIR ${ex.targetRIR}</span>
                    </div>
                    <div class="sets-container" id="sets-for-ex-${exIndex}">
                        <div class="set-row header">
                            <div class="set-number">SET</div>
                            <div class="set-inputs">
                                <span>WEIGHT (LBS)</span>
                                <span>REPS</span>
                                <span>RIR</span>
                            </div>
                        </div>
                        ${setsHTML}
                    </div>
                    <button class="add-set-btn" data-exercise-index="${exIndex}">+ Add Set</button>
                `;
                container.appendChild(exerciseCard);
            });
        },

        createSetRowHTML(exIndex, setIndex, weight, reps, rir) {
            return `
                <div class="set-row" data-set-index="${setIndex}">
                    <div class="set-number">${setIndex + 1}</div>
                    <div class="set-inputs">
                        <input type="number" class="weight-input" placeholder="-" value="${weight || ''}" data-exercise-index="${exIndex}" data-set-index="${setIndex}">
                        <input type="number" class="reps-input" placeholder="-" value="${reps || ''}" data-exercise-index="${exIndex}" data-set-index="${setIndex}">
                        <input type="number" class="rir-input" placeholder="-" value="${rir || ''}" data-exercise-index="${exIndex}" data-set-index="${setIndex}">
                    </div>
                </div>
            `;
        },

        handleSetInput(inputElement) {
            const { exerciseIndex, setIndex } = inputElement.dataset;
            const value = parseFloat(inputElement.value);
            const property = inputElement.classList.contains('weight-input') ? 'weight' :
                             inputElement.classList.contains('reps-input') ? 'reps' : 'rir';
            
            const workout = this.state.plan.weeks[this.state.currentView.week][this.state.currentView.day];
            if(workout && workout.exercises[exerciseIndex] && workout.exercises[exerciseIndex].sets[setIndex]) {
               workout.exercises[exerciseIndex].sets[setIndex][property] = value;
            }
        },

        addSet(exerciseIndex) {
            const workout = this.state.plan.weeks[this.state.currentView.week][this.state.currentView.day];
            const exercise = workout.exercises[exerciseIndex];
            
            const previousWeight = exercise.sets.length > 0 ? exercise.sets[exercise.sets.length - 1].weight : (exercise.targetLoad || '');
            
            exercise.sets.push({ weight: previousWeight, reps: '', rir: '' });

            const setContainer = document.getElementById(`sets-for-ex-${exerciseIndex}`);
            const newSetIndex = exercise.sets.length - 1;
            const newSetHTML = this.createSetRowHTML(exerciseIndex, newSetIndex, previousWeight, '', '');
            setContainer.insertAdjacentHTML('beforeend', newSetHTML);
        },

        completeWorkout() {
            if (!confirm("Are you sure you want to complete this workout?")) return;

            const { week, day } = this.state.currentView;
            const workout = this.state.plan.weeks[week][day];
            workout.completed = true;

            // Only calculate progression if it's not the last week (which is a deload)
            if (week < this.state.plan.durationWeeks -1) {
                this.calculateNextWeekProgression(week);
            }

            const dayKeys = Object.keys(this.state.plan.weeks[week]).sort((a,b) => a - b);
            const currentDayIndex = dayKeys.indexOf(day.toString());
            
            let nextWeek = week;
            let nextDay = null;

            if (currentDayIndex < dayKeys.length - 1) {
                nextDay = parseInt(dayKeys[currentDayIndex + 1]);
            } else {
                if (week < this.state.plan.durationWeeks) {
                    nextWeek = week + 1;
                    const nextWeekDayKeys = Object.keys(this.state.plan.weeks[nextWeek]).sort((a,b) => a - b);
                    nextDay = parseInt(nextWeekDayKeys[0]);
                } else {
                    alert("Congratulations! You've completed your mesocycle!");
                    this.showView('home');
                    this.state.currentView = { week: 1, day: 1 }; 
                    this.saveStateToStorage();
                    return;
                }
            }
            
            this.state.currentView = { week: nextWeek, day: nextDay };
            this.saveStateToStorage();
            alert("Workout saved! Great job!");
            this.showView('home');
        },

        calculateNextWeekProgression(completedWeekNumber) {
            const nextWeekNumber = completedWeekNumber + 1;
            if (!this.state.plan.weeks[nextWeekNumber]) {
                console.log("End of mesocycle, no progression to calculate.");
                return;
            }

            // Iterate through each day of the completed week
            for (const dayKey in this.state.plan.weeks[completedWeekNumber]) {
                const completedDay = this.state.plan.weeks[completedWeekNumber][dayKey];
                const nextWeekDay = this.state.plan.weeks[nextWeekNumber][dayKey];

                if (!nextWeekDay) continue; // Skip if there's no corresponding day next week

                // Iterate through each exercise of the completed day
                completedDay.exercises.forEach((completedEx, exIndex) => {
                    const nextWeekEx = nextWeekDay.exercises.find(ex => ex.exerciseId === completedEx.exerciseId);
                    if (!nextWeekEx) return; // Skip if exercise doesn't exist next week

                    let successfulSets = 0;
                    let lastSetWeight = completedEx.targetLoad || 0;

                    if (completedEx.sets.length === 0) { // If user didn't do the exercise
                        nextWeekEx.targetLoad = completedEx.targetLoad; // Keep the same weight
                        return;
                    }

                    // Analyze performance for each set
                    completedEx.sets.forEach(set => {
                        // A set is "successful" if reps are met or exceeded
                        if (set.reps >= completedEx.targetReps) {
                            successfulSets++;
                        }
                        lastSetWeight = set.weight; // Keep track of the last used weight
                    });

                    // Progression Logic: If all sets were successful, increase the weight
                    if (successfulSets >= completedEx.targetSets) {
                        // Simple progression: add 5 lbs. Can be made more complex later.
                        nextWeekEx.targetLoad = lastSetWeight + 5;
                        console.log(`Progressing ${nextWeekEx.name}: New target load is ${nextWeekEx.targetLoad} lbs.`);
                    } else {
                        // If not all sets were successful, keep the same weight for next week
                        nextWeekEx.targetLoad = lastSetWeight;
                        console.log(`Maintaining ${nextWeekEx.name}: Target load remains ${nextWeekEx.targetLoad} lbs.`);
                    }
                });
            }
        },
        capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""; }
    };
    
    for (const key in app) {
        if (typeof app[key] === 'function') {
            app[key] = app[key].bind(app);
        }
    }
    
    app.init();
});
