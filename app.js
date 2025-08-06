// --- FIREBASE SDK IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDSInOWrqR-AF2V8tv3vXIelnMCWROXKww",
  authDomain: "progression-700a3.firebaseapp.com",
  projectId: "progression-700a3",
  storageBucket: "progression-700a3.firebasestorage.app",
  messagingSenderId: "525938060953",
  appId: "1:525938060953:web:e453db795cd89aabc15208"
};

// --- FIREBASE INITIALIZATION ---
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);


document.addEventListener('DOMContentLoaded', () => {

    const app = {
        viewMap: {
            onboarding: 'onboarding-container',
            home: 'home-screen',
            builder: 'builder-view',
            workout: 'daily-workout-view',
            performanceSummary: 'performance-summary-view',
            settings: 'settings-view',
        },

        state: {
            userId: null,
            isDataLoaded: false,
            currentStep: 1,
            totalSteps: 4,
            userSelections: { 
                goal: null, 
                experience: null, 
                style: null,
                onboardingCompleted: false
            },
            settings: {
                units: 'lbs',
                theme: 'dark',
                progressionModel: 'double',
                weightIncrement: 5
            },
            allPlans: [],
            activePlanId: null, 
            editingPlanId: null,
            currentView: { week: 1, day: 1 },
            currentViewName: 'onboarding',
            builderPlan: {
                days: [] 
            },
            exercises: [],
            progressChart: null,
            volumeChart: null,
        },

        elements: {
            onboardingContainer: document.getElementById('onboarding-container'),
            homeScreen: document.getElementById('home-screen'),
            workoutView: document.getElementById('daily-workout-view'),
            builderView: document.getElementById('builder-view'),
            performanceSummaryView: document.getElementById('performance-summary-view'),
            settingsView: document.getElementById('settings-view'),
            scheduleContainer: document.getElementById('schedule-container'),
            progress: document.querySelector('.progress'),
            modal: document.getElementById('modal'),
            modalBody: document.getElementById('modal-body'),
            modalActions: document.getElementById('modal-actions'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            activePlanDisplay: document.getElementById('active-plan-display'),
            builderTitle: document.getElementById('builder-title'),
            planManagementList: document.getElementById('plan-management-list'),
        },

        async init() {
            await this.loadExercises();
            this.addEventListeners();
            this.handleAuthentication();
        },

        handleAuthentication() {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    this.state.userId = user.uid;
                    await this.loadStateFromFirestore();
                    this.applyTheme();
                    if (this.state.userSelections.onboardingCompleted) {
                        this.showView('home', true);
                    } else {
                        this.showView('onboarding', true);
                    }
                } else {
                    signInAnonymously(auth).catch((error) => console.error("Anonymous sign-in failed:", error));
                }
            });
        },

        async loadExercises() {
            try {
                const response = await fetch('exercises.json');
                if (!response.ok) throw new Error('Network response was not ok.');
                this.state.exercises = await response.json();
            } catch (error) {
                console.error("Failed to load exercises.json:", error);
            }
        },

        async loadStateFromFirestore() {
            if (!this.state.userId) return;
            const userDocRef = doc(db, "users", this.state.userId);
            try {
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    this.state.userSelections = data.userSelections || this.state.userSelections;
                    this.state.settings = data.settings || this.state.settings;
                    this.state.allPlans = data.allPlans || [];
                    this.state.activePlanId = data.activePlanId || (this.state.allPlans.length > 0 ? this.state.allPlans[0].id : null);
                    this.state.currentView = data.currentView || this.state.currentView;
                }
                this.state.isDataLoaded = true;
            } catch (error) {
                console.error("Error loading state from Firestore:", error);
            }
        },

        async saveStateToFirestore() {
            if (!this.state.userId) return;
            const userDocRef = doc(db, "users", this.state.userId);
            const dataToSave = {
                userSelections: this.state.userSelections,
                settings: this.state.settings,
                allPlans: this.state.allPlans,
                activePlanId: this.state.activePlanId,
                currentView: this.state.currentView
            };
            try {
                await setDoc(userDocRef, dataToSave);
            } catch (error) {
                console.error("Error saving state to Firestore:", error);
            }
        },

        addEventListeners() {
            document.getElementById('beginOnboardingBtn')?.addEventListener('click', () => this.nextStep());
            document.getElementById('goalNextBtn')?.addEventListener('click', () => this.validateAndProceed('goal'));
            document.getElementById('experienceNextBtn')?.addEventListener('click', () => this.validateAndProceed('experience'));
            document.getElementById('finishOnboardingBtn')?.addEventListener('click', () => {
                if (this.validateStep('style')) this.finishOnboarding();
            });
            document.querySelectorAll('.back-btn-onboarding').forEach(button => button.addEventListener('click', () => this.previousStep()));
            document.getElementById('planMesoBtn')?.addEventListener('click', () => this.handlePlanMesoClick());
            document.getElementById('startWorkoutBtn')?.addEventListener('click', () => this.showView('workout'));
            document.getElementById('reviewWorkoutsBtn')?.addEventListener('click', () => this.showView('performanceSummary'));
            document.getElementById('settingsBtn')?.addEventListener('click', () => this.showView('settings'));
            document.getElementById('backToHomeBtn')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromBuilder')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromSummary')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromSettings')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('add-day-btn')?.addEventListener('click', () => this.addDayToBuilder());
            document.getElementById('done-planning-btn')?.addEventListener('click', () => this.openMesoLengthModal());
            
            this.elements.scheduleContainer.addEventListener('click', (e) => {
                const dayCard = e.target.closest('.day-card');
                if (!dayCard) return;
                const dayIndex = parseInt(dayCard.dataset.dayIndex, 10);
                if (e.target.closest('.day-header') && dayCard.classList.contains('collapsed')) {
                    this.toggleDayExpansion(dayIndex);
                    return;
                }
                const button = e.target.closest('button');
                if (!button) return;
                const { muscleIndex, focus } = button.dataset;
                if (button.matches('.add-muscle-group-btn')) this.addMuscleGroupToDay(dayIndex);
                if (button.matches('.delete-day-btn')) this.deleteDayFromBuilder(dayIndex);
                if (button.matches('.delete-muscle-group-btn')) this.deleteMuscleGroupFromDay(dayIndex, muscleIndex);
                if (button.matches('.focus-btn')) this.updateMuscleFocus(dayIndex, muscleIndex, focus);
            });

            this.elements.scheduleContainer.addEventListener('change', (e) => {
                const { dayIndex, muscleIndex, exerciseSelectIndex } = e.target.dataset;
                if (e.target.matches('.day-label-selector')) this.updateDayLabel(dayIndex, e.target.value);
                if (e.target.matches('.muscle-select')) this.updateMuscleGroup(dayIndex, muscleIndex, e.target.value);
                if (e.target.matches('.exercise-select')) this.updateExerciseSelection(dayIndex, muscleIndex, exerciseSelectIndex, e.target.value);
            });

            this.elements.closeModalBtn.addEventListener('click', () => this.closeModal());
            this.elements.modal.addEventListener('click', (e) => {
                if (e.target === this.elements.modal) this.closeModal();
            });

            document.querySelectorAll('.card-group').forEach(group => {
                group.addEventListener('click', (e) => {
                    const card = e.target.closest('.goal-card');
                    if (card) {
                        const field = card.closest('.card-group').dataset.field;
                        const value = card.dataset.value;
                        const shouldSave = card.closest('.view').id === 'settings-view';
                        this.selectCard(card, field, value, shouldSave);
                    }
                });
            });

            this.elements.workoutView.addEventListener('click', (e) => {
                if (e.target.matches('.add-set-btn')) this.addSet(e.target.dataset.exerciseIndex);
                if (e.target.matches('#complete-workout-btn')) this.confirmCompleteWorkout();
                const swapButton = e.target.closest('.swap-exercise-btn');
                if (swapButton) {
                    this.openSwapExerciseModal(swapButton.dataset.exerciseIndex);
                }
            });
            this.elements.workoutView.addEventListener('input', (e) => {
                if(e.target.matches('.weight-input, .reps-input')) this.handleSetInput(e.target);
            });
            
            document.getElementById('exercise-tracker-select')?.addEventListener('change', (e) => this.renderProgressChart(e.target.value));
            document.getElementById('units-lbs-btn')?.addEventListener('click', () => this.setUnits('lbs'));
            document.getElementById('units-kg-btn')?.addEventListener('click', () => this.setUnits('kg'));
            document.getElementById('theme-dark-btn')?.addEventListener('click', () => this.setTheme('dark'));
            document.getElementById('theme-light-btn')?.addEventListener('click', () => this.setTheme('light'));
            document.getElementById('prog-linear-btn')?.addEventListener('click', () => this.setProgressionModel('linear'));
            document.getElementById('prog-double-btn')?.addEventListener('click', () => this.setProgressionModel('double'));
            document.getElementById('weight-increment-switch')?.addEventListener('click', (e) => {
                if (e.target.matches('.toggle-btn')) this.setWeightIncrement(parseFloat(e.target.dataset.increment));
            });
            document.getElementById('create-new-plan-btn')?.addEventListener('click', () => this.startNewPlan());
            this.elements.planManagementList.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                if (!button) return;
                const planId = button.dataset.planId;
                if (button.matches('.set-active-plan-btn')) this.setActivePlan(planId);
                if (button.matches('.edit-plan-btn')) this.editPlan(planId);
                if (button.matches('.delete-plan-btn')) this.confirmDeletePlan(planId);
            });
        },
        
        showView(viewName, skipAnimation = false) {
            const currentViewId = this.viewMap[this.state.currentViewName];
            const newViewId = this.viewMap[viewName];
            if (!newViewId) return;
            const currentViewEl = document.getElementById(currentViewId);
            const newViewEl = document.getElementById(newViewId);
            if (!newViewEl) return;

            const transition = () => {
                if(currentViewEl) {
                    currentViewEl.classList.add('hidden');
                    currentViewEl.classList.remove('fade-out');
                }
                newViewEl.classList.remove('hidden');

                if (viewName === 'home') this.renderHomeScreen();
                else if (viewName === 'onboarding') this.showStep(this.state.currentStep);
                else if (viewName === 'workout') this.renderDailyWorkout();
                else if (viewName === 'builder') this.renderBuilder();
                else if (viewName === 'performanceSummary') this.renderPerformanceSummary();
                else if (viewName === 'settings') this.renderSettings();

                this.state.currentViewName = viewName;
            };

            if (skipAnimation || !currentViewEl || currentViewEl === newViewEl) {
                transition();
            } else {
                currentViewEl.classList.add('fade-out');
                setTimeout(transition, 400);
            }
        },

        renderHomeScreen() {
            const activePlan = this.state.allPlans.find(p => p.id === this.state.activePlanId);
            if (activePlan) {
                this.elements.activePlanDisplay.textContent = `Active Plan: ${activePlan.name}`;
            } else {
                this.elements.activePlanDisplay.textContent = 'No active plan. Create one!';
            }
        },

        openMesoLengthModal() {
            this.elements.modalBody.innerHTML = `
                <h2>Plan Details</h2>
                <p>Give your plan a name and select how many weeks it should last. A 1-week deload will be added at the end.</p>
                <input type="text" id="new-plan-name" class="modal-input" placeholder="e.g., My Summer Bulk">
                <div class="card-group" id="meso-length-cards">
                    <div class="goal-card meso-length-card" data-value="4" role="button" tabindex="0"><h3>4 Weeks</h3></div>
                    <div class="goal-card meso-length-card" data-value="6" role="button" tabindex="0"><h3>6 Weeks</h3></div>
                    <div class="goal-card meso-length-card" data-value="8" role="button" tabindex="0"><h3>8 Weeks</h3></div>
                </div>
            `;
            this.elements.modalActions.innerHTML = `<button id="save-plan-details-btn" class="cta-button">Save Plan</button>`;
            
            this.elements.modal.querySelector('#meso-length-cards').addEventListener('click', e => {
                const card = e.target.closest('.meso-length-card');
                if(card) {
                    this.elements.modal.querySelectorAll('.meso-length-card').forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                }
            });

            document.getElementById('save-plan-details-btn').addEventListener('click', () => {
                const length = this.elements.modal.querySelector('.meso-length-card.active')?.dataset.value;
                const name = document.getElementById('new-plan-name').value;
                if (!length || !name) {
                    alert('Please select a length and provide a name.');
                    return;
                }
                this.finalizeAndStartPlan(length, name);
                this.closeModal();
            });
            this.elements.modal.classList.add('active');
        },
        showModal(title, message, buttons = []) {
            this.elements.modalBody.innerHTML = `<h2>${title}</h2><p>${message}</p>`;
            this.elements.modalActions.innerHTML = '';
            if (buttons.length === 0) buttons.push({ text: 'OK', class: 'cta-button' });
            buttons.forEach(btnInfo => {
                const button = document.createElement('button');
                button.textContent = btnInfo.text;
                button.className = btnInfo.class;
                button.addEventListener('click', () => {
                    this.closeModal();
                    if (btnInfo.action) btnInfo.action();
                });
                this.elements.modalActions.appendChild(button);
            });
            this.elements.modal.classList.add('active');
        },
        closeModal() { this.elements.modal.classList.remove('active'); },
        showStep(stepNumber) {
            document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
            const newStep = document.getElementById(`step${stepNumber}`);
            if (newStep) {
                newStep.classList.add('active');
                ['goal', 'experience', 'style'].forEach(field => {
                    if (this.state.userSelections[field]) {
                        const card = newStep.querySelector(`.card-group[data-field="${field}"] .goal-card[data-value="${this.state.userSelections[field]}"]`);
                        if (card) card.classList.add('active');
                    }
                });
            }
            this.updateProgress();
        },
        updateProgress() { this.elements.progress.style.width = `${((this.state.currentStep - 1) / (this.state.totalSteps - 1)) * 100}%`; },
        nextStep() { if (this.state.currentStep < this.state.totalSteps) { this.state.currentStep++; this.showStep(this.state.currentStep); } },
        previousStep() { if (this.state.currentStep > 1) { this.state.currentStep--; this.showStep(this.state.currentStep); } },
        validateStep(field) {
            if (!this.state.userSelections[field]) { 
                this.showModal('Selection Required', `Please select an option for "${this.capitalize(field)}" before continuing.`);
                return false; 
            }
            return true;
        },
        validateAndProceed(field) { if (this.validateStep(field)) this.nextStep(); },
        async selectCard(element, field, value, shouldSave = false) {
            this.state.userSelections[field] = value;
            element.parentElement.querySelectorAll('.goal-card').forEach(card => card.classList.remove('active'));
            element.classList.add('active');
            if (shouldSave) await this.saveStateToFirestore();
        },
        
        async finishOnboarding() {
            this.state.userSelections.onboardingCompleted = true;
            await this.saveStateToFirestore();
            
            const generatedPlan = this.planGenerator.generate(this.state.userSelections, this.state.exercises);
            this.state.builderPlan = generatedPlan.builderPlan;
            
            // --- UPDATED: Swapped button classes for new UI hierarchy ---
            this.showModal(
                "We've Built a Plan For You!",
                `Based on your selections, we've generated a <strong>${generatedPlan.description}</strong>. You can use this plan as is, or customize it to fit your needs.`,
                [
                    { text: 'Use This Plan', class: 'secondary-button', action: () => this.openMesoLengthModal() },
                    { text: 'Customize in Builder', class: 'cta-button', action: () => this.showView('builder') }
                ]
            );
        },
        
        handlePlanMesoClick() {
            const activePlan = this.state.allPlans.find(p => p.id === this.state.activePlanId);
            if (activePlan) {
                this.showModal('Plan Your Mesocycle', 'Do you want to create a new plan or edit your current active plan?', [
                    { text: 'Create New', class: 'cta-button', action: () => this.startNewPlan() },
                    { text: 'Edit Active Plan', class: 'secondary-button', action: () => this.editPlan(this.state.activePlanId) }
                ]);
            } else {
                this.startNewPlan();
            }
        },
        
        startNewPlan() {
            this.state.editingPlanId = null;
            this.customPlanWizard.start();
        },

        editPlan(planId) {
            const planToEdit = this.state.allPlans.find(p => p.id === planId);
            if (!planToEdit) return;
            this.state.editingPlanId = planId;
            this.state.builderPlan = JSON.parse(JSON.stringify(planToEdit.builderTemplate || { days: [] }));
            this.elements.builderTitle.textContent = `Editing: ${planToEdit.name}`;
            this.showView('builder');
        },
        async setActivePlan(planId) {
            this.state.activePlanId = planId;
            await this.saveStateToFirestore();
            this.renderSettings();
        },
        confirmDeletePlan(planId) {
            this.showModal('Delete Plan?', 'Are you sure you want to permanently delete this plan? This cannot be undone.', [
                { text: 'Cancel', class: 'secondary-button' },
                { text: 'Yes, Delete', class: 'cta-button', action: () => this.deletePlan(planId) }
            ]);
        },
        async deletePlan(planId) {
            this.state.allPlans = this.state.allPlans.filter(p => p.id !== planId);
            if (this.state.activePlanId === planId) {
                this.state.activePlanId = this.state.allPlans.length > 0 ? this.state.allPlans[0].id : null;
            }
            await this.saveStateToFirestore();
            this.renderSettings();
        },
        async finalizeAndStartPlan(mesoLength, planName) {
            if (this.state.builderPlan.days.length === 0) {
                this.showModal("Incomplete Plan", "Please add at least one day to your plan.");
                return;
            }

            const newMeso = { 
                id: this.state.editingPlanId || `meso_${Date.now()}`, 
                name: planName,
                startDate: new Date().toISOString(), 
                durationWeeks: parseInt(mesoLength), 
                builderTemplate: JSON.parse(JSON.stringify(this.state.builderPlan)),
                weeks: {} 
            };

            const focusSetMap = { 'Primary': 5, 'Secondary': 4, 'Maintenance': 2 };
            for (let i = 1; i <= newMeso.durationWeeks; i++) {
                newMeso.weeks[i] = {};
                const isDeload = (i === newMeso.durationWeeks);
                this.state.builderPlan.days.forEach((day, dayIndex) => {
                    newMeso.weeks[i][dayIndex + 1] = {
                        name: day.label === 'Add a label' ? `Day ${dayIndex + 1}` : day.label,
                        completed: false,
                        exercises: day.muscleGroups
                            .filter(mg => mg.muscle !== 'restday')
                            .flatMap(mg => 
                                mg.exercises.filter(ex => ex && ex !== 'Select an Exercise').map(exName => {
                                    const exerciseDetails = this.state.exercises.find(e => e.name === exName) || {};
                                    const setsPerExercise = focusSetMap[mg.focus] || 3;
                                    return {
                                        exerciseId: `ex_${exName.replace(/\s+/g, '_')}`, name: exName, muscle: exerciseDetails.muscle || 'Unknown', type: mg.focus,
                                        targetSets: isDeload ? Math.ceil(setsPerExercise / 2) : setsPerExercise,
                                        targetReps: 8, targetLoad: null, sets: []
                                    };
                                })
                        )
                    };
                });
            }

            if (this.state.editingPlanId) {
                const planIndex = this.state.allPlans.findIndex(p => p.id === this.state.editingPlanId);
                this.state.allPlans[planIndex] = newMeso;
            } else {
                this.state.allPlans.push(newMeso);
            }
            
            this.state.activePlanId = newMeso.id;
            this.state.currentView = { week: 1, day: 1 };
            await this.saveStateToFirestore();
            this.showView('home');
        },

        renderBuilder() {
            const container = this.elements.scheduleContainer;
            container.innerHTML = ''; 
            if (this.state.builderPlan.days.length === 0) {
                container.innerHTML = `<p class="placeholder-text">Click "Add a Day" to start building your schedule.</p>`;
                return;
            }
            const muscleList = ['Select a Muscle', 'Rest Day 🧘', ...new Set(this.state.exercises.map(ex => ex.muscle))];
            const muscleOptions = muscleList.map(m => `<option value="${m.toLowerCase().replace(' 🧘', '').replace(/ /g, '')}">${m}</option>`).join('');
            const exerciseSlotsByFocus = { 'Primary': 3, 'Secondary': 2, 'Maintenance': 1 };
            this.state.builderPlan.days.forEach((day, dayIndex) => {
                const dayCard = document.createElement('div');
                dayCard.className = `day-card ${day.isExpanded ? 'expanded' : 'collapsed'}`;
                dayCard.dataset.dayIndex = dayIndex;

                const muscleGroupsHTML = day.muscleGroups.map((mg, muscleIndex) => {
                    const exercisesForMuscle = this.state.exercises.filter(ex => ex.muscle.toLowerCase() === mg.muscle);
                    const exerciseOptions = [{name: 'Select an Exercise'}, ...exercisesForMuscle].map(ex => `<option value="${ex.name}" ${mg.exercises.includes(ex.name) ? 'selected' : ''}>${ex.name}</option>`).join('');
                    const numSlots = exerciseSlotsByFocus[mg.focus] || 3;
                    const exerciseDropdowns = Array.from({ length: numSlots }).map((_, exerciseSelectIndex) => `
                        <select class="builder-select exercise-select" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" data-exercise-select-index="${exerciseSelectIndex}">
                            ${exerciseOptions.replace(`value="${mg.exercises[exerciseSelectIndex]}"`, `value="${mg.exercises[exerciseSelectIndex]}" selected`)}
                        </select>
                    `).join('');
                    const focusButtons = ['Primary', 'Secondary', 'Maintenance'].map(focusLevel => `
                        <button class="focus-btn ${mg.focus === focusLevel ? 'active' : ''}" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}" data-focus="${focusLevel}">${focusLevel}</button>
                    `).join('');
                    const isRestDay = mg.muscle === 'restday';
                    return `
                        <div class="muscle-group-block">
                            <div class="muscle-group-header">
                                <div class="muscle-group-selectors">
                                    <select class="builder-select muscle-select" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}">${muscleOptions.replace(`value="${mg.muscle}"`, `value="${mg.muscle}" selected`)}</select>
                                    ${!isRestDay ? `<div class="focus-buttons">${focusButtons}</div>` : ''}
                                </div>
                                <button class="delete-btn delete-muscle-group-btn" data-muscle-index="${muscleIndex}" aria-label="Delete muscle group"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                            </div>
                            ${!isRestDay && mg.muscle !== 'selectamuscle' ? `<div class="exercise-selection-group"><label>Exercises:</label>${exerciseDropdowns}</div>` : ''}
                        </div>
                    `;
                }).join('');

                dayCard.innerHTML = `
                    <div class="day-header">
                        <select class="builder-select day-label-selector" data-day-index="${dayIndex}">
                            <option>Add a label</option><option ${day.label === 'Monday' ? 'selected' : ''}>Monday</option><option ${day.label === 'Tuesday' ? 'selected' : ''}>Tuesday</option><option ${day.label === 'Wednesday' ? 'selected' : ''}>Wednesday</option><option ${day.label === 'Thursday' ? 'selected' : ''}>Thursday</option><option ${day.label === 'Friday' ? 'selected' : ''}>Friday</option><option ${day.label === 'Saturday' ? 'selected' : ''}>Saturday</option><option ${day.label === 'Sunday' ? 'selected' : ''}>Sunday</option>
                        </select>
                        <button class="delete-btn delete-day-btn" aria-label="Delete day"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                    <div class="day-content">${muscleGroupsHTML}<button class="cta-button secondary-button add-muscle-group-btn">+ Add a Muscle Group</button></div>
                `;
                container.appendChild(dayCard);
            });
        },
        addDayToBuilder() { 
            this.state.builderPlan.days.forEach(day => day.isExpanded = false);
            this.state.builderPlan.days.push({ label: 'Add a label', muscleGroups: [{ muscle: 'selectamuscle', focus: 'Primary', exercises: ['', '', ''] }], isExpanded: true }); 
            this.renderBuilder(); 
        },
        toggleDayExpansion(dayIndex) {
            this.state.builderPlan.days.forEach((day, index) => { day.isExpanded = (index === dayIndex) ? !day.isExpanded : false; });
            this.renderBuilder();
        },
        deleteDayFromBuilder(dayIndex) { this.state.builderPlan.days.splice(dayIndex, 1); this.renderBuilder(); },
        updateDayLabel(dayIndex, newLabel) { this.state.builderPlan.days[dayIndex].label = newLabel; },
        addMuscleGroupToDay(dayIndex) { 
            this.state.builderPlan.days[dayIndex].muscleGroups.push({ muscle: 'selectamuscle', focus: 'Primary', exercises: ['', '', ''] }); 
            this.renderBuilder(); 
        },
        deleteMuscleGroupFromDay(dayIndex, muscleIndex) { this.state.builderPlan.days[dayIndex].muscleGroups.splice(muscleIndex, 1); this.renderBuilder(); },
        updateMuscleGroup(dayIndex, muscleIndex, newMuscle) { 
            this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].muscle = newMuscle; 
            this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises = ['', '', '']; 
            this.renderBuilder(); 
        },
        updateMuscleFocus(dayIndex, muscleIndex, newFocus) { 
            this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].focus = newFocus; 
            this.renderBuilder();
        },
        updateExerciseSelection(dayIndex, muscleIndex, exerciseSelectIndex, newExercise) { 
            this.state.builderPlan.days[dayIndex].muscleGroups[muscleIndex].exercises[exerciseSelectIndex] = newExercise; 
        },
        
        renderSettings() {
            this.state.userSelections.goal = this.state.userSelections.goal || 'muscle';
            this.state.userSelections.experience = this.state.userSelections.experience || 'beginner';
            document.querySelectorAll('#settings-goal-cards .goal-card').forEach(card => card.classList.toggle('active', card.dataset.value === this.state.userSelections.goal));
            document.querySelectorAll('#settings-experience-cards .goal-card').forEach(card => card.classList.toggle('active', card.dataset.value === this.state.userSelections.experience));
            document.getElementById('units-lbs-btn').classList.toggle('active', this.state.settings.units === 'lbs');
            document.getElementById('units-kg-btn').classList.toggle('active', this.state.settings.units === 'kg');
            document.getElementById('theme-dark-btn').classList.toggle('active', this.state.settings.theme === 'dark');
            document.getElementById('theme-light-btn').classList.toggle('active', this.state.settings.theme === 'light');
            document.getElementById('prog-linear-btn').classList.toggle('active', this.state.settings.progressionModel === 'linear');
            document.getElementById('prog-double-btn').classList.toggle('active', this.state.settings.progressionModel === 'double');
            document.querySelectorAll('#weight-increment-switch .toggle-btn').forEach(btn => btn.classList.toggle('active', parseFloat(btn.dataset.increment) === this.state.settings.weightIncrement));

            this.elements.planManagementList.innerHTML = '';
            if (this.state.allPlans.length === 0) {
                this.elements.planManagementList.innerHTML = `<p class="placeholder-text">You haven't created any plans yet.</p>`;
            } else {
                this.state.allPlans.forEach(plan => {
                    const isActive = plan.id === this.state.activePlanId;
                    const planItem = document.createElement('div');
                    planItem.className = `plan-item ${isActive ? 'active' : ''}`;
                    planItem.innerHTML = `
                        <span class="plan-name">${plan.name}</span>
                        <div class="plan-actions">
                            <button class="plan-btn edit-plan-btn" data-plan-id="${plan.id}">Edit</button>
                            <button class="plan-btn delete-plan-btn" data-plan-id="${plan.id}">Delete</button>
                            <button class="plan-btn set-active-plan-btn" data-plan-id="${plan.id}" ${isActive ? 'disabled' : ''}>${isActive ? 'Active' : 'Set Active'}</button>
                        </div>
                    `;
                    this.elements.planManagementList.appendChild(planItem);
                });
            }
        },
        async setUnits(unit) {
            this.state.settings.units = unit;
            await this.saveStateToFirestore();
            this.renderSettings();
            if (this.state.currentViewName === 'workout') this.renderDailyWorkout();
        },
        async setTheme(theme) {
            this.state.settings.theme = theme;
            this.applyTheme();
            await this.saveStateToFirestore();
            this.renderSettings();
        },
        applyTheme() { document.body.dataset.theme = this.state.settings.theme; },
        async setProgressionModel(model) {
            this.state.settings.progressionModel = model;
            await this.saveStateToFirestore();
            this.renderSettings();
        },
        async setWeightIncrement(increment) {
            this.state.settings.weightIncrement = increment;
            await this.saveStateToFirestore();
            this.renderSettings();
        },

        renderDailyWorkout() {
            const container = document.getElementById('exercise-list-container');
            const workoutTitle = document.getElementById('workout-day-title');
            const workoutDate = document.getElementById('workout-date');
            container.innerHTML = ''; 
            workoutDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            const activePlan = this.state.allPlans.find(p => p.id === this.state.activePlanId);
            if (!activePlan) {
                workoutTitle.textContent = "No Active Plan";
                container.innerHTML = `<p class="placeholder-text">Please create and set an active plan in Settings.</p>`;
                document.getElementById('complete-workout-btn').classList.add('hidden');
                return;
            }

            const { week, day } = this.state.currentView;
            const workout = activePlan.weeks[week]?.[day];

            if (!workout) {
                workoutTitle.textContent = "No Workout Today";
                container.innerHTML = `<p class="placeholder-text">You either have no workout scheduled for today or your plan is incomplete.</p>`;
                document.getElementById('complete-workout-btn').classList.add('hidden');
                return;
            }
            document.getElementById('complete-workout-btn').classList.remove('hidden');
            workoutTitle.textContent = workout.name;
            if (workout.exercises.length === 0) {
                container.innerHTML = `<p class="placeholder-text">This is a rest day. Enjoy it!</p>`;
                document.getElementById('complete-workout-btn').classList.remove('hidden');
                return;
            }
            const unitLabel = this.state.settings.units.toUpperCase();
            workout.exercises.forEach((ex, exIndex) => {
                const setsHTML = (ex.sets || []).map((set, setIndex) => this.createSetRowHTML(exIndex, setIndex, set.weight, set.reps)).join('');
                const exerciseCard = document.createElement('div');
                exerciseCard.className = 'exercise-card';
                exerciseCard.innerHTML = `
                    <div class="exercise-card-header">
                        <div class="exercise-title-group">
                            <h3>${ex.name}</h3>
                            <button class="swap-exercise-btn" data-exercise-index="${exIndex}" aria-label="Swap Exercise">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.883L13.865 6.43L18 7.062L14.938 9.938L15.703 14.117L12 12.2L8.297 14.117L9.062 9.938L6 7.062L10.135 6.43L12 2.883z" stroke-width="0" fill="currentColor"/><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1 14H8v-2h3v-3H8V9h3V6h2v3h3v2h-3v3h3v2h-3v3h-2v-3z"/></svg>
                            </button>
                        </div>
                        <span class="exercise-target">${ex.targetSets} Sets &times; ${ex.targetReps} Reps</span>
                    </div>
                    <div class="sets-container" id="sets-for-ex-${exIndex}">
                        <div class="set-row header"><div class="set-number">SET</div><div class="set-inputs"><span>WEIGHT (${unitLabel})</span><span>REPS</span></div></div>
                        ${setsHTML}
                    </div>
                    <button class="add-set-btn" data-exercise-index="${exIndex}">+ Add Set</button>
                `;
                container.appendChild(exerciseCard);
            });
        },
        openSwapExerciseModal(exerciseIndex) {
            const activePlan = this.state.allPlans.find(p => p.id === this.state.activePlanId);
            const workout = activePlan.weeks[this.state.currentView.week][this.state.currentView.day];
            const currentExerciseName = workout.exercises[exerciseIndex].name;
            const exerciseData = this.state.exercises.find(e => e.name === currentExerciseName);

            if (!exerciseData || !exerciseData.alternatives || exerciseData.alternatives.length === 0) {
                this.showModal("No Alternatives", "Sorry, no alternatives are listed for this exercise.");
                return;
            }

            const alternativesHTML = exerciseData.alternatives.map(altName => 
                `<div class="goal-card alternative-card" data-new-exercise-name="${altName}" role="button" tabindex="0"><h3>${altName}</h3></div>`
            ).join('');

            this.elements.modalBody.innerHTML = `
                <h2>Swap ${currentExerciseName}</h2>
                <p>Choose a replacement exercise:</p>
                <div class="card-group">${alternativesHTML}</div>
            `;
            this.elements.modalActions.innerHTML = '';
            
            this.elements.modal.querySelectorAll('.alternative-card').forEach(card => {
                card.addEventListener('click', () => {
                    this.swapExercise(exerciseIndex, card.dataset.newExerciseName);
                    this.closeModal();
                });
            });
            
            this.elements.modal.classList.add('active');
        },

        swapExercise(exerciseIndex, newExerciseName) {
            const activePlan = this.state.allPlans.find(p => p.id === this.state.activePlanId);
            const workout = activePlan.weeks[this.state.currentView.week][this.state.currentView.day];
            const oldExercise = workout.exercises[exerciseIndex];
            const newExerciseData = this.state.exercises.find(e => e.name === newExerciseName);

            if (!newExerciseData) return;

            workout.exercises[exerciseIndex] = {
                ...oldExercise,
                name: newExerciseData.name,
                muscle: newExerciseData.muscle,
                exerciseId: `ex_${newExerciseData.name.replace(/\s+/g, '_')}`,
                sets: []
            };

            this.renderDailyWorkout();
        },
        createSetRowHTML(exIndex, setIndex, weight, reps) {
            return `
                <div class="set-row" data-set-index="${setIndex}">
                    <div class="set-number">${setIndex + 1}</div>
                    <div class="set-inputs">
                        <input type="number" class="weight-input" placeholder="-" value="${weight || ''}" data-exercise-index="${exIndex}" data-set-index="${setIndex}">
                        <input type="number" class="reps-input" placeholder="-" value="${reps || ''}" data-exercise-index="${exIndex}" data-set-index="${setIndex}">
                    </div>
                </div>
            `;
        },
        handleSetInput(inputElement) {
            const { exerciseIndex, setIndex } = inputElement.dataset;
            const value = parseFloat(inputElement.value);
            const property = inputElement.classList.contains('weight-input') ? 'weight' : 'reps';
            const activePlan = this.state.allPlans.find(p => p.id === this.state.activePlanId);
            const workout = activePlan.weeks[this.state.currentView.week][this.state.currentView.day];
            if(workout?.exercises[exerciseIndex]?.sets[setIndex]) {
               workout.exercises[exerciseIndex].sets[setIndex][property] = isNaN(value) ? '' : value;
            }
        },
        addSet(exerciseIndex) {
            const activePlan = this.state.allPlans.find(p => p.id === this.state.activePlanId);
            const workout = activePlan.weeks[this.state.currentView.week][this.state.currentView.day];
            const exercise = workout.exercises[exerciseIndex];
            if (!exercise.sets) exercise.sets = [];
            const previousWeight = exercise.sets.length > 0 ? exercise.sets[exercise.sets.length - 1].weight : (exercise.targetLoad || '');
            exercise.sets.push({ weight: previousWeight, reps: '' });
            const setContainer = document.getElementById(`sets-for-ex-${exerciseIndex}`);
            const newSetIndex = exercise.sets.length - 1;
            setContainer.insertAdjacentHTML('beforeend', this.createSetRowHTML(exerciseIndex, newSetIndex, previousWeight, ''));
        },
        confirmCompleteWorkout() {
            this.showModal('Complete Workout?', 'Are you sure you want to complete this workout? This action cannot be undone.', [
                { text: 'Cancel', class: 'secondary-button' },
                { text: 'Yes, Complete', class: 'cta-button', action: () => this.completeWorkout() }
            ]);
        },
        async completeWorkout() {
            const planIndex = this.state.allPlans.findIndex(p => p.id === this.state.activePlanId);
            if (planIndex === -1) return;
            const activePlan = this.state.allPlans[planIndex];
            const { week, day } = this.state.currentView;
            const workout = activePlan.weeks[week][day];
            workout.completed = true;
            workout.completedDate = new Date().toISOString();
            
            workout.exercises.forEach(ex => {
                ex.totalVolume = (ex.sets || []).reduce((total, set) => total + (set.weight || 0) * (set.reps || 0), 0);
            });

            if (week < activePlan.durationWeeks -1 && workout.exercises.length > 0) {
                this.calculateNextWeekProgression(week, activePlan);
            }
            const dayKeys = Object.keys(activePlan.weeks[week]).sort((a,b) => a - b);
            const currentDayIndex = dayKeys.indexOf(day.toString());
            let nextWeek = week;
            let nextDay = null;
            if (currentDayIndex < dayKeys.length - 1) {
                nextDay = parseInt(dayKeys[currentDayIndex + 1]);
            } else {
                if (week < activePlan.durationWeeks) {
                    nextWeek = week + 1;
                    const nextWeekDayKeys = Object.keys(activePlan.weeks[nextWeek]).sort((a,b) => a - b);
                    nextDay = parseInt(nextWeekDayKeys[0]);
                } else {
                    this.state.currentView = { week: 1, day: 1 };
                    await this.saveStateToFirestore();
                    this.showModal('Mesocycle Complete!', 'Congratulations! You have finished your training block.', [
                        { text: 'Awesome!', class: 'cta-button', action: () => this.showView('home') }
                    ]);
                    return;
                }
            }
            this.state.currentView = { week: nextWeek, day: nextDay };
            await this.saveStateToFirestore();
            this.showModal('Workout Complete!', 'Great job! Your progress has been saved.', [
                { text: 'OK', class: 'cta-button', action: () => this.showView('home') }
            ]);
        },
        calculateNextWeekProgression(completedWeekNumber, plan) {
            const nextWeekNumber = completedWeekNumber + 1;
            if (!plan.weeks[nextWeekNumber]) return;
            const { progressionModel, weightIncrement } = this.state.settings;
            for (const dayKey in plan.weeks[completedWeekNumber]) {
                const completedDay = plan.weeks[completedWeekNumber][dayKey];
                const nextWeekDay = plan.weeks[nextWeekNumber][dayKey];
                if (!nextWeekDay) continue;
                completedDay.exercises.forEach((completedEx) => {
                    const nextWeekEx = nextWeekDay.exercises.find(ex => ex.exerciseId === completedEx.exerciseId);
                    if (!nextWeekEx) return;
                    if (!completedEx.sets || completedEx.sets.length === 0) {
                        nextWeekEx.targetLoad = completedEx.targetLoad || null;
                        return;
                    }
                    const allSetsSuccessful = completedEx.sets.every(set => set.reps >= completedEx.targetReps);
                    const lastSetWeight = completedEx.sets[completedEx.sets.length - 1].weight;
                    if (progressionModel === 'double') {
                        if (allSetsSuccessful) {
                            const newTargetReps = (completedEx.targetReps || 8) + 1;
                            if (newTargetReps > 12) {
                                nextWeekEx.targetLoad = lastSetWeight + weightIncrement;
                                nextWeekEx.targetReps = 8;
                            } else {
                                nextWeekEx.targetLoad = lastSetWeight;
                                nextWeekEx.targetReps = newTargetReps;
                            }
                        } else {
                            nextWeekEx.targetLoad = lastSetWeight;
                            nextWeekEx.targetReps = completedEx.targetReps;
                        }
                    } else { // Linear
                        nextWeekEx.targetLoad = allSetsSuccessful ? lastSetWeight + weightIncrement : lastSetWeight;
                        nextWeekEx.targetReps = completedEx.targetReps;
                    }
                });
            }
        },

        renderPerformanceSummary() {
            const activePlan = this.state.allPlans.find(p => p.id === this.state.activePlanId);
            if (!activePlan) {
                document.getElementById('summary-content').innerHTML = `<p class="placeholder-text">Select an active plan to see its summary.</p>`;
                return;
            }

            const listContainer = document.getElementById('completed-workouts-list');
            const exerciseSelect = document.getElementById('exercise-tracker-select');
            listContainer.innerHTML = '';
            exerciseSelect.innerHTML = '<option value="">Select an exercise to track</option>';
            const completedWorkouts = [];
            const uniqueExercises = new Set();
            Object.values(activePlan.weeks).forEach(week => {
                Object.values(week).forEach(day => {
                    if (day.completed) {
                        completedWorkouts.push(day);
                        day.exercises.forEach(ex => uniqueExercises.add(ex.name));
                    }
                });
            });
            if (completedWorkouts.length === 0) {
                listContainer.innerHTML = '<p class="placeholder-text">No completed workouts yet.</p>';
            } else {
                completedWorkouts.sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate))
                    .forEach(workout => {
                        const workoutItem = document.createElement('div');
                        workoutItem.className = 'summary-item';
                        workoutItem.innerHTML = `<h4>${workout.name}</h4><p>${new Date(workout.completedDate).toLocaleDateString()}</p>`;
                        listContainer.appendChild(workoutItem);
                    });
            }
            uniqueExercises.forEach(exName => {
                const option = document.createElement('option');
                option.value = exName;
                option.textContent = exName;
                exerciseSelect.appendChild(option);
            });
            this.renderProgressChart("");
            this.renderVolumeChart(completedWorkouts);
            this.renderConsistencyCalendar(completedWorkouts);
        },
        renderVolumeChart(completedWorkouts) {
            const ctx = document.getElementById('volume-chart').getContext('2d');
            if (this.state.volumeChart) this.state.volumeChart.destroy();
            const volumeByMuscle = {};
            completedWorkouts.forEach(day => {
                day.exercises.forEach(ex => {
                    const muscle = this.capitalize(ex.muscle);
                    if (!volumeByMuscle[muscle]) volumeByMuscle[muscle] = 0;
                    volumeByMuscle[muscle] += ex.totalVolume || 0;
                });
            });
            const unitLabel = this.state.settings.units.toUpperCase();
            this.state.volumeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(volumeByMuscle),
                    datasets: [{
                        label: `Total Volume (${unitLabel})`,
                        data: Object.values(volumeByMuscle),
                        backgroundColor: 'rgba(255, 107, 53, 0.5)',
                        borderColor: 'var(--primary-color)',
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                    scales: { y: { ticks: { color: 'var(--text-muted-color)' }, grid: { display: false } }, x: { ticks: { color: 'var(--text-muted-color)' }, grid: { color: 'var(--border-color)' } } },
                    plugins: { legend: { display: false } }
                }
            });
        },
        renderConsistencyCalendar(completedWorkouts) {
            const calendarEl = document.getElementById('consistency-calendar');
            calendarEl.innerHTML = '';
            const completedDates = new Set(completedWorkouts.map(w => new Date(w.completedDate).toDateString()));
            const today = new Date();
            const month = today.getMonth();
            const year = today.getFullYear();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            calendarEl.innerHTML += `<div class="calendar-header">${today.toLocaleString('default', { month: 'long' })} ${year}</div>`;
            const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            daysOfWeek.forEach(day => { calendarEl.innerHTML += `<div class="calendar-day-name">${day}</div>`; });
            for (let i = 0; i < firstDay; i++) { calendarEl.innerHTML += `<div></div>`; }
            for (let i = 1; i <= daysInMonth; i++) {
                const date = new Date(year, month, i);
                const isCompleted = completedDates.has(date.toDateString());
                calendarEl.innerHTML += `<div class="calendar-day ${isCompleted ? 'completed' : ''}">${i}</div>`;
            }
        },
        renderProgressChart(exerciseName) {
            const ctx = document.getElementById('progress-chart').getContext('2d');
            if (this.state.progressChart) this.state.progressChart.destroy();
            if (!exerciseName) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); return; }
            const labels = [];
            const dataPoints = [];
            const activePlan = this.state.allPlans.find(p => p.id === this.state.activePlanId);
            if (activePlan) {
                 Object.values(activePlan.weeks).forEach((week, weekIndex) => {
                    Object.values(week).forEach(day => {
                        if (day.completed) {
                            const exercise = day.exercises.find(ex => ex.name === exerciseName);
                            if (exercise && exercise.sets?.length > 0) {
                                const maxWeight = Math.max(...exercise.sets.map(s => s.weight || 0));
                                if (maxWeight > 0) {
                                    labels.push(`W${weekIndex + 1}`);
                                    dataPoints.push(maxWeight);
                                }
                            }
                        }
                    });
                });
            }
            const unitLabel = this.state.settings.units.toUpperCase();
            this.state.progressChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: `Max Weight for ${exerciseName} (${unitLabel})`,
                        data: dataPoints,
                        borderColor: 'var(--primary-color)',
                        backgroundColor: 'rgba(255, 107, 53, 0.2)',
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { color: 'var(--text-muted-color)' }, grid: { color: 'var(--border-color)' } }, x: { ticks: { color: 'var(--text-muted-color)' }, grid: { color: 'var(--border-color)' } } },
                    plugins: { legend: { labels: { color: 'var(--text-color)' } } }
                }
            });
        },

        capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""; },

        customPlanWizard: {
            config: {},
            start() {
                this.config = {};
                this.askDaysPerWeek();
            },
            askDaysPerWeek() {
                app.elements.modalBody.innerHTML = `
                    <h2>Custom Plan</h2>
                    <p>How many days per week do you want to train?</p>
                    <div class="card-group">
                        ${[2,3,4,5,6].map(d => `<div class="goal-card day-card" data-value="${d}" role="button" tabindex="0"><h3>${d} Days</h3></div>`).join('')}
                    </div>`;
                app.elements.modalActions.innerHTML = '';
                app.elements.modal.querySelectorAll('.day-card').forEach(card => {
                    card.addEventListener('click', () => {
                        this.config.days = parseInt(card.dataset.value);
                        this.askTrainingFocus();
                    });
                });
                app.elements.modal.classList.add('active');
            },
            askTrainingFocus() {
                app.elements.modalBody.innerHTML = `
                    <h2>Training Goal</h2>
                    <p>Should this plan focus more on strength or muscle growth?</p>
                    <div class="card-group">
                        <div class="goal-card focus-card" data-value="strength" role="button" tabindex="0"><div class="icon">🏋️</div><h3>Strength</h3><p>Lower reps (3-5)</p></div>
                        <div class="goal-card focus-card" data-value="growth" role="button" tabindex="0"><div class="icon">💪</div><h3>Muscle Growth</h3><p>Higher reps (8-12)</p></div>
                    </div>`;
                app.elements.modalActions.innerHTML = '';
                app.elements.modal.querySelectorAll('.focus-card').forEach(card => {
                    card.addEventListener('click', () => {
                        this.config.focus = card.dataset.value;
                        this.askPriorityMuscles();
                    });
                });
            },
            askPriorityMuscles() {
                this.config.priorityMuscles = [];
                const muscles = ['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Biceps', 'Triceps'];
                app.elements.modalBody.innerHTML = `
                    <h2>Priority Muscles</h2>
                    <p>Select up to two muscle groups to focus on.</p>
                    <div class="card-group">
                        ${muscles.map(m => `<div class="goal-card muscle-card" data-value="${m}" role="button" tabindex="0"><h3>${m}</h3></div>`).join('')}
                    </div>`;
                app.elements.modalActions.innerHTML = '<button id="finish-wizard-btn" class="cta-button">Finish</button>';
                
                const muscleCards = app.elements.modal.querySelectorAll('.muscle-card');
                muscleCards.forEach(card => {
                    card.addEventListener('click', () => {
                        const muscle = card.dataset.value;
                        if (card.classList.contains('active')) {
                            card.classList.remove('active');
                            this.config.priorityMuscles = this.config.priorityMuscles.filter(m => m !== muscle);
                        } else {
                            if (this.config.priorityMuscles.length < 2) {
                                card.classList.add('active');
                                this.config.priorityMuscles.push(muscle);
                            }
                        }
                    });
                });
                
                document.getElementById('finish-wizard-btn').addEventListener('click', () => {
                    this.finish();
                });
            },
            finish() {
                app.closeModal();
                const generatedPlan = app.planGenerator.generate(
                    {
                        experience: app.state.userSelections.experience,
                        goal: this.config.focus,
                        style: app.state.userSelections.style,
                        days: this.config.days,
                        priorityMuscles: this.config.priorityMuscles
                    },
                    app.state.exercises,
                    true // isCustom flag
                );
                app.state.builderPlan = generatedPlan.builderPlan;
                app.elements.builderTitle.textContent = "Your Custom Plan";
                app.showView('builder');
            }
        },

        planGenerator: {
            generate(userSelections, allExercises, isCustom = false) {
                let template, description;
                
                if (isCustom) {
                    const { days, priorityMuscles, goal } = userSelections;
                    template = this._buildCustomTemplate(days, priorityMuscles, goal);
                    description = `${days}-Day Custom Plan`;
                } else {
                    const { experience, goal } = userSelections;
                    if (goal === 'muscle') {
                        if (experience === 'beginner') { template = this.templates.beginner.muscle; description = "3-Day Full Body Routine"; } 
                        else if (experience === 'experienced') { template = this.templates.experienced.muscle; description = "4-Day Upper/Lower Split"; } 
                        else { template = this.templates.advanced.muscle; description = "5-Day 'Body Part' Split"; }
                    } else {
                        template = this.templates.beginner.combined;
                        description = "3-Day Full Body & Cardio Plan";
                    }
                }

                const equipmentFilter = this._getEquipmentFilter(userSelections.style);
                const builderPlan = { days: [] };
                template.days.forEach(dayTemplate => {
                    const newDay = { label: dayTemplate.label, isExpanded: true, muscleGroups: [] };
                    dayTemplate.muscles.forEach(muscleGroup => {
                        const newMuscleGroup = {
                            muscle: muscleGroup.name.toLowerCase(),
                            focus: muscleGroup.focus,
                            exercises: this._getExercisesForMuscle(allExercises, muscleGroup.name, equipmentFilter, muscleGroup.count)
                        };
                        newDay.muscleGroups.push(newMuscleGroup);
                    });
                    builderPlan.days.push(newDay);
                });
                
                return { builderPlan, description };
            },

            _buildCustomTemplate(days, priorityMuscles, goal) {
                let split;
                const baseVolume = { 'Primary': 2, 'Secondary': 1 };
                
                if (days <= 3) split = this.splits.fullBody(days, priorityMuscles, baseVolume);
                else if (days === 4) split = this.splits.upperLower(priorityMuscles, baseVolume);
                else if (days === 5) split = this.splits.pplUpperLower(priorityMuscles, baseVolume);
                else split = this.splits.pplTwice(priorityMuscles, baseVolume);

                return { days: split };
            },

            splits: {
                fullBody(days, priorities, volume) {
                    const structure = [
                        { label: 'Full Body A', muscles: [{ name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Chest', focus: 'Primary', count: volume.Primary }, { name: 'Back', focus: 'Primary', count: volume.Primary }] },
                        { label: 'Full Body B', muscles: [{ name: 'Hamstrings', focus: 'Primary', count: volume.Primary }, { name: 'Shoulders', focus: 'Primary', count: volume.Primary }, { name: 'Back', focus: 'Primary', count: volume.Primary }] },
                        { label: 'Full Body C', muscles: [{ name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Chest', focus: 'Primary', count: volume.Primary }, { name: 'Core', focus: 'Secondary', count: volume.Secondary }] }
                    ];
                    return structure.slice(0, days);
                },
                upperLower(priorities, volume) {
                    const upperA = { label: 'Upper A', muscles: [{ name: 'Chest', focus: 'Primary', count: volume.Primary }, { name: 'Back', focus: 'Primary', count: volume.Primary }, { name: 'Shoulders', focus: 'Secondary', count: volume.Secondary }, { name: 'Biceps', focus: 'Secondary', count: volume.Secondary }] };
                    const lowerA = { label: 'Lower A', muscles: [{ name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Hamstrings', focus: 'Primary', count: volume.Primary }, { name: 'Core', focus: 'Secondary', count: volume.Secondary }] };
                    const upperB = { label: 'Upper B', muscles: [{ name: 'Shoulders', focus: 'Primary', count: volume.Primary }, { name: 'Back', focus: 'Primary', count: volume.Primary }, { name: 'Chest', focus: 'Secondary', count: volume.Secondary }, { name: 'Triceps', focus: 'Secondary', count: volume.Secondary }] };
                    const lowerB = { label: 'Lower B', muscles: [{ name: 'Hamstrings', focus: 'Primary', count: volume.Primary }, { name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Core', focus: 'Secondary', count: volume.Secondary }] };
                    
                    priorities.forEach(p => {
                        [upperA, lowerA, upperB, lowerB].forEach(day => {
                            day.muscles.forEach(mg => {
                                if (mg.name === p) mg.focus = 'Primary';
                            });
                        });
                    });

                    return [upperA, lowerA, upperB, lowerB];
                },
                pplUpperLower(priorities, volume) {
                    const push = { label: 'Push', muscles: [{ name: 'Chest', focus: 'Primary', count: volume.Primary }, { name: 'Shoulders', focus: 'Primary', count: volume.Primary }, { name: 'Triceps', focus: 'Secondary', count: volume.Secondary }] };
                    const pull = { label: 'Pull', muscles: [{ name: 'Back', focus: 'Primary', count: volume.Primary + 1 }, { name: 'Biceps', focus: 'Secondary', count: volume.Secondary }] };
                    const legs = { label: 'Legs', muscles: [{ name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Hamstrings', focus: 'Primary', count: volume.Primary }, { name: 'Core', focus: 'Secondary', count: volume.Secondary }] };
                    const upper = { label: 'Upper', muscles: [{ name: 'Chest', focus: 'Primary', count: volume.Secondary }, { name: 'Back', focus: 'Primary', count: volume.Primary }, { name: 'Shoulders', focus: 'Secondary', count: volume.Secondary }] };
                    const lower = { label: 'Lower', muscles: [{ name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Hamstrings', focus: 'Primary', count: volume.Primary }] };

                    priorities.forEach(p => {
                        [push, pull, legs, upper, lower].forEach(day => {
                            day.muscles.forEach(mg => {
                                if (mg.name === p) mg.focus = 'Primary';
                            });
                        });
                    });

                    return [push, pull, legs, upper, lower];
                },
                 pplTwice(priorities, volume) {
                    const push1 = { label: 'Push 1', muscles: [{ name: 'Chest', focus: 'Primary', count: volume.Primary }, { name: 'Shoulders', focus: 'Primary', count: volume.Primary }, { name: 'Triceps', focus: 'Secondary', count: volume.Secondary }] };
                    const pull1 = { label: 'Pull 1', muscles: [{ name: 'Back', focus: 'Primary', count: volume.Primary + 1 }, { name: 'Biceps', focus: 'Secondary', count: volume.Secondary }] };
                    const legs1 = { label: 'Legs 1', muscles: [{ name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Hamstrings', focus: 'Primary', count: volume.Primary }, { name: 'Core', focus: 'Secondary', count: volume.Secondary }] };
                    const push2 = { label: 'Push 2', muscles: [{ name: 'Shoulders', focus: 'Primary', count: volume.Primary }, { name: 'Chest', focus: 'Primary', count: volume.Primary }, { name: 'Triceps', focus: 'Secondary', count: volume.Secondary }] };
                    const pull2 = { label: 'Pull 2', muscles: [{ name: 'Back', focus: 'Primary', count: volume.Primary + 1 }, { name: 'Biceps', focus: 'Secondary', count: volume.Secondary }] };
                    const legs2 = { label: 'Legs 2', muscles: [{ name: 'Hamstrings', focus: 'Primary', count: volume.Primary }, { name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Core', focus: 'Secondary', count: volume.Secondary }] };
                    
                    priorities.forEach(p => {
                        [push1, pull1, legs1, push2, pull2, legs2].forEach(day => {
                            day.muscles.forEach(mg => {
                                if (mg.name === p) mg.focus = 'Primary';
                            });
                        });
                    });

                    return [push1, pull1, legs1, push2, pull2, legs2];
                }
            },

            _getEquipmentFilter(style) {
                if (style === 'gym') return ['barbell', 'dumbbell', 'machine', 'cable', 'rack', 'bench', 'bodyweight', 'pullup-bar'];
                if (style === 'home') return ['bodyweight', 'dumbbell'];
                return ['barbell', 'dumbbell', 'machine', 'cable', 'rack', 'bench', 'bodyweight', 'pullup-bar'];
            },

            _getExercisesForMuscle(allExercises, muscle, equipmentFilter, count) {
                if (muscle === 'Rest Day') return [];
                const filtered = allExercises.filter(ex => 
                    ex.muscle === muscle && 
                    (ex.equipment.includes('bodyweight') || ex.equipment.some(e => equipmentFilter.includes(e)))
                );
                return filtered.sort(() => 0.5 - Math.random()).slice(0, count).map(ex => ex.name);
            },

            templates: {
                beginner: {
                    muscle: {
                        days: [
                            { label: 'Day 1: Full Body A', muscles: [{ name: 'Quads', focus: 'Primary', count: 1 }, { name: 'Chest', focus: 'Primary', count: 1 }, { name: 'Back', focus: 'Primary', count: 1 }, { name: 'Biceps', focus: 'Secondary', count: 1 }] },
                            { label: 'Day 2: Rest', muscles: [{ name: 'Rest Day', focus: 'Primary', count: 0 }] },
                            { label: 'Day 3: Full Body B', muscles: [{ name: 'Hamstrings', focus: 'Primary', count: 1 }, { name: 'Shoulders', focus: 'Primary', count: 1 }, { name: 'Back', focus: 'Primary', count: 1 }, { name: 'Triceps', focus: 'Secondary', count: 1 }] },
                            { label: 'Day 4: Rest', muscles: [{ name: 'Rest Day', focus: 'Primary', count: 0 }] },
                            { label: 'Day 5: Full Body C', muscles: [{ name: 'Quads', focus: 'Primary', count: 1 }, { name: 'Chest', focus: 'Primary', count: 1 }, { name: 'Back', focus: 'Primary', count: 1 }, { name: 'Core', focus: 'Secondary', count: 1 }] },
                        ]
                    },
                    combined: {
                        days: [
                            { label: 'Day 1: Full Body', muscles: [{ name: 'Quads', focus: 'Primary', count: 1 }, { name: 'Chest', focus: 'Primary', count: 1 }, { name: 'Back', focus: 'Primary', count: 1 }] },
                            { label: 'Day 2: Cardio', muscles: [{ name: 'Cardio', focus: 'Primary', count: 1 }] },
                            { label: 'Day 3: Full Body', muscles: [{ name: 'Hamstrings', focus: 'Primary', count: 1 }, { name: 'Shoulders', focus: 'Primary', count: 1 }, { name: 'Back', focus: 'Primary', count: 1 }] },
                        ]
                    }
                },
                experienced: {
                    muscle: {
                        days: [
                            { label: 'Day 1: Upper A', muscles: [{ name: 'Chest', focus: 'Primary', count: 2 }, { name: 'Back', focus: 'Primary', count: 2 }, { name: 'Shoulders', focus: 'Secondary', count: 1 }, { name: 'Biceps', focus: 'Secondary', count: 1 }] },
                            { label: 'Day 2: Lower A', muscles: [{ name: 'Quads', focus: 'Primary', count: 2 }, { name: 'Hamstrings', focus: 'Primary', count: 1 }, { name: 'Core', focus: 'Secondary', count: 1 }] },
                            { label: 'Day 3: Rest', muscles: [{ name: 'Rest Day', focus: 'Primary', count: 0 }] },
                            { label: 'Day 4: Upper B', muscles: [{ name: 'Back', focus: 'Primary', count: 2 }, { name: 'Shoulders', focus: 'Primary', count: 2 }, { name: 'Chest', focus: 'Secondary', count: 1 }, { name: 'Triceps', focus: 'Secondary', count: 1 }] },
                        ]
                    }
                },
                advanced: {
                    muscle: {
                        days: [
                            { label: 'Day 1: Push', muscles: [{ name: 'Chest', focus: 'Primary', count: 2 }, { name: 'Shoulders', focus: 'Primary', count: 2 }, { name: 'Triceps', focus: 'Secondary', count: 2 }] },
                            { label: 'Day 2: Pull', muscles: [{ name: 'Back', focus: 'Primary', count: 3 }, { name: 'Biceps', focus: 'Secondary', count: 2 }] },
                            { label: 'Day 3: Legs', muscles: [{ name: 'Quads', focus: 'Primary', count: 2 }, { name: 'Hamstrings', focus: 'Primary', count: 2 }, { name: 'Core', focus: 'Secondary', count: 1 }] },
                            { label: 'Day 4: Rest', muscles: [{ name: 'Rest Day', focus: 'Primary', count: 0 }] },
                            { label: 'Day 5: Upper', muscles: [{ name: 'Chest', focus: 'Primary', count: 1 }, { name: 'Back', focus: 'Primary', count: 2 }, { name: 'Shoulders', focus: 'Secondary', count: 1 }, { name: 'Biceps', focus: 'Secondary', count: 1 }, { name: 'Triceps', focus: 'Secondary', count: 1 }] },
                        ]
                    }
                }
            }
        }
    };
    
    for (const key in app) {
        if (typeof app[key] === 'function') app[key] = app[key].bind(app);
    }
    for (const key in app.customPlanWizard) {
        if (typeof app.customPlanWizard[key] === 'function') app.customPlanWizard[key] = app.customPlanWizard[key].bind(app.customPlanWizard);
    }
    
    app.init();
});

