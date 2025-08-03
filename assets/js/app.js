let currentStep = 1;
const totalSteps = 6;
const userSelections = { goal: "", experience: "", style: "", days: "" };

/* -------------------
    ONBOARDING FLOW
------------------- */
function updateProgress() {
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.querySelector('.progress').style.width = percentage + "%";
}

function nextStep() {
    const current = document.getElementById('step' + currentStep);
    current.classList.remove('active');
    setTimeout(() => {
        currentStep++;
        const next = document.getElementById('step' + currentStep);
        if (next) {
            next.classList.add('active');
            updateProgress();
        }
    }, 200);
}

function validateStep(field) {
    if (!userSelections[field]) {
        alert("Please select an option before continuing.");
        return false;
    }
    return true;
}

function selectCard(element, field, value) {
    userSelections[field] = value;
    const group = element.parentElement.querySelectorAll('.goal-card');
    group.forEach(card => card.classList.remove('active'));
    element.classList.add('active');
}

async function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));
    showDashboard();
}

/* -------------------
    DASHBOARD
------------------- */
async function showDashboard() {
    document.querySelector('.container').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');

    const summary = document.getElementById('userSummary');
    summary.textContent = `Goal: ${capitalize(userSelections.goal)} | Level: ${capitalize(userSelections.experience)} | Days: ${userSelections.days}`;

    updateVolumeProgress(0, 100); // placeholder
    loadWorkouts();
}

function updateVolumeProgress(current, max) {
    document.getElementById('volumeProgress').style.width = `${(current / max) * 100}%`;
    document.getElementById('volumeSummary').textContent = `${current} / ${max} sets`;
}

/* -------------------
    MODAL LOGIC
------------------- */
function openModal(type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    modal.classList.remove('hidden');

    if (type === 'planner') {
        modalBody.innerHTML = `
            <div class="planner-form">
                <h2>Create Your Workout Template</h2>
                <p>Customize your session below:</p>
                <label for="templateName">Template Name:</label>
                <input type="text" id="templateName" placeholder="e.g., Push Day" />
                <div id="exerciseList">
                    <div class="exercise-row">
                        <input type="text" placeholder="Exercise Name" class="exercise-name" />
                        <input type="number" placeholder="Sets" class="exercise-sets" />
                        <input type="text" placeholder="Reps (e.g., 8-10)" class="exercise-reps" />
                    </div>
                </div>
                <button type="button" onclick="addExerciseRow()">+ Add Exercise</button>
                <button type="button" class="save-btn" onclick="saveTemplate()">Save Template</button>
            </div>
        `;
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function addExerciseRow() {
    const container = document.getElementById('exerciseList');
    const div = document.createElement('div');
    div.classList.add('exercise-row');
    div.innerHTML = `
        <input type="text" placeholder="Exercise Name" class="exercise-name" />
        <input type="number" placeholder="Sets" class="exercise-sets" />
        <input type="text" placeholder="Reps (e.g., 8-10)" class="exercise-reps" />
    `;
    container.appendChild(div);
}

function saveTemplate() {
    const templateName = document.getElementById('templateName').value.trim();
    if (!templateName) {
        alert("Please enter a template name.");
        return;
    }

    const exercises = [];
    document.querySelectorAll('.exercise-row').forEach(row => {
        const name = row.querySelector('.exercise-name').value.trim();
        const sets = row.querySelector('.exercise-sets').value.trim();
        const reps = row.querySelector('.exercise-reps').value.trim();
        if (name && sets && reps) {
            exercises.push({ name, sets: parseInt(sets), reps });
        }
    });

    if (exercises.length === 0) {
        alert("Add at least one exercise.");
        return;
    }

    const template = { name: templateName, exercises };
    console.log("Saved Template:", template);
    saveTemplateToDB(template);
    alert(`Template "${templateName}" saved!`);

    closeModal();
}

/* -------------------
    WORKOUT LOGGING
------------------- */
async function loadWorkouts() {
    const workouts = await getAllWorkoutsFromDB();
    const list = document.getElementById('workoutList');
    list.innerHTML = "";
    workouts.forEach(w => {
        const li = document.createElement('li');
        li.textContent = `${w.details} (${new Date(w.date).toLocaleDateString()})`;
        list.appendChild(li);
    });
}

/* Utility */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* On Load */
window.onload = () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        const savedSelections = JSON.parse(localStorage.getItem("userSelections"));
        Object.assign(userSelections, savedSelections);
        showDashboard();
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
