document.addEventListener('DOMContentLoaded', () => {

    const app = {
        state: {
            currentStep: 1,
            totalSteps: 6,
            userSelections: { 
                goal: "", 
                experience: "", 
                style: "", 
                days: "", 
                gender: "",
                height: "",
                weight: ""
            },
            plan: null,
            currentView: { week: 1, day: 1 },
            builderPlan: { days: [] },
            activeFeedback: { dayIndex: null, exerciseIndex: null },
            allPlans: [],
            exercises: [],
        },

        elements: {
            onboardingContainer: document.getElementById('onboarding-container'),
            homeScreen: document.getElementById('home-screen'),
            workoutView: document.getElementById('daily-workout-view'),
            builderView: document.getElementById('builder-view'),
            historyView: document.getElementById('history-view'),
            historyListContainer: document.getElementById('history-list-container'),
            scheduleContainer: document.getElementById('schedule-container'),
            progress: document.querySelector('.progress'),
            modal: document.getElementById('modal'),
            modalBody: document.getElementById('modal-body'),
            feedbackModal: document.getElementById('feedback-modal'),
            feedbackModalBody: document.getElementById('feedback-modal-body'),
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
            document.getElementById('reviewWorkoutsBtn')?.addEventListener('click', () => this.showView('history'));

            // Back Buttons
            document.getElementById('backToHomeBtn')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromBuilder')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromHistory')?.addEventListener('click', () => this.showView('home'));
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

            // Modal Listeners
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
            this.elements.feedbackModal.addEventListener('click', (e) => {
                if (e.target.matches('.pain-toggle button')) {
                    this.elements.feedbackModal.querySelectorAll('.pain-toggle button').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                }
                if (e.target.matches('#save-feedback-btn')) { this.saveExerciseFeedback(); }
            });
            this.elements.feedbackModal.addEventListener('input', (e) => {
                if (e.target.matches('.feedback-slider input')) {
                    document.getElementById(e.target.dataset.valueId).textContent = e.target.value;
                }
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
                if (e.target.matches('#complete-workout-btn')) { this.openCompletionModal(); }
            });
            this.elements.workoutView.addEventListener('input', (e) => {
                if(e.target.matches('.weight-input, .reps-input, .rir-input')) { this.handleSetInput(e.target); }
            });
        },
        
        openMesoLengthModal() { /* ... full function ... */ },
        closeModal() { this.elements.modal.classList.add('hidden'); },
        openFeedbackModal(exerciseIndex) { /* ... full function ... */ },
        closeFeedbackModal() { this.elements.feedbackModal.classList.add('hidden'); },
        saveExerciseFeedback() { /* ... full function ... */ },

        showView(viewName) {
            this.elements.onboardingContainer.classList.add('hidden');
            this.elements.homeScreen.classList.add('hidden');
            this.elements.workoutView.classList.add('hidden');
            this.elements.builderView.classList.add('hidden');
            this.elements.historyView.classList.add('hidden');
            if (viewName === 'onboarding') { this.elements.onboardingContainer.classList.remove('hidden'); this.showStep(this.state.currentStep); } 
            else if (viewName === 'home') { this.elements.homeScreen.classList.remove('hidden'); } 
            else if (viewName === 'workout') { this.elements.workoutView.classList.remove('hidden'); this.renderDailyWorkout(this.state.currentView.week, this.state.currentView.day); } 
            else if (viewName === 'builder') { this.elements.builderView.classList.remove('hidden'); this.renderBuilder(); }
            else if (viewName === 'history') { this.elements.historyView.classList.remove('hidden'); this.renderWorkoutHistory(); }
        },

        renderWorkoutHistory() {
            const container = this.elements.historyListContainer;
            container.innerHTML = '';
            const completedWorkouts = [];
            this.state.allPlans.forEach(plan => {
                for (const week in plan.weeks) {
                    for (const day in plan.weeks[week]) {
                        const dayData = plan.weeks[week][day];
                        if (dayData.completed) {
                            completedWorkouts.push({
                                date: new Date(plan.startDate),
                                weekNum: week,
                                dayNum: day,
                                ...dayData
                            });
                        }
                    }
                }
            });
            if (completedWorkouts.length === 0) {
                container.innerHTML = `<p class="placeholder-text">You haven't completed any workouts yet.</p>`;
                return;
            }
            completedWorkouts.sort((a, b) => b.date - a.date);
            completedWorkouts.forEach(workout => {
                const card = document.createElement('div');
                card.className = 'history-item-card';
                const exercisesHTML = workout.exercises.map(ex => {
                    const lastSet = ex.sets.filter(s => s.load && s.reps).pop();
                    return `<li>${ex.name} - <i>Top set: ${lastSet ? `${lastSet.load} lbs x ${lastSet.reps} reps` : 'N/A'}</i></li>`;
                }).join('');
                card.innerHTML = `
                    <div class="history-item-header">
                        <h3>${workout.name} (W${workout.weekNum}D${workout.dayNum})</h3>
                        <span>${new Date(workout.date).toLocaleDateString()}</span>
                    </div>
                    <ul class="history-exercise-list">${exercisesHTML}</ul>
                    ${workout.notes ? `<p><strong>Notes:</strong> ${workout.notes}</p>` : ''}
                `;
                container.appendChild(card);
            });
        },

        renderBuilder() { /* ... full function ... */ },
        addDayToBuilder() { /* ... full function ... */ },
        toggleRecoveryDay(dayIndex) { /* ... full function ... */ },
        deleteDayFromBuilder(dayIndex) { /* ... full function ... */ },
        updateDayLabel(dayIndex, newLabel) { /* ... full function ... */ },
        addMuscleGroupToDay(dayIndex) { /* ... full function ... */ },
        deleteMuscleGroupFromDay(dayIndex, muscleIndex) { /* ... full function ... */ },
        updateMuscleGroup(dayIndex, muscleIndex, newMuscle) { /* ... full function ... */ },
        updateMuscleFocus(dayIndex, muscleIndex, newFocus) { /* ... full function ... */ },
        updateExerciseSelection(dayIndex, muscleIndex, exerciseSelectIndex, newExercise) { /* ... full function ... */ },
        finalizeAndStartPlan(mesoLength) { /* ... full function ... */ },
        savePersonalDetails() { /* ... full function ... */ },
        showStep(stepNumber) { /* ... full function ... */ },
        updateProgress() { /* ... full function ... */ },
        nextStep() { /* ... full function ... */ },
        previousStep() { /* ... full function ... */ },
        validateStep(field) { /* ... full function ... */ },
        validateAndProceed(field) { /* ... full function ... */ },
        selectCard(element, field, value) { /* ... full function ... */ },
        finishOnboarding() { /* ... full function ... */ },
        generateMesocycle(goal, experience, daysPerWeek) { /* ... full function ... */ },
        renderDailyWorkout(weekNumber, dayNumber) { /* ... full function ... */ },
        handleSetInput(inputElement) { /* ... full function ... */ },
        addSet(exerciseIndex) { /* ... full function ... */ },
        
        openCompletionModal() {
            const modalBody = this.elements.modalBody;
            modalBody.innerHTML = `
                <h2>Workout Complete!</h2>
                <p>Great job. Log how you felt for a better summary later.</p>
                <div>
                    <label for="fatigueScoreInput">Fatigue Score (1-10)</label>
                    <input type="number" id="fatigueScoreInput" min="1" max="10" placeholder="e.g., 7">
                </div>
                <div>
                    <label for="workoutNotesInput">Workout Notes</label>
                    <textarea id="workoutNotesInput" rows="4" placeholder="Any pain? Great pump?"></textarea>
                </div>
                <button class="cta-button" id="save-workout-details-btn">Save Workout</button>
            `;
            this.elements.modal.classList.remove('hidden');
        },

        completeWorkout() {
            this.openCompletionModal();
        },

        saveCompletedWorkout() {
            const { week, day } = this.state.currentView;
            const plan = this.state.plan;
            const fatigueScore = document.getElementById('fatigueScoreInput').value;
            const notes = document.getElementById('workoutNotesInput').value;
            plan.weeks[week][day].fatigue = fatigueScore;
            plan.weeks[week][day].notes = notes;
            plan.weeks[week][day].completed = true;
            const planIndex = this.state.allPlans.findIndex(p => p.id === plan.id);
            if (planIndex > -1) { this.state.allPlans[planIndex] = plan; } 
            else { this.state.allPlans.push(plan); }
            
            let nextDay = day + 1;
            let nextWeek = week;
            
            const daysPerWeek = Object.keys(plan.weeks[week]).length;

            if (day >= daysPerWeek) {
                this.calculateNextWeekProgression(week);
                alert(`Week ${week} complete! Your plan for next week has been updated based on your performance.`);
                nextDay = 1;
                nextWeek++;
            }

            if (nextWeek > plan.durationWeeks) {
                alert("Mesocycle complete! Well done!");
                this.state.currentView = { week: 1, day: 1 };
            } else {
                this.state.currentView = { week: nextWeek, day: nextDay };
            }
            this.saveStateToStorage();
            this.closeModal();
            alert(`Workout for Week ${week}, Day ${day} saved!`);
            this.showView('home');
        },

        calculateNextWeekProgression(completedWeekNumber) { /* ... full function ... */ },
        capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""; }
    };
    
    for (const key in app) {
        if (typeof app[key] === 'function') {
            app[key] = app[key].bind(app);
        }
    }
    
    app.init();
});
