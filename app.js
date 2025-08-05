document.addEventListener('DOMContentLoaded', () => {

const app = {
state: {
currentStep: 1,
            totalSteps: 7,
            totalSteps: 6,
userSelections: { 
goal: "", 
experience: "", 
style: "", 
days: "", 
                mesoLength: "",
gender: "",
height: "",
weight: ""
@@ -30,13 +29,14 @@
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
@@ -69,7 +69,6 @@
if (completed === "true") {
this.state.userSelections = JSON.parse(localStorage.getItem("userSelections")) || this.state.userSelections;
this.state.allPlans = JSON.parse(localStorage.getItem("savedPlans")) || [];

const savedView = JSON.parse(localStorage.getItem("currentView"));
if (savedView) {
this.state.currentView = savedView;
@@ -92,7 +91,6 @@
document.getElementById('prefsNextBtn')?.addEventListener('click', () => {
if (this.validateStep('style') && this.validateStep('days')) { this.nextStep(); }
});
            document.getElementById('mesoLengthNextBtn')?.addEventListener('click', () => this.validateAndProceed('mesoLength'));
document.getElementById('skipDetailsBtn')?.addEventListener('click', () => this.nextStep());
document.getElementById('detailsNextBtn')?.addEventListener('click', () => { this.savePersonalDetails(); this.nextStep(); });
document.getElementById('finishOnboardingBtn')?.addEventListener('click', () => this.finishOnboarding());
@@ -111,18 +109,15 @@

// Builder Listeners
document.getElementById('add-day-btn')?.addEventListener('click', () => this.addDayToBuilder());
            document.getElementById('done-planning-btn')?.addEventListener('click', () => {
                if (confirm('Are you sure you want to proceed with this work routine?')) {
                    this.finalizeAndStartPlan();
                }
            });
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
@@ -131,6 +126,18 @@
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
@@ -150,6 +157,25 @@
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
@@ -168,71 +194,84 @@
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
                                <button class="delete-btn delete-muscle-group-btn" data-day-index="${dayIndex}" data-muscle-index="${muscleIndex}">🗑️</button>
                                ${mg.muscle !== 'select a muscle' ? `<div class="exercise-selection-group"><label>Exercises:</label>${exerciseDropdowns}</div>` : ''}
                           </div>
                            ${mg.muscle !== 'select a muscle' ? `<div class="exercise-selection-group"><label>Exercises:</label>${exerciseDropdowns}</div>` : ''}
                        </div>
                        `;
                    }).join('');
                    dayContentHTML = `
                        ${muscleGroupsHTML}
                        <button class="cta-button secondary-button add-muscle-group-btn" data-day-index="${dayIndex}">+ Add a Muscle Group</button>
                   `;
                }).join('');
                }

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
                        ${muscleGroupsHTML}
                        <button class="cta-button secondary-button add-muscle-group-btn" data-day-index="${dayIndex}">+ Add a Muscle Group</button>
                        ${dayContentHTML}
                   </div>
               `;
container.appendChild(dayCard);
});
},
        addDayToBuilder() { this.state.builderPlan.days.push({ label: 'Add a label', muscleGroups: [] }); this.renderBuilder(); },
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
if (this.state.builderPlan.days.length === 0) {
alert("Please add at least one day to your plan before saving.");
@@ -253,8 +292,9 @@
this.state.builderPlan.days.forEach((day, dayIndex) => {
newMeso.weeks[i][dayIndex + 1] = {
name: day.label === 'Add a label' ? `Day ${dayIndex + 1}` : day.label,
                        isRecovery: day.isRecovery,
completed: false,
                        exercises: day.muscleGroups.flatMap(mg => 
                        exercises: day.isRecovery ? [] : day.muscleGroups.flatMap(mg => 
mg.exercises.filter(ex => ex && ex !== 'Select an Exercise').map(exName => {
const exerciseDetails = this.state.exercises.find(e => e.name === exName) || {};
return {
@@ -279,289 +319,69 @@
this.saveStateToStorage();
this.showView('workout');
},
        
savePersonalDetails() {
const genderCard = document.querySelector('.card-group[data-field="gender"] .goal-card.active');
this.state.userSelections.gender = genderCard ? genderCard.dataset.value : "";
this.state.userSelections.height = document.getElementById('heightInput').value;
this.state.userSelections.weight = document.getElementById('weightInput').value;
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
element.parentElement.querySelectorAll('.card-group .goal-card').forEach(card => card.classList.remove('active'));
element.classList.add('active');
},

finishOnboarding() {
this.state.plan = this.generateMesocycle(
this.state.userSelections.goal,
this.state.userSelections.experience,
                this.state.userSelections.days,
                6 // Default length for guided plans
                this.state.userSelections.days
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
            const exerciseDatabase = this.state.exercises;
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
                        const exercisesForMuscle = exerciseDatabase.filter(ex => ex.muscle === this.capitalize(muscle));
                        const primaryExercise = exercisesForMuscle.length > 0 ? exercisesForMuscle[0] : null;
                        if (primaryExercise) {
                            mesocycle.weeks[i][j].exercises.push({
                                exerciseId: `ex_${primaryExercise.name.replace(/\s+/g, '_')}`,
                                name: primaryExercise.name,
                                type: 'PrimaryHypertrophy',
                                targetSets: isDeload ? Math.ceil((currentMev[muscle] || 8) / 2 / 2) : Math.ceil((currentMev[muscle] || 8) / 2),
                                targetReps: 10,
                                targetRIR: isDeload ? 4 : 2,
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
                let lastTimeText = '';
                if (weekNumber > 1) {
                    const prevWeekData = plan.weeks[weekNumber - 1]?.[dayNumber];
                    const prevExercise = prevWeekData?.exercises.find(ex => ex.exerciseId === exercise.exerciseId);
                    const lastSet = prevExercise?.sets.filter(s => s.load && s.reps).pop();
                    if (lastSet) {
                        lastTimeText = `Last Time: ${lastSet.load} lbs for ${lastSet.reps} reps`;
                    } else {
                        lastTimeText = "No performance data from last week.";
                    }
                }
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
                    ${lastTimeText ? `<div class="last-time-info">${lastTimeText}</div>` : ''}
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
            
            let nextDay = day + 1;
            let nextWeek = week;
            
            const daysPerWeek = this.state.builderPlan.days.length > 0 ? this.state.builderPlan.days.length : parseInt(this.state.userSelections.days);

            if (day === daysPerWeek) {
                this.calculateNextWeekProgression(week);
                alert(`Week ${week} complete! Your plan for next week has been updated based on your performance.`);
            }

            if (nextDay > daysPerWeek) {
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
            alert(`Workout for Week ${week}, Day ${day} saved!`);
            this.showView('home'); // Go to home screen after workout
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
        generateMesocycle(goal, experience, daysPerWeek, mesoLength) { /* ... full function from previous step ... */ },
        renderDailyWorkout(weekNumber, dayNumber) { /* ... full function from previous step ... */ },
        handleSetInput(inputElement) { /* ... full function from previous step ... */ },
        addSet(exerciseIndex) { /* ... full function from previous step ... */ },
        completeWorkout() { /* ... full function from previous step ... */ },
        calculateNextWeekProgression(completedWeekNumber) { /* ... full function from previous step ... */ },
        capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""; }
};

    // Bind all function contexts
for (const key in app) {
if (typeof app[key] === 'function') {
app[key] = app[key].bind(app);
