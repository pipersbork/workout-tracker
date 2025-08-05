document.addEventListener('DOMContentLoaded', () => {

    // --- DATA ---
    // The single source of truth for the entire mesocycle plan
    let mesocycle = {
        days: []
    };

    // Database of exercises categorized by muscle group
    const exerciseDatabase = {
        'Chest': ['Bench Press', 'Incline Dumbbell Press', 'Chest Flys', 'Dips', 'Push-ups'],
        'Back': ['Pull-ups', 'Bent Over Rows', 'Lat Pulldowns', 'T-Bar Row', 'Seated Cable Row'],
        'Legs': ['Squats', 'Deadlifts', 'Leg Press', 'Lunges', 'Hamstring Curls', 'Calf Raises'],
        'Shoulders': ['Overhead Press', 'Lateral Raises', 'Front Raises', 'Face Pulls'],
        'Biceps': ['Barbell Curls', 'Dumbbell Curls', 'Hammer Curls', 'Preacher Curls'],
        'Triceps': ['Tricep Pushdowns', 'Skull Crushers', 'Overhead Tricep Extension', 'Close Grip Bench Press']
    };
    
    let currentDayIndex = null; // To track which day is being edited

    // --- DOM ELEMENTS ---
    const mesocycleView = document.getElementById('mesocycle-view');
    const dayView = document.getElementById('day-view');
    const dayListContainer = document.getElementById('day-list-container');
    const exerciseListContainer = document.getElementById('exercise-list-container');
    const addDayBtn = document.getElementById('add-day-btn');
    const backToMesoBtn = document.getElementById('back-to-meso-btn');
    const addExerciseBtn = document.getElementById('add-exercise-btn');
    const saveDayBtn = document.getElementById('save-day-btn');
    const dayViewTitle = document.getElementById('day-view-title');

    // Modal elements
    const modal = document.getElementById('exercise-modal');
    const modalTitle = document.getElementById('modal-title');
    const exerciseForm = document.getElementById('exercise-form');
    const cancelExerciseBtn = document.getElementById('cancel-exercise-btn');
    const editingExerciseIndexInput = document.getElementById('editing-exercise-index');
    const dayOfWeekSelector = document.getElementById('day-of-week-selector');
    const muscleGroupSelector = document.getElementById('muscle-group-selector');
    const exerciseNameSelector = document.getElementById('exercise-name-selector');
    const setsInput = document.getElementById('sets-input');
    const repsInput = document.getElementById('reps-input');
    const priorityButtons = document.querySelectorAll('.btn-priority');
    const priorityInput = document.getElementById('priority-input');


    // --- RENDER FUNCTIONS ---

    const renderMesocycleView = () => {
        dayListContainer.innerHTML = '';
        if (mesocycle.days.length === 0) {
            dayListContainer.innerHTML = '<p class="card-details" style="text-align:center;">No days added yet. Click "+ Add a Day" to start.</p>';
        }
        mesocycle.days.forEach((day, index) => {
            const dayCard = document.createElement('div');
            dayCard.className = 'card';
            dayCard.innerHTML = `
                <div class="card-header">
                    <h3>${day.dayName}</h3>
                </div>
                <p class="card-details">${day.exercises.length} Exercises</p>
                <div class="card-actions">
                    <button class="btn btn-primary edit-day-btn" data-day-index="${index}">Edit</button>
                    <button class="btn-delete delete-day-btn" data-day-index="${index}">×</button>
                </div>
            `;
            dayListContainer.appendChild(dayCard);
        });
        showView('mesocycle');
    };
    
    const renderDayView = () => {
        if (currentDayIndex === null) return;
        const day = mesocycle.days[currentDayIndex];
        dayViewTitle.textContent = `Edit ${day.dayName}`;
        exerciseListContainer.innerHTML = '';

        if (day.exercises.length === 0) {
            exerciseListContainer.innerHTML = '<p class="card-details" style="text-align:center;">No exercises added yet. Click "+ Add Exercise" to start.</p>';
        }

        day.exercises.forEach((exercise, index) => {
            const exerciseCard = document.createElement('div');
            exerciseCard.className = 'card';
            exerciseCard.innerHTML = `
                <div class="card-header">
                     <h3>${exercise.priority ? `[${exercise.priority}] ` : ''}${exercise.name}</h3>
                </div>
                <p class="card-details">${exercise.sets} sets of ${exercise.reps} reps • ${exercise.muscleGroup}</p>
                 <div class="card-actions">
                    <button class="btn btn-primary edit-exercise-btn" data-exercise-index="${index}">Edit</button>
                    <button class="btn-delete delete-exercise-btn" data-exercise-index="${index}">×</button>
                </div>
            `;
            exerciseListContainer.appendChild(exerciseCard);
        });
        showView('day');
    };

    // --- VIEW MANAGEMENT ---
    
    const showView = (viewName) => {
        mesocycleView.classList.remove('active');
        dayView.classList.remove('active');
        if (viewName === 'mesocycle') {
            mesocycleView.classList.add('active');
        } else if (viewName === 'day') {
            dayView.classList.add('active');
        }
    };

    // --- MODAL MANAGEMENT ---

    const openExerciseModal = (exerciseIndex = null) => {
        exerciseForm.reset();
        populateMuscleGroupSelector();
        priorityButtons.forEach(btn => btn.classList.remove('selected'));
        priorityInput.value = '';

        if (exerciseIndex !== null) {
            // Editing existing exercise
            modalTitle.textContent = 'Edit Exercise';
            const exercise = mesocycle.days[currentDayIndex].exercises[exerciseIndex];
            editingExerciseIndexInput.value = exerciseIndex;
            dayOfWeekSelector.value = mesocycle.days[currentDayIndex].dayOfWeek || 'Unassigned';
            muscleGroupSelector.value = exercise.muscleGroup;
            populateExerciseNameSelector(exercise.muscleGroup); // Populate exercises for the muscle
            exerciseNameSelector.value = exercise.name;
            setsInput.value = exercise.sets;
            repsInput.value = exercise.reps;
            if (exercise.priority) {
                const selectedBtn = document.querySelector(`.btn-priority[data-priority="${exercise.priority}"]`);
                if (selectedBtn) selectedBtn.classList.add('selected');
                priorityInput.value = exercise.priority;
            }
        } else {
            // Adding new exercise
            modalTitle.textContent = 'Add Exercise';
            editingExerciseIndexInput.value = '';
            dayOfWeekSelector.value = mesocycle.days[currentDayIndex].dayOfWeek || 'Unassigned';
            populateExerciseNameSelector(''); // Clear exercises
        }
        modal.classList.add('active');
    };

    const closeExerciseModal = () => {
        modal.classList.remove('active');
    };
    
    const populateMuscleGroupSelector = () => {
        muscleGroupSelector.innerHTML = '<option value="">-- Select Muscle --</option>';
        Object.keys(exerciseDatabase).forEach(muscle => {
            const option = document.createElement('option');
            option.value = muscle;
            option.textContent = muscle;
            muscleGroupSelector.appendChild(option);
        });
    };

    const populateExerciseNameSelector = (muscle) => {
        exerciseNameSelector.innerHTML = '';
        if (!muscle || !exerciseDatabase[muscle]) {
            exerciseNameSelector.innerHTML = '<option value="">-- Select Muscle First --</option>';
            return;
        }
        exerciseDatabase[muscle].forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise;
            option.textContent = exercise;
            exerciseNameSelector.appendChild(option);
        });
    };

    // --- EVENT LISTENERS ---

    // Mesocycle View Listeners
    addDayBtn.addEventListener('click', () => {
        const newDayNumber = mesocycle.days.length + 1;
        mesocycle.days.push({
            dayName: `Day ${newDayNumber}`,
            dayOfWeek: 'Unassigned',
            exercises: []
        });
        renderMesocycleView();
    });

    dayListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-day-btn')) {
            currentDayIndex = parseInt(e.target.dataset.dayIndex);
            renderDayView();
        }
        if (e.target.classList.contains('delete-day-btn')) {
            const dayIndex = parseInt(e.target.dataset.dayIndex);
            if (confirm(`Are you sure you want to delete ${mesocycle.days[dayIndex].dayName}?`)) {
                mesocycle.days.splice(dayIndex, 1);
                // Re-number remaining days
                mesocycle.days.forEach((day, i) => day.dayName = `Day ${i + 1}`);
                renderMesocycleView();
            }
        }
    });

    // Day View Listeners
    backToMesoBtn.addEventListener('click', () => renderMesocycleView());
    saveDayBtn.addEventListener('click', () => renderMesocycleView());
    addExerciseBtn.addEventListener('click', () => openExerciseModal());

    exerciseListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-exercise-btn')) {
            const exerciseIndex = parseInt(e.target.dataset.exerciseIndex);
            openExerciseModal(exerciseIndex);
        }
        if (e.target.classList.contains('delete-exercise-btn')) {
            const exerciseIndex = parseInt(e.target.dataset.exerciseIndex);
            if(confirm('Are you sure you want to delete this exercise?')) {
                mesocycle.days[currentDayIndex].exercises.splice(exerciseIndex, 1);
                renderDayView();
            }
        }
    });

    // Modal Form Listeners
    muscleGroupSelector.addEventListener('change', () => {
        populateExerciseNameSelector(muscleGroupSelector.value);
    });

    priorityButtons.forEach(button => {
        button.addEventListener('click', () => {
            const priority = button.dataset.priority;
            if (button.classList.contains('selected')) {
                button.classList.remove('selected');
                priorityInput.value = '';
            } else {
                priorityButtons.forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                priorityInput.value = priority;
            }
        });
    });

    exerciseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const exerciseData = {
            name: exerciseNameSelector.value,
            muscleGroup: muscleGroupSelector.value,
            sets: setsInput.value,
            reps: repsInput.value,
            priority: priorityInput.value
        };

        const dayOfWeek = dayOfWeekSelector.value;
        mesocycle.days[currentDayIndex].dayOfWeek = dayOfWeek;

        const exerciseIndex = editingExerciseIndexInput.value;
        if (exerciseIndex !== '') {
            // Update existing exercise
            mesocycle.days[currentDayIndex].exercises[exerciseIndex] = exerciseData;
        } else {
            // Add new exercise
            mesocycle.days[currentDayIndex].exercises.push(exerciseData);
        }
        
        closeExerciseModal();
        renderDayView();
    });

    cancelExerciseBtn.addEventListener('click', closeExerciseModal);


    // --- INITIALIZATION ---
    renderMesocycleView();
});
