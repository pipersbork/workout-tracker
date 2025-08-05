// --- Global State & Utility Functions ---

// All main container views
const onboardingContainer = document.getElementById('onboarding-container');
const homeScreen = document.getElementById('home-screen');
const builderView = document.getElementById('builder-view');
const activeWorkoutView = document.getElementById('active-workout-view');
const dailyWorkoutView = document.getElementById('daily-workout-view');
const reviewView = document.getElementById('review-view');
const workoutDetailsView = document.getElementById('workout-details-view');
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

// State Variables
let currentStep = 1;
let onboardingData = {};
let currentMesocycle = []; // This will store the workout plan
let currentWorkout = {};
let workoutStartTime;

// Utility function to show a specific view and hide all others
function showView(viewId) {
    const views = [onboardingContainer, homeScreen, builderView, dailyWorkoutView, activeWorkoutView, reviewView, workoutDetailsView, modal];
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

    // Deselect all other cards in the group
    cardGroup.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
    // Select the clicked card
    card.classList.add('selected');

    // Store the selected value
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
    // Save data to localStorage
    localStorage.setItem('onboardingData', JSON.stringify(onboardingData));
}

// --- Mesocycle Builder Logic ---

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

// --- Active Workout Logic ---

function startNextWorkout() {
    // For now, we'll use placeholder data. You'll replace this with your mesocycle plan later.
    currentWorkout = {
        date: new Date().toISOString().split('T')[0],
        day: 'Day 1 - Placeholder',
        exercises: [
            { name: 'Barbell Squat', sets: 3, reps: 8, rest: 120 },
            { name: 'Dumbbell Bench Press', sets: 3, reps: 10, rest: 90 },
            { name: 'Pull-ups', sets: 3, reps: 'AMRAP', rest: 90 },
        ]
    };

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
    // Gather and save optional details
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
    showView('builder-view');
    renderMesocycleBuilder();
});
startWorkoutBtn.addEventListener('click', startNextWorkout);
reviewWorkoutsBtn.addEventListener('click', () => {
    showView('review-view');
    renderPreviousWorkouts();
});

// Mesocycle Builder Event Listeners
backToHomeFromBuilderBtn.addEventListener('click', () => showView('home-screen'));
addDayBtn.addEventListener('click', addWorkoutDay);
donePlanningBtn.addEventListener('click', () => {
    // For now, save the plan and go home.
    localStorage.setItem('currentMesocycle', JSON.stringify(currentMesocycle));
    showView('home-screen');
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
