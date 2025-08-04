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
                this.state.plan = this.generatePlan(this.state.userSelections);
                this.renderDashboard();
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
                // Provide fallback or show error message
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
            
            // Dynamic buttons inside modal need event delegation
            this.elements.modalBody.addEventListener('click', (e) => {
                if(e.target.id === 'submitWorkoutBtn') this.submitWorkout();
                if(e.target.id === 'saveManualAdjustBtn') this.saveManualAdjust();
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
            this.state.plan = this.generatePlan(this.state.userSelections);
            this.state.allPlans.push(this.state.plan);
            this.saveStateToStorage();
            this.renderDashboard();
        },

        // ===========================
        //  PLAN GENERATION
        // ===========================
        generatePlan({ goal, experience, style, days }) {
            const baseSets = experience === 'beginner' ? 8 : (experience === 'experienced' ? 12 : 16);
            const maxSets = baseSets + 4;
            const repRange = goal === 'muscle' ? [6, 12] : (goal === 'combined' ? [8, 15] : [12, 20]);
            const rir = experience === 'beginner' ? 3 : (experience === 'experienced' ? 2 : 1);

            let sessions = [];
            days = parseInt(days);
            if (days <= 3) {
                sessions = [
                    { name: "Full Body A", exercises: this.getExercisesByMuscle(["Chest","Back","Quads","Hamstrings"], 5, repRange, rir) },
                    { name: "Full Body B", exercises: this.getExercisesByMuscle(["Shoulders","Biceps","Triceps","Glutes","Core"], 5, repRange, rir) },
                    { name: "Full Body C", exercises: this.getExercisesByMuscle(["Chest","Back","Quads","Hamstrings"], 5, repRange, rir) }
                ];
            } else if (days === 4) {
                 sessions = [
                    { name: "Upper A", exercises: this.getExercisesByMuscle(["Chest","Back","Shoulders"], 5, repRange, rir) },
                    { name: "Lower A", exercises: this.getExercisesByMuscle(["Quads","Hamstrings","Glutes"], 5, repRange, rir) },
                    { name: "Upper B", exercises: this.getExercisesByMuscle(["Chest","Back","Biceps", "Triceps"], 5, repRange, rir) },
                    { name: "Lower B", exercises: this.getExercisesByMuscle(["Quads","Hamstrings","Glutes"], 5, repRange, rir) }
                ];
            } else { // 5+ days
                sessions = [
                    { name: "Push", exercises: this.getExercisesByMuscle(["Chest","Shoulders","Triceps"], 6, repRange, rir) },
                    { name: "Pull", exercises: this.getExercisesByMuscle(["Back","Biceps"], 6, repRange, rir) },
                    { name: "Legs", exercises: this.getExercisesByMuscle(["Quads","Hamstrings","Glutes","Core"], 6, repRange, rir) },
                    { name: "Push 2", exercises: this.getExercisesByMuscle(["Chest","Shoulders","Triceps"], 6, repRange, rir) },
                    { name: "Pull 2", exercises: this.getExercisesByMuscle(["Back","Biceps"], 6, repRange, rir) }
                ];
                if (days === 6) {
                    sessions.push({ name: "Legs 2", exercises: this.getExercisesByMuscle(["Quads","Hamstrings","Glutes","Core"], 6, repRange, rir) });
                }
            }
            
            return { id: Date.now(), goal, experience, style, days, week: 1, rirTarget: rir, currentVolume: baseSets, maxVolume: maxSets, sessions };
        },

        getExercisesByMuscle(muscleGroups, count, repRange, rir) {
            const filtered = this.state.exercises.filter(ex => muscleGroups.includes(ex.muscle));
            const chosen = [];
            for (let i = 0; i < count && filtered.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * filtered.length);
                const exercise = filtered[randomIndex];
                chosen.push({ name: exercise.name, sets: 3, reps: `${repRange[0]}-${repRange[1]}`, rir });
                filtered.splice(randomIndex, 1); // Avoid duplicate exercises in one session
            }
            return chosen;
        },

        // ===========================
        //  DASHBOARD & RENDERING
        // ===========================
        renderDashboard() {
            this.elements.onboardingContainer.style.display = "none";
            this.elements.dashboard.classList.remove('hidden');
            const plan = this.state.plan;

            document.getElementById('summaryGoal').textContent = this.capitalize(plan.goal);
            document.getElementById('summaryExperience').textContent = this.capitalize(plan.experience);
            document.getElementById('summaryDays').textContent = plan.days;
            document.getElementById('volumeSummary').textContent = `${plan.currentVolume} sets / ${plan.maxVolume} max`;
            document.getElementById('volumeProgress').style.width = `${(plan.currentVolume / plan.maxVolume) * 100}%`;
            
            this.renderCharts();
            this.loadWorkouts();
        },

        renderCharts() {
            const plan = this.state.plan;
            // Placeholder data generation - replace with real data from workout history
            const volumeData = [plan.currentVolume, plan.currentVolume + 5, plan.currentVolume + 10, plan.maxVolume];
            const loadData = [100, 110, 120, 130]; // Example static data
            const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

            // Volume Chart
            if (this.state.charts.volume) this.state.charts.volume.destroy();
            this.state.charts.volume = new Chart(document.getElementById('volumeChart'), {
                type: 'line',
                data: { labels, datasets: [{ label: 'Volume (Sets)', data: volumeData, borderColor: '#ff6b35', fill: false, tension: 0.3 }] }
            });

            // Load Chart
            if (this.state.charts.load) this.state.charts.load.destroy();
            this.state.charts.load = new Chart(document.getElementById('loadChart'), {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Average Load (Example)', data: loadData, backgroundColor: '#ff914d' }] }
            });
        },
        
        loadWorkouts() {
            const history = JSON.parse(localStorage.getItem('workoutHistory')) || [];
            this.elements.workoutList.innerHTML = "";
            history.forEach(w => {
                const li = document.createElement('li');
                li.textContent = `${w.notes || "Workout"} - Fatigue: ${w.fatigue} (on ${new Date(w.date).toLocaleDateString()})`;
                this.elements.workoutList.appendChild(li);
            });
        },

        // ===========================
        //  MODAL LOGIC
        // ===========================
        openModal(type) {
            let content = '';
            if (type === 'logWorkout') {
                content = `
                    <h2>Log Workout</h2>
                    <textarea id="workoutNotes" placeholder="Workout details..."></textarea>
                    <label for="fatigueScore">Fatigue Score (1–10):</label>
                    <input type="number" id="fatigueScore" min="1" max="10">
                    <button class="cta-button" id="submitWorkoutBtn">Submit</button>
                `;
            } else if (type === 'planner') {
                 content = `
                    <h2>Customize Your Plan</h2>
                    <div class="planner-form">
                        ${this.state.plan.sessions.map((session, sIndex) => `
                            <h3>${session.name}</h3>
                            ${session.exercises.map((ex, eIndex) => `
                                <div class="exercise-row">
                                    <input type="text" value="${ex.name}" readonly>
                                    <input type="number" id="sets-${sIndex}-${eIndex}" value="${ex.sets}" min="1">
                                    <input type="text" id="reps-${sIndex}-${eIndex}" value="${ex.reps}">
                                </div>
                            `).join('')}
                        `).join('')}
                        <button id="saveManualAdjustBtn">Save Changes</button>
                    </div>
                `;
            } else {
                content = `<h2>Settings</h2><p>Coming soon...</p>`;
            }
            this.elements.modalBody.innerHTML = content;
            this.elements.modal.classList.remove('hidden');
        },

        closeModal() {
            this.elements.modal.classList.add('hidden');
        },

        submitWorkout() {
            const fatigueScore = parseInt(document.getElementById('fatigueScore').value);
            const notes = document.getElementById('workoutNotes').value;

            if (!fatigueScore || fatigueScore < 1 || fatigueScore > 10) {
                alert("Please enter a valid fatigue score (1–10).");
                return;
            }

            const workout = { date: new Date().toISOString(), fatigue: fatigueScore, notes };
            let history = JSON.parse(localStorage.getItem('workoutHistory')) || [];
            history.push(workout);
            localStorage.setItem('workoutHistory', JSON.stringify(history));

            this.closeModal();
            this.loadWorkouts();
        },

        saveManualAdjust() {
            this.state.plan.sessions.forEach((session, sIndex) => {
                session.exercises.forEach((ex, eIndex) => {
                    ex.sets = parseInt(document.getElementById(`sets-${sIndex}-${eIndex}`).value);
                    ex.reps = document.getElementById(`reps-${sIndex}-${eIndex}`).value;
                });
            });
            // Update the plan in the main array and save
            const planIndex = this.state.allPlans.findIndex(p => p.id === this.state.plan.id);
            if(planIndex > -1) {
                this.state.allPlans[planIndex] = this.state.plan;
            }
            localStorage.setItem("savedPlans", JSON.stringify(this.state.allPlans));
            
            this.closeModal();
            this.renderDashboard();
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
