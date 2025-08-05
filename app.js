// --- Global State & Utility Functions ---

// All main container views
const onboardingContainer = document.getElementById('onboarding-container');
const homeScreen = document.getElementById('home-screen');
const builderView = document.getElementById('builder-view');
const activeWorkoutView = document.getElementById('active-workout-view');
const reviewView = document.getElementById('review-view');
const workoutDetailsView = document.getElementById('workout-details-view');
const editDayView = document.getElementById('edit-day-view');
const modal = document.getElementById('modal');

// All buttons and elements for Onboarding
const beginOnboardingBtn = document.getElementById('beginOnboardingBtn');
const onboardingSteps = document.querySelectorAll('.step');
const backBtnsOnboarding = document.querySelectorAll('.back-btn-onboarding');
const progressBar = document.querySelector('.progress');
const goalNextBtn = document.getElementById('goalNextBtn');
const experienceNextBtn = document.getElementById('experienceNextBtn');
const prefsNextBtn = document.getElementById('prefsNextBtn');
const skipDetailsBtn = document.getElementById('skipDetailsBtn');
const detailsNextBtn = document.getElementById('detailsNextBtn');
const finishOnboardingBtn = document.getElementById('finishOnboardingBtn');

// All buttons and elements for Home Screen & Navigation
const planMesoBtn = document.getElementById('planMesoBtn');
const startWorkoutBtn = document.getElementById('startWorkoutBtn');
const reviewWorkoutsBtn = document.getElementById('reviewWorkoutsBtn');

// All buttons and elements for Mesocycle Builder
const backToHomeFromBuilderBtn = document.getElementById('backToHomeFromBuilder');
const scheduleContainer = document.getElementById('schedule-container');
const addDayBtn = document.getElementById('add-day-btn');
const donePlanningBtn = document.getElementById('done-planning-btn');

// All buttons and elements for Edit Day
const backToBuilderBtn = document.getElementById('backToBuilderBtn');
const editDayTitle = document.getElementById('edit-day-title');
const exercisePlanContainer = document.getElementById('exercise-plan-container');
const addExerciseBtn = document.getElementById('add-exercise-btn');
const saveDayBtn = document.getElementById('save-day-btn');

// All buttons and elements for Active Workout
const activeWorkoutTitle = document.getElementById('active-workout-title');
const activeExerciseList = document.getElementById('active-exercise-list');
const backFromActiveWorkoutBtn = document.getElementById('backFromActiveWorkout');
const completeActiveWorkoutBtn = document.getElementById('complete-active-workout-btn');

// All buttons and elements for Review Workouts
const backFromReviewBtn = document.getElementById('backFromReview');
const pastWorkoutsList = document.getElementById('past-workouts-list');
const backToReviewListBtn = document.getElementById('backToReviewList');
const detailsWorkoutTitle = document.getElementById('details-workout-title');
const detailsWorkoutDate = document.getElementById('details-workout-date');
const workoutDetailsContent = document.getElementById('workout-details-content');

// Modal Elements
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.querySelector('.close-btn');
const addExerciseTemplate = document.getElementById('add-exercise-template');
const editExerciseTemplate = document.getElementById('edit-exercise-template');

// State Variables
let currentStep = 1;
let onboardingData = {};
let currentMesocycle = [];
let currentEditingDayIndex = -1;
let currentEditingExerciseIndex = -1;
let currentWorkout = {};
let workoutStartTime;

// A simple exercise database
const exerciseDatabase = [
    { name: 'Barbell Squat', muscles: ['quads', 'glutes'] },
    { name: 'Dumbbell Bench Press', muscles: ['chest', 'triceps'] },
    { name: 'Pull-ups', muscles: ['back', 'biceps'] },
    { name: 'Deadlift', muscles: ['hamstrings', 'back'] },
    { name: 'Leg Press', muscles: ['quads', 'glutes'] },
    { name: 'Overhead Press', muscles: ['shoulders', 'triceps'] },
    { name: 'Barbell Rows', muscles: ['back', 'biceps'] },
    { name: 'Bicep Curls', muscles: ['biceps'] },
    { name: 'Tricep Pushdowns', muscles: ['triceps'] },
    { name: 'Leg Extensions', muscles: ['quads'] },
];

// Utility function to show a specific view and hide all others
function showView(viewId) {
    const views = [onboardingContainer, homeScreen, builderView, activeWorkoutView, reviewView, workoutDetailsView, editDayView, modal];
    views.forEach(view => {
        if (view && view.id === viewId) {
            view.classList.remove('hidden');
        } else if (view) {
            view.classList.add('hidden');
        }
    });
}

function updateProgressBar(step) {
    const totalSteps = 6;
    const progressPercentage = (step - 1) / (totalSteps - 1) * 100;
    progressBar.style.width = `${progressPercentage}%`;
}

function handleCardSelection(event) {
    const card = event.target.closest('.goal-card');
    if (!card) return;

    const cardGroup = card.parentElement;
    const field = cardGroup.getAttribute('data-field');

    cardGroup.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    onboardingData[field] = card.getAttribute('data-value');
}

// --- Onboarding Logic ---

function showStep(stepNumber) {
    onboardingSteps.forEach(step => {
        if (parseInt(step.id.replace('step', '')) === stepNumber) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    updateProgressBar(stepNumber);
}

function navigateOnboarding(direction) {
    if (direction === 'next' && currentStep < onboardingSteps.length) {
        currentStep++;
    } else if (direction === 'back' && currentStep > 1) {
        currentStep--;
    }
    showStep(currentStep);
}

function saveOnboardingData() {
    localStorage.setItem('onboardingData', JSON.stringify(onboardingData));
}

// --- Mesocycle Builder & Edit Day Logic ---

function renderMesocycleBuilder() {
    scheduleContainer.innerHTML = '';
    currentMesocycle.forEach((day, index) => {
        const dayCard = document.createElement('div');
        dayCard.classList.add('day-card');
        dayCard.innerHTML = `
            <h3>${day.name}</h3>
            <p>${day.exercises.length} Exercises</p>
            <button class="cta-button edit-day-btn" data-day-index="${index}">Edit</button>
            <button class="delete-day-btn" data-day-index="${index}">&times;</button>
        `;
        scheduleContainer.appendChild(dayCard);
    });
}

function addWorkoutDay() {
    const dayNumber = currentMesocycle.length + 1;
    const newDay = {
        name: `Day ${dayNumber}`,
        exercises: []
    };
    currentMesocycle.push(newDay);
    renderMesocycleBuilder();
}

function deleteWorkoutDay(index) {
    if (confirm(`Are you sure you want to delete ${currentMesocycle[index].name}?`)) {
        currentMesocycle.splice(index, 1);
        renderMesocycleBuilder();
    }
}

function editWorkoutDay(index) {
    currentEditingDayIndex = index;
    const day = currentMesocycle[index];

    editDayTitle.textContent = `Edit ${day.name}`;
    renderExercisesForDay(day);
    showView('edit-day-view');
}

function renderExercisesForDay(day) {
    exercisePlanContainer.innerHTML = '';
    
    if (day.exercises.length === 0) {
        exercisePlanContainer.innerHTML = '<p class="empty-state">No exercises added yet.</p>';
        return;
    }

    day.exercises.forEach((exercise, index) => {
        const exerciseElement = document.createElement('div');
        exerciseElement.classList.add('exercise-card', 'editable');
        exerciseElement.innerHTML = `
            <h3>${exercise.name} <span class="designator">${exercise.designator}</span></h3>
            <p>${exercise.sets} sets of ${exercise.reps} reps</p>
            <div class="exercise-actions">
                <button class="cta-button edit-exercise-btn" data-exercise-index="${index}">Edit</button>
                <button class="delete-exercise-btn" data-exercise-index="${index}">&times;</button>
            </div>
        `;
        exercisePlanContainer.appendChild(exerciseElement);
    });
}

function addExercise() {
    modalBody.innerHTML = '';
    modalBody.appendChild(addExerciseTemplate.content.cloneNode(true));
    modal.classList.remove('hidden');

    const exerciseListModal = document.getElementById('exercise-list-modal');
    const searchInput = document.getElementById('exercise-search');

    renderExerciseList(exerciseDatabase, exerciseListModal);

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredExercises = exerciseDatabase.filter(ex => 
            ex.name.toLowerCase().includes(searchTerm)
        );
        renderExerciseList(filteredExercises, exerciseListModal);
    });
}

function renderExerciseList(exercises, container) {
    container.innerHTML = '';
    exercises.forEach(ex => {
        const exerciseCard = document.createElement('div');
        exerciseCard.classList.add('exercise-list-card');
        exerciseCard.setAttribute('data-name', ex.name);
        exerciseCard.innerHTML = `<h3>${ex.name}</h3>`;
        container.appendChild(exerciseCard);
    });
}

function editExercise(index) {
    currentEditingExerciseIndex = index;
    const exercise = currentMesocycle[currentEditingDayIndex].exercises[index];

    modalBody.innerHTML = '';
    modalBody.appendChild(editExerciseTemplate.content.cloneNode(true));
    modal.classList.remove('hidden');

    document.getElementById('edit-exercise-name').textContent = exercise.name;
    document.getElementById('edit-sets').value = exercise.sets;
    document.getElementById('edit-reps').value = exercise.reps;
    document.getElementById('edit-notes').value = exercise.notes || '';

    const designatorBtns = document.querySelectorAll('.designator-btn');
    designatorBtns.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.getAttribute('data-value') === exercise.designator) {
            btn.classList.add('selected');
        }
    });

    document.querySelectorAll('.designator-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.designator-btn').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
        });
    });
}

function saveExerciseChanges() {
    const exercise = currentMesocycle[currentEditingDayIndex].exercises[currentEditingExerciseIndex];
    
    exercise.sets = document.getElementById('edit-sets').value;
    exercise.reps = document.getElementById('edit-reps').value;
    exercise.notes = document.getElementById('edit-notes').value;
    exercise.designator = document.querySelector('.designator-btn.selected')?.getAttribute('data-value');

    renderExercisesForDay(currentMesocycle[currentEditingDayIndex]);
    modal.classList.add('hidden');
    currentEditingExerciseIndex = -1;
}

function deleteExerciseFromModal() {
    if (confirm('Are you sure you want to remove this exercise?')) {
        currentMesocycle[currentEditingDayIndex].exercises.splice(currentEditingExerciseIndex, 1);
        renderExercisesForDay(currentMesocycle[currentEditingDayIndex]);
        modal.classList.add('hidden');
        currentEditingExerciseIndex = -1;
    }
}

function saveDay() {
    currentEditingDayIndex = -1;
    showView('builder-view');
    renderMesocycleBuilder();
}

// --- Active Workout Logic ---

function startNextWorkout() {
    const savedMesocycle = JSON.parse(localStorage.getItem('currentMesocycle')) || [];
    if (savedMesocycle.length > 0) {
        currentWorkout = {
            date: new Date().toISOString().split('T')[0],
            day: savedMesocycle[0].name, // Use the first day for now
            exercises: savedMesocycle[0].exercises
        };
    } else {
        // Fallback placeholder if no plan is saved
        currentWorkout = {
            date: new Date().toISOString().split('T')[0],
            day: 'Day 1 - Placeholder',
            exercises: [
                { name: 'Barbell Squat', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Dumbbell Bench Press', sets: 3, reps: '10-12', rest: 90 },
            ]
        };
    }

    activeWorkoutTitle.textContent = currentWorkout.day;
    renderActiveExercises();
    showView('active-workout-view');
    workoutStartTime = new Date();
}

function renderActiveExercises() {
    activeExerciseList.innerHTML = '';
    currentWorkout.exercises.forEach((exercise, index) => {
        const exerciseElement = document.createElement('div');
        exerciseElement.classList.add('exercise-card');
        exerciseElement.innerHTML = `
            <h3>${exercise.name}</h3>
            <p>${exercise.sets} sets of ${exercise.reps} reps</p>
            <div class="sets-container" id="sets-container-${index}"></div>
        `;
        activeExerciseList.appendChild(exerciseElement);

        const setsContainer = document.getElementById(`sets-container-${index}`);
        for (let i = 0; i < exercise.sets; i++) {
            const setInput = document.createElement('div');
            setInput.classList.add('set-input-group');
            setInput.innerHTML = `
                <span class="set-label">Set ${i + 1}</span>
                <input type="number" class="reps-input" placeholder="Reps">
                <input type="number" class="weight-input" placeholder="Weight (kg)">
            `;
            setsContainer.appendChild(setInput);
        }
    });
}

function finishWorkout() {
    const finishedWorkoutData = {
        date: currentWorkout.date,
        day: currentWorkout.day,
        duration: (new Date() - workoutStartTime) / 1000 / 60,
        exercises: []
    };

    const exerciseCards = activeExerciseList.querySelectorAll('.exercise-card');
    exerciseCards.forEach((card, exerciseIndex) => {
        const exerciseName = card.querySelector('h3').textContent;
        const setsInputs = card.querySelectorAll('.set-input-group');
        
        const setsData = [];
        setsInputs.forEach(setInput => {
            const reps = setInput.querySelector('.reps-input').value;
            const weight = setInput.querySelector('.weight-input').value;
            if (reps && weight) {
                setsData.push({
                    reps: parseInt(reps, 10),
                    weight: parseFloat(weight)
                });
            }
        });

        finishedWorkoutData.exercises.push({
            name: exerciseName,
            sets: setsData
        });
    });

    const previousWorkouts = JSON.parse(localStorage.getItem('previousWorkouts')) || [];
    previousWorkouts.push(finishedWorkoutData);
    localStorage.setItem('previousWorkouts', JSON.stringify(previousWorkouts));
    
    currentWorkout = {};
    showView('home-screen');
}

// --- Review Workouts Logic ---

function renderPreviousWorkouts() {
    pastWorkoutsList.innerHTML = '';
    const previousWorkouts = JSON.parse(localStorage.getItem('previousWorkouts')) || [];

    if (previousWorkouts.length === 0) {
        pastWorkoutsList.innerHTML = '<p class="empty-state">No workouts logged yet.</p>';
        return;
    }

    previousWorkouts.forEach((workout, index) => {
        const workoutCard = document.createElement('div');
        workoutCard.classList.add('workout-card');
        workoutCard.setAttribute('data-index', index);
        workoutCard.innerHTML = `
            <h3>${workout.day}</h3>
            <p>${workout.date}</p>
        `;
        workoutCard.addEventListener('click', () => showWorkoutDetails(index));
        pastWorkoutsList.appendChild(workoutCard);
    });
}

function showWorkoutDetails(index) {
    const previousWorkouts = JSON.parse(localStorage.getItem('previousWorkouts')) || [];
    const workout = previousWorkouts[index];

    if (!workout) return;

    detailsWorkoutTitle.textContent = workout.day;
    detailsWorkoutDate.textContent = workout.date;
    workoutDetailsContent.innerHTML = '';

    workout.exercises.forEach(exercise => {
        const exerciseDetails = document.createElement('div');
        exerciseDetails.classList.add('exercise-details-card');
        exerciseDetails.innerHTML = `<h4>${exercise.name}</h4>`;

        if (exercise.sets && exercise.sets.length > 0) {
            const setsList = document.createElement('ul');
            setsList.classList.add('sets-list');
            exercise.sets.forEach((set, setIndex) => {
                const setItem = document.createElement('li');
                setItem.textContent = `Set ${setIndex + 1}: ${set.reps} reps @ ${set.weight} kg`;
                setsList.appendChild(setItem);
            });
            exerciseDetails.appendChild(setsList);
        } else {
            exerciseDetails.innerHTML += `<p>No sets logged for this exercise.</p>`;
        }
        
        workoutDetailsContent.appendChild(exerciseDetails);
    });
    
    showView('workout-details-view');
}

// --- Initial Check & Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('onboardingData');
    if (userData) {
        onboardingData = JSON.parse(userData);
        showView('home-screen');
    } else {
        showView('onboarding-container');
        showStep(1);
    }
});

// Onboarding Event Listeners
beginOnboardingBtn.addEventListener('click', () => navigateOnboarding('next'));
goalNextBtn.addEventListener('click', () => navigateOnboarding('next'));
experienceNextBtn.addEventListener('click', () => navigateOnboarding('next'));
prefsNextBtn.addEventListener('click', () => navigateOnboarding('next'));
skipDetailsBtn.addEventListener('click', () => {
    saveOnboardingData();
    navigateOnboarding('next');
});
detailsNextBtn.addEventListener('click', () => {
    onboardingData.gender = document.querySelector('.card-group[data-field="gender"] .selected')?.getAttribute('data-value');
    onboardingData.height = document.getElementById('heightInput').value;
    onboardingData.weight = document.getElementById('weightInput').value;
    saveOnboardingData();
    navigateOnboarding('next');
});
finishOnboardingBtn.addEventListener('click', () => showView('home-screen'));
backBtnsOnboarding.forEach(btn => btn.addEventListener('click', () => navigateOnboarding('back')));
document.querySelectorAll('.card-group').forEach(group => group.addEventListener('click', handleCardSelection));

// Home Screen Event Listeners
planMesoBtn.addEventListener('click', () => {
    const savedMesocycle = JSON.parse(localStorage.getItem('currentMesocycle'));
    if (savedMesocycle) {
        currentMesocycle = savedMesocycle;
    }
    showView('builder-view');
    renderMesocycleBuilder();
});
startWorkoutBtn.addEventListener('click', startNextWorkout);
reviewWorkoutsBtn.addEventListener('click', () => {
    showView('review-view');
    renderPreviousWorkouts();
});

// Mesocycle Builder & Edit Day Event Listeners
backToHomeFromBuilderBtn.addEventListener('click', () => showView('home-screen'));
addDayBtn.addEventListener('click', addWorkoutDay);
donePlanningBtn.addEventListener('click', () => {
    localStorage.setItem('currentMesocycle', JSON.stringify(currentMesocycle));
    showView('home-screen');
});
backToBuilderBtn.addEventListener('click', () => {
    currentEditingDayIndex = -1;
    showView('builder-view');
});
addExerciseBtn.addEventListener('click', addExercise);
saveDayBtn.addEventListener('click', saveDay);

// Event Delegation for dynamically created buttons
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-day-btn')) {
        const index = parseInt(e.target.getAttribute('data-day-index'));
        editWorkoutDay(index);
    }
    if (e.target.classList.contains('delete-day-btn')) {
        const index = parseInt(e.target.getAttribute('data-day-index'));
        deleteWorkoutDay(index);
    }
    if (e.target.closest('#modal') && e.target.classList.contains('exercise-list-card')) {
        const selectedExerciseCard = e.target.closest('.exercise-list-card');
        const exerciseName = selectedExerciseCard.getAttribute('data-name');
        const newExercise = {
            name: exerciseName,
            sets: 3,
            reps: '10-12',
            notes: '',
            designator: 'primary'
        };

        currentMesocycle[currentEditingDayIndex].exercises.push(newExercise);
        renderExercisesForDay(currentMesocycle[currentEditingDayIndex]);
        modal.classList.add('hidden');
    }
    if (e.target.classList.contains('edit-exercise-btn')) {
        const index = parseInt(e.target.getAttribute('data-exercise-index'));
        editExercise(index);
    }
    if (e.target.classList.contains('delete-exercise-btn')) {
        const index = parseInt(e.target.getAttribute('data-exercise-index'));
        if (confirm('Are you sure you want to remove this exercise?')) {
            currentMesocycle[currentEditingDayIndex].exercises.splice(index, 1);
            renderExercisesForDay(currentMesocycle[currentEditingDayIndex]);
        }
    }
    if (e.target.id === 'modal-save-btn') {
        saveExerciseChanges();
    }
    if (e.target.id === 'modal-delete-btn') {
        deleteExerciseFromModal();
    }
});

// Active Workout Event Listeners
backFromActiveWorkoutBtn.addEventListener('click', () => showView('home-screen'));
completeActiveWorkoutBtn.addEventListener('click', finishWorkout);

// Review Workouts Event Listeners
backFromReviewBtn.addEventListener('click', () => showView('home-screen'));
backToReviewListBtn.addEventListener('click', () => showView('review-view'));

// Modal Listener
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
}
