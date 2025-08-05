document.addEventListener('DOMContentLoaded', () => {

    const app = {
        state: {
            currentStep: 1,
            totalSteps: 6, // UPDATED
            userSelections: { 
                goal: "", 
                experience: "", 
                style: "", 
                days: "", 
                // mesoLength removed from initial onboarding
                gender: "",
                height: "",
                weight: ""
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
                const savedView = JSON.parse(localStorage.getItem("currentView"));
                if (savedView) {
                    this.state.currentView = savedView;
                }
            }
        },

        saveStateToStorage() {
            localStorage.setItem("onboardingCompleted", "true");
            localStorage.setItem("userSelections", JSON.stringify(this.state.userSelections));
            localStorage.setItem("savedPlans", JSON.stringify(this.state.allPlans));
            localStorage.setItem("currentView", JSON.stringify(this.state.currentView));
        },

        addEventListeners() {
            // Onboarding Buttons
            document.getElementById('beginOnboardingBtn')?.addEventListener('click', () => this.nextStep());
            document.getElementById('goalNextBtn')?.addEventListener('click', () => this.validateAndProceed('goal'));
            document.getElementById('experienceNextBtn')?.addEventListener('click', () => this.validateAndProceed('experience'));
            document.getElementById('prefsNextBtn')?.addEventListener('click', () => {
                if (this.validateStep('style') && this.validateStep('days')) { this.nextStep(); }
            });
            document.getElementById('skipDetailsBtn')?.addEventListener('click', () => this.nextStep());
            document.getElementById('detailsNextBtn')?.addEventListener('click', () => { this.savePersonalDetails(); this.nextStep(); });
            document.getElementById('finishOnboardingBtn')?.addEventListener('click', () => this.finishOnboarding());
            
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
                if (e.target.matches('.day-toggle-btn')) { this.toggleRecoveryDay(dayIndex); }
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
            document.querySelectorAll('.card-group .goal-card').forEach(card => { /* ... */ });
            // Workout View Listeners
            this.elements.workoutView.addEventListener('click', (e) => { /* ... */ });
            this.elements.workoutView.addEventListener('input', (e) => { /* ... */ });
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

        renderBuilder() {
            const container = this.elements.scheduleContainer;
            container.innerHTML = ''; 
            if (this.state.builderPlan.days.length === 0) {
                container.innerHTML = `<p class="placeholder-text">Click "Add a Day" to start building your schedule.</p>`;
                return;
            }
            this.state.builderPlan.days.forEach((day, dayIndex) => {
                const dayCard = document.createElement('div');
                dayCard.className = 'day-card';
                let dayContentHTML = '';

                if (day.isRecovery) {
                    dayContentHTML = `
                        <div class="recovery-day-content">
                            <div class="icon">🧘</div>
                            <h3>Recovery Day</h3>
                            <p>Rest is essential for growth.</p>
                        </div>
                    `;
                } else {
                    const muscleOptions = ['Select a Muscle', ...new Set(this.state.exercises.map(ex => ex.muscle))].map(m => `<option value="${m.toLowerCase()}">${this.capitalize(m)}</option>`).join('');
                    const muscleGroupsHTML = day.muscleGroups.map((mg, muscleIndex) => {
                        const exercisesForMuscle = this.state.exercises.filter(ex => ex.muscle.toLowerCase() === mg.muscle);
                        const exerciseOptions = [{name: 'Select an Exercise'}, ...exercisesForMuscle].map(ex => `<option value="${ex.name}">${ex.name}</option>`).join('');
                        const exerciseDropdowns = [0, 1, 2].map(exerciseSelectIndex => `
                            <select class="builder-select exercise-select" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" data-exercise-select-index="${exerciseSelectIndex}">
                                ${exerciseOptions.replace(`value="${mg.exercises[exerciseSelectIndex]}"`, `value="${mg.exercises[exerciseSelectIndex]}" selected`)}
                            </select>
                        `).join('');
                        const focusButtons = ['Primary', 'Secondary', 'Maintenance'].map(focusLevel => `<button class="focus-btn ${mg.focus === focusLevel ? 'active' : ''}" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" data-focus="${focusLevel}">${focusLevel}</button>`).join('');
                        return `
                            <div class="muscle-group-block">
                                <div class="muscle-group-header">
                                    <div class="muscle-group-selectors">
                                        <select class="builder-select muscle-select" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}">${muscleOptions.replace(`value="${mg.muscle}"`, `value="${mg.muscle}" selected`)}</select>
                                        <div class="focus-buttons">${focusButtons}</div>
                                    </div>
                                    <button class="delete-btn delete-muscle-group-btn" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}">🗑️</button>
                                </div>
                                ${mg.muscle !== 'select a muscle' ? `<div class="exercise-selection-group"><label>Exercises:</label>${exerciseDropdowns}</div>` : ''}
                            </div>
                        `;
                    }).join('');
                    dayContentHTML = `
                        ${muscleGroupsHTML}
                        <button class="cta-button secondary-button add-muscle-group-btn" data-day-index="${dayIndex}">+ Add a Muscle Group</button>
                    `;
                }

                dayCard.innerHTML = `
                    <div class="day-header">
                        <div class="day-header-left">
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
                            <button class="cta-button secondary-button day-toggle-btn" data-day-index="${dayIndex}">
                                ${day.isRecovery ? 'Set as Training Day' : 'Set as Recovery Day'}
                            </button>
                        </div>
                        <button class="delete-btn delete-day-btn" data-day-index="${dayIndex}">🗑️</button>
                    </div>
                    <div class="day-content">
                        ${dayContentHTML}
                    </div>
                `;
                container.appendChild(dayCard);
            });
        },
        addDayToBuilder() { this.state.builderPlan.days.push({ label: 'Add a label', isRecovery: false, muscleGroups: [] }); this.renderBuilder(); },
        toggleRecoveryDay(dayIndex) { this.state.builderPlan.days[dayIndex].isRecovery = !this.state.builderPlan.days[dayIndex].isRecovery; this.renderBuilder(); },
        deleteDayFromBuilder(dayIndex) { this.state.builderPlan.days.splice(dayIndex, 1); this.renderBuilder(); },
        updateDayLabel(dayIndex, newLabel) { this.state.builderPlan.days[dayIndex].label = newLabel; },
        addMuscleGroupToDay(dayIndex) { this.state.builderPlan.days[dayIndex].muscleGroups.push({ muscle: 'select a muscle', focus: 'Primary', exercises: ['', '', ''] }); this.renderBuilder(); },
        deleteMuscleGroupFromDay(dayIndex, muscleIndex) { this.state.builderPlan.days[dayIndex].muscleGroups.splice(muscleIndex, 1); this.renderBuilder(); },
        updateMuscleGroup(dayIndex, muscleIndex, newMuscle) { this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].muscle = newMuscle; this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises = ['', '', '']; this.renderBuilder(); },
        updateMuscleFocus(dayIndex, muscleIndex, newFocus) { this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].focus = newFocus; this.renderBuilder(); },
        updateExerciseSelection(dayIndex, muscleIndex, exerciseSelectIndex, newExercise) { this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises[exerciseSelectIndex] = newExercise; },
        finalizeAndStartPlan(mesoLength) {
            // ... (Full function from previous version)
        },
        savePersonalDetails() {
            const genderCard = document.querySelector('.card-group[data-field="gender"] .goal-card.active');
            this.state.userSelections.gender = genderCard ? genderCard.dataset.value : "";
            this.state.userSelections.height = document.getElementById('heightInput').value;
            this.state.userSelections.weight = document.getElementById('weightInput').value;
        },
        showStep(stepNumber) { /* ... */ },
        updateProgress() { /* ... */ },
        nextStep() { /* ... */ },
        previousStep() { /* ... */ },
        validateStep(field) { /* ... */ },
        validateAndProceed(field) { /* ... */ },
        selectCard(element, field, value) { /* ... */ },
        finishOnboarding() { /* ... */ },
        generateMesocycle(goal, experience, daysPerWeek, mesoLength) { /* ... */ },
        renderDailyWorkout(weekNumber, dayNumber) { /* ... */ },
        handleSetInput(inputElement) { /* ... */ },
        addSet(exerciseIndex) { /* ... */ },
        completeWorkout() { /* ... */ },
        calculateNextWeekProgression(completedWeekNumber) { /* ... */ },
        capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""; }
    };
    
    // Bind 'this' to all functions
    for (const key in app) {
        if (typeof app[key] === 'function') { app[key] = app[key].bind(app); }
    }
    app.init();
});
