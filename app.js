// --- FIREBASE SDK IMPORTS ---
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FIREBASE CONFIGURATION ---
// Your web app's Firebase configuration
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
            // Firebase/Auth state
            userId: null,
            isDataLoaded: false,

            // App state
            currentStep: 1,
            totalSteps: 4,
            userSelections: { 
                goal: null, 
                experience: null, 
                style: null,
                onboardingCompleted: false // Replaces localStorage flag
            },
            settings: {
                units: 'lbs',
                theme: 'dark',
                progressionModel: 'double',
                weightIncrement: 5
            },
            plan: null,
            currentView: { week: 1, day: 1 },
            currentViewName: 'onboarding',
            builderPlan: {
                days: [] 
            },
            allPlans: [],
            exercises: [],
            progressChart: null,
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
        },

        // --- INITIALIZATION & AUTHENTICATION ---
        async init() {
            await this.loadExercises();
            this.addEventListeners();
            this.handleAuthentication();
        },

        handleAuthentication() {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    // User is signed in anonymously.
                    this.state.userId = user.uid;
                    console.log("Authenticated with UID:", this.state.userId);

                    // Now that we have a user, load their data from Firestore
                    await this.loadStateFromFirestore();
                    
                    // Apply settings and show the correct view
                    this.applyTheme();
                    if (this.state.userSelections.onboardingCompleted) {
                        this.showView('home', true);
                    } else {
                        this.showView('onboarding', true);
                    }
                } else {
                    // If no user, sign them in anonymously. This will trigger the onAuthStateChanged listener again.
                    signInAnonymously(auth).catch((error) => {
                        console.error("Anonymous sign-in failed:", error);
                        this.showModal("Connection Error", "Could not connect to the database. Please refresh the page.");
                    });
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
                this.state.exercises = [];
            }
        },

        // --- FIRESTORE DATA HANDLING ---
        async loadStateFromFirestore() {
            if (!this.state.userId) return;
            const userDocRef = doc(db, "users", this.state.userId);

            try {
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Merge data from Firestore into the app's state
                    this.state.userSelections = data.userSelections || this.state.userSelections;
                    this.state.settings = data.settings || this.state.settings;
                    this.state.allPlans = data.allPlans || [];
                    this.state.currentView = data.currentView || this.state.currentView;
                    if (this.state.allPlans.length > 0) {
                        this.state.plan = this.state.allPlans[0]; 
                    }
                    console.log("User data loaded from Firestore.");
                } else {
                    console.log("No existing user data. A new profile will be created on first save.");
                }
                this.state.isDataLoaded = true;
            } catch (error) {
                console.error("Error loading state from Firestore:", error);
                this.showModal("Error", "Could not load your data from the database.");
            }
        },

        async saveStateToFirestore() {
            if (!this.state.userId) {
                console.error("Cannot save state: No user ID.");
                return;
            }
            const userDocRef = doc(db, "users", this.state.userId);
            
            // Consolidate all the data we want to save into one object
            const dataToSave = {
                userSelections: this.state.userSelections,
                settings: this.state.settings,
                allPlans: this.state.allPlans,
                currentView: this.state.currentView
            };

            try {
                // setDoc will create the document if it doesn't exist, or overwrite it if it does.
                await setDoc(userDocRef, dataToSave);
                console.log("State saved to Firestore.");
            } catch (error) {
                console.error("Error saving state to Firestore:", error);
                this.showModal("Error", "Could not save your progress. Please check your connection.");
            }
        },

        addEventListeners() {
            // Onboarding
            document.getElementById('beginOnboardingBtn')?.addEventListener('click', () => this.nextStep());
            document.getElementById('goalNextBtn')?.addEventListener('click', () => this.validateAndProceed('goal'));
            document.getElementById('experienceNextBtn')?.addEventListener('click', () => this.validateAndProceed('experience'));
            document.getElementById('finishOnboardingBtn')?.addEventListener('click', () => {
                if (this.validateStep('style')) {
                    this.finishOnboarding();
                }
            });
            document.querySelectorAll('.back-btn-onboarding').forEach(button => button.addEventListener('click', () => this.previousStep()));
            
            // Home Screen
            document.getElementById('startWorkoutBtn')?.addEventListener('click', () => this.showView('workout'));
            document.getElementById('planMesoBtn')?.addEventListener('click', () => this.showView('builder'));
            document.getElementById('reviewWorkoutsBtn')?.addEventListener('click', () => this.showView('performanceSummary'));
            document.getElementById('settingsBtn')?.addEventListener('click', () => this.showView('settings'));

            // Back Buttons
            document.getElementById('backToHomeBtn')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromBuilder')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromSummary')?.addEventListener('click', () => this.showView('home'));
            document.getElementById('backToHomeFromSettings')?.addEventListener('click', () => this.showView('home'));

            // Builder
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

            // Modal
            this.elements.closeModalBtn.addEventListener('click', () => this.closeModal());
            this.elements.modal.addEventListener('click', (e) => {
                if (e.target === this.elements.modal) this.closeModal();
                if (e.target.matches('.meso-length-card')) {
                    const length = e.target.dataset.value;
                    this.showModal('Finalize Plan?', `Are you sure you want to create a ${length}-week plan? This will replace your current schedule.`, [
                        { text: 'Cancel', class: 'secondary-button' },
                        { text: 'Yes, Create Plan', class: 'cta-button', action: () => this.finalizeAndStartPlan(length) }
                    ]);
                }
            });

            // Card Selections
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

            // Workout View
            this.elements.workoutView.addEventListener('click', (e) => {
                if (e.target.matches('.add-set-btn')) this.addSet(e.target.dataset.exerciseIndex);
                if (e.target.matches('#complete-workout-btn')) this.confirmCompleteWorkout();
            });
            this.elements.workoutView.addEventListener('input', (e) => {
                if(e.target.matches('.weight-input, .reps-input, .rir-input')) this.handleSetInput(e.target);
            });
            
            // Performance Summary
            document.getElementById('exercise-tracker-select')?.addEventListener('change', (e) => this.renderProgressChart(e.target.value));

            // Settings Toggles
            document.getElementById('units-lbs-btn')?.addEventListener('click', () => this.setUnits('lbs'));
            document.getElementById('units-kg-btn')?.addEventListener('click', () => this.setUnits('kg'));
            document.getElementById('theme-dark-btn')?.addEventListener('click', () => this.setTheme('dark'));
            document.getElementById('theme-light-btn')?.addEventListener('click', () => this.setTheme('light'));
            document.getElementById('prog-linear-btn')?.addEventListener('click', () => this.setProgressionModel('linear'));
            document.getElementById('prog-double-btn')?.addEventListener('click', () => this.setProgressionModel('double'));
            document.getElementById('weight-increment-switch')?.addEventListener('click', (e) => {
                if (e.target.matches('.toggle-btn')) {
                    this.setWeightIncrement(parseFloat(e.target.dataset.increment));
                }
            });
        },
        
        openMesoLengthModal() {
            this.elements.modalBody.innerHTML = `
                <h2>Select Mesocycle Length</h2>
                <p>How many weeks should this training block last? (This includes a 1-week deload at the end)</p>
                <div class="card-group">
                    <div class="goal-card meso-length-card" data-value="4" role="button" tabindex="0"><h3>4</h3><p>Short</p></div>
                    <div class="goal-card meso-length-card" data-value="6" role="button" tabindex="0"><h3>6</h3><p>Standard</p></div>
                    <div class="goal-card meso-length-card" data-value="8" role="button" tabindex="0"><h3>8</h3><p>Long</p></div>
                    <div class="goal-card meso-length-card" data-value="12" role="button" tabindex="0"><h3>12</h3><p>Extended</p></div>
                </div>
            `;
            this.elements.modalActions.innerHTML = '';
            this.elements.modal.classList.add('active');
        },

        showModal(title, message, buttons = []) {
            this.elements.modalBody.innerHTML = `<h2>${title}</h2><p>${message}</p>`;
            this.elements.modalActions.innerHTML = '';
            
            if (buttons.length === 0) {
                buttons.push({ text: 'OK', class: 'cta-button' });
            }

            buttons.forEach(btnInfo => {
                const button = document.createElement('button');
                button.textContent = btnInfo.text;
                button.className = btnInfo.class;
                button.addEventListener('click', () => {
                    this.closeModal();
                    if (btnInfo.action) {
                        btnInfo.action();
                    }
                });
                this.elements.modalActions.appendChild(button);
            });

            this.elements.modal.classList.add('active');
        },

        closeModal() {
            this.elements.modal.classList.remove('active');
        },

        showView(viewName, skipAnimation = false) {
            const currentViewId = this.viewMap[this.state.currentViewName];
            const newViewId = this.viewMap[viewName];

            if (!newViewId) {
                console.error(`View "${viewName}" not found in viewMap.`);
                return;
            }

            const currentViewEl = document.getElementById(currentViewId);
            const newViewEl = document.getElementById(newViewId);

            if (!newViewEl) {
                console.error(`Element with ID "${newViewId}" for view "${viewName}" not found.`);
                return;
            }

            const transition = () => {
                if(currentViewEl) {
                    currentViewEl.classList.add('hidden');
                    currentViewEl.classList.remove('fade-out');
                }
                newViewEl.classList.remove('hidden');

                if (viewName === 'onboarding') this.showStep(this.state.currentStep);
                else if (viewName === 'workout') this.renderDailyWorkout(this.state.currentView.week, this.state.currentView.day);
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
        
        // --- SETTINGS METHODS ---
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
        },

        async setUnits(unit) {
            this.state.settings.units = unit;
            await this.saveStateToFirestore();
            this.renderSettings();
            if (this.state.currentViewName === 'workout') {
                this.renderDailyWorkout(this.state.currentView.week, this.state.currentView.day);
            }
        },

        async setTheme(theme) {
            this.state.settings.theme = theme;
            this.applyTheme();
            await this.saveStateToFirestore();
            this.renderSettings();
        },

        applyTheme() {
            document.body.dataset.theme = this.state.settings.theme;
        },

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

        // --- BUILDER METHODS ---
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
                    const exerciseOptions = [{name: 'Select an Exercise'}, ...exercisesForMuscle].map(ex => `<option value="${ex.name}">${ex.name}</option>`).join('');
                    const numSlots = exerciseSlotsByFocus[mg.focus] || 3;
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
                    const isRestDay = mg.muscle === 'restday';
                    return `
                        <div class="muscle-group-block">
                            <div class="muscle-group-header">
                                <div class="muscle-group-selectors">
                                    <select class="builder-select muscle-select" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}">
                                        ${muscleOptions.replace(`value="${mg.muscle}"`, `value="${mg.muscle}" selected`)}
                                    </select>
                                    ${!isRestDay ? `<div class="focus-buttons">${focusButtons}</div>` : ''}
                                </div>
                                <button class="delete-btn delete-muscle-group-btn" data-muscle-index="${muscleIndex}" aria-label="Delete muscle group">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                            </div>
                            ${!isRestDay && mg.muscle !== 'selectamuscle' ? `<div class="exercise-selection-group"><label>Exercises:</label>${exerciseDropdowns}</div>` : ''}
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
                        <button class="delete-btn delete-day-btn" aria-label="Delete day">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                    <div class="day-content">
                        ${muscleGroupsHTML}
                        <button class="cta-button secondary-button add-muscle-group-btn">+ Add a Muscle Group</button>
                    </div>
                `;
                container.appendChild(dayCard);
            });
        },
        addDayToBuilder() { 
            this.state.builderPlan.days.forEach(day => day.isExpanded = false);
            
            this.state.builderPlan.days.push({ 
                label: 'Add a label', 
                muscleGroups: [{ muscle: 'selectamuscle', focus: 'Primary', exercises: ['', '', ''] }],
                isExpanded: true
            }); 
            this.renderBuilder(); 
        },
        toggleDayExpansion(dayIndex) {
            this.state.builderPlan.days.forEach((day, index) => {
                day.isExpanded = (index === dayIndex) ? !day.isExpanded : false;
            });
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
        
        async finalizeAndStartPlan(mesoLength) {
            if (this.state.builderPlan.days.length === 0) {
                this.showModal("Incomplete Plan", "Please add at least one day to your plan before saving.");
                return;
            }
            const newMeso = { id: `meso_${Date.now()}`, startDate: new Date().toISOString(), durationWeeks: parseInt(mesoLength) || 6, goal: 'custom', experience: this.state.userSelections.experience, weeks: {} };
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
                                        targetReps: 8, targetRIR: isDeload ? 4 : 2, targetLoad: null, sets: []
                                    };
                                })
                        )
                    };
                });
            }
            this.state.plan = newMeso;
            this.state.allPlans = [newMeso];
            this.state.currentView = { week: 1, day: 1 };
            await this.saveStateToFirestore();
            this.showView('home');
        },
        
        // --- ONBOARDING METHODS ---
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
        updateProgress() {
            const percentage = ((this.state.currentStep - 1) / (this.state.totalSteps - 1)) * 100;
            this.elements.progress.style.width = `${percentage}%`;
        },
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
            if (shouldSave) {
                await this.saveStateToFirestore();
            }
        },
        async finishOnboarding() {
            this.state.userSelections.onboardingCompleted = true; // Set the flag
            await this.saveStateToFirestore();
            this.showView('home');
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
                container.innerHTML = `<p class="placeholder-text">You either have no workout scheduled for today or your plan is incomplete. Go to the builder to create one!</p>`;
                document.getElementById('complete-workout-btn').classList.add('hidden');
                return;
            }
            document.getElementById('complete-workout-btn').classList.remove('hidden');
            const workout = this.state.plan.weeks[weekNumber][dayNumber];
            workoutTitle.textContent = workout.name;
            if (workout.exercises.length === 0) {
                container.innerHTML = `<p class="placeholder-text">This is a rest day. Enjoy it!</p>`;
                document.getElementById('complete-workout-btn').classList.remove('hidden');
                return;
            }
            const unitLabel = this.state.settings.units.toUpperCase();
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
                                <span>WEIGHT (${unitLabel})</span>
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
            const property = inputElement.classList.contains('weight-input') ? 'weight' : inputElement.classList.contains('reps-input') ? 'reps' : 'rir';
            const workout = this.state.plan.weeks[this.state.currentView.week][this.state.currentView.day];
            if(workout && workout.exercises[exerciseIndex] && workout.exercises[exerciseIndex].sets[setIndex]) {
               workout.exercises[exerciseIndex].sets[setIndex][property] = isNaN(value) ? '' : value;
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

        confirmCompleteWorkout() {
            this.showModal('Complete Workout?', 'Are you sure you want to complete this workout? This action cannot be undone.', [
                { text: 'Cancel', class: 'secondary-button' },
                { text: 'Yes, Complete', class: 'cta-button', action: () => this.completeWorkout() }
            ]);
        },

        async completeWorkout() {
            const { week, day } = this.state.currentView;
            const workout = this.state.plan.weeks[week][day];
            workout.completed = true;
            workout.completedDate = new Date().toISOString();
            if (week < this.state.plan.durationWeeks -1 && workout.exercises.length > 0) {
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
                    this.state.currentView = { week: 1, day: 1 };
                    await this.saveStateToFirestore();
                    this.showModal('Mesocycle Complete!', 'Congratulations! You have finished your training block. Your plan has been reset.', [
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

        calculateNextWeekProgression(completedWeekNumber) {
            const nextWeekNumber = completedWeekNumber + 1;
            if (!this.state.plan.weeks[nextWeekNumber]) return;
        
            const { progressionModel, weightIncrement } = this.state.settings;
            const REP_RANGE_FLOOR = 8;
            const REP_RANGE_CEILING = 12;
        
            for (const dayKey in this.state.plan.weeks[completedWeekNumber]) {
                const completedDay = this.state.plan.weeks[completedWeekNumber][dayKey];
                const nextWeekDay = this.state.plan.weeks[nextWeekNumber][dayKey];
        
                if (!nextWeekDay) continue;
        
                completedDay.exercises.forEach((completedEx) => {
                    const nextWeekEx = nextWeekDay.exercises.find(ex => ex.exerciseId === completedEx.exerciseId);
                    if (!nextWeekEx) return;
        
                    if (completedEx.sets.length === 0) {
                        nextWeekEx.targetLoad = completedEx.targetLoad || null;
                        nextWeekEx.targetReps = completedEx.targetReps || REP_RANGE_FLOOR;
                        return;
                    }
        
                    let successfulSets = 0;
                    completedEx.sets.forEach(set => {
                        if (set.reps >= completedEx.targetReps) successfulSets++;
                    });
                    const allSetsSuccessful = successfulSets >= completedEx.targetSets;
                    const lastSetWeight = completedEx.sets[completedEx.sets.length - 1].weight;
        
                    if (progressionModel === 'double') {
                        if (allSetsSuccessful) {
                            const newTargetReps = (completedEx.targetReps || REP_RANGE_FLOOR) + 1;
                            if (newTargetReps > REP_RANGE_CEILING) {
                                nextWeekEx.targetLoad = lastSetWeight + weightIncrement;
                                nextWeekEx.targetReps = REP_RANGE_FLOOR;
                            } else {
                                nextWeekEx.targetLoad = lastSetWeight;
                                nextWeekEx.targetReps = newTargetReps;
                            }
                        } else {
                            nextWeekEx.targetLoad = lastSetWeight;
                            nextWeekEx.targetReps = completedEx.targetReps;
                        }
                    } else { // Linear Progression
                        if (allSetsSuccessful) {
                            nextWeekEx.targetLoad = lastSetWeight + weightIncrement;
                        } else {
                            nextWeekEx.targetLoad = lastSetWeight;
                        }
                        nextWeekEx.targetReps = completedEx.targetReps;
                    }
                });
            }
        },

        renderPerformanceSummary() {
            const listContainer = document.getElementById('completed-workouts-list');
            const exerciseSelect = document.getElementById('exercise-tracker-select');
            listContainer.innerHTML = '';
            exerciseSelect.innerHTML = '<option value="">Select an exercise to track</option>';
            const completedWorkouts = [];
            const uniqueExercises = new Set();
            if (this.state.plan && this.state.plan.weeks) {
                Object.values(this.state.plan.weeks).forEach(week => {
                    Object.values(week).forEach(day => {
                        if (day.completed) {
                            completedWorkouts.push(day);
                            day.exercises.forEach(ex => uniqueExercises.add(ex.name));
                        }
                    });
                });
            }
            if (completedWorkouts.length === 0) {
                listContainer.innerHTML = '<p class="placeholder-text">No completed workouts yet. Go get one done!</p>';
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
        },
        
        renderProgressChart(exerciseName) {
            const ctx = document.getElementById('progress-chart').getContext('2d');
            if (this.state.progressChart) this.state.progressChart.destroy();
            if (!exerciseName) {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                return;
            }
            const labels = [];
            const dataPoints = [];
            if (this.state.plan && this.state.plan.weeks) {
                 Object.values(this.state.plan.weeks).forEach((week, weekIndex) => {
                    Object.values(week).forEach(day => {
                        if (day.completed) {
                            const exercise = day.exercises.find(ex => ex.name === exerciseName);
                            if (exercise && exercise.sets.length > 0) {
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
                    scales: {
                        y: { beginAtZero: true, ticks: { color: 'var(--text-muted-color)' }, grid: { color: 'var(--border-color)' } },
                        x: { ticks: { color: 'var(--text-muted-color)' }, grid: { color: 'var(--border-color)' } }
                    },
                    plugins: { legend: { labels: { color: 'var(--text-color)' } } }
                }
            });
        },

        capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""; }
    };
    
    for (const key in app) {
        if (typeof app[key] === 'function') app[key] = app[key].bind(app);
    }
    
    app.init();
});

