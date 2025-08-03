let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: ""
};

// Update progress bar
function updateProgress() {
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.querySelector('.progress').style.width = percentage + "%";
}

// Go to next onboarding step
function nextStep() {
    document.getElementById('step' + currentStep).classList.remove('active');
    currentStep++;
    document.getElementById('step' + currentStep).classList.add('active');
    updateProgress();
}

// Validate selection
function validateStep(field) {
    if (!userSelections[field]) {
        alert("Please select an option before continuing.");
        return false;
    }
    return true;
}

// Select a card
function selectCard(element, field, value) {
    userSelections[field] = value;
    const group = element.parentElement.querySelectorAll('.goal-card');
    group.forEach(card => card.classList.remove('active'));
    element.classList.add('active');
}

// Finish onboarding → dashboard
function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));
    showDashboard();
}

// Show dashboard
function showDashboard() {
    document.querySelector('.container').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    const summary = `
        Goal: ${capitalize(userSelections.goal)} |
        Level: ${capitalize(userSelections.experience)} |
        Style: ${capitalize(userSelections.style)} |
        Days: ${userSelections.days}/week
    `;
    document.getElementById('userSummary').textContent = summary;
    document.getElementById('planSummary').innerHTML = `
        <h3>Your Plan (Preview)</h3>
        <p>Start with ${userSelections.days} days/week focusing on ${userSelections.goal}.</p>
    `;
}

// Modal
function openModal(type) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');

    if (type === 'customize') {
        body.innerHTML = `
            <h2>Customize Your Plan</h2>
            <div class="planner-form">
                <p>Add or edit exercises:</p>
                <div id="exercise-list">
                    <div class="exercise-row">
                        <input type="text" placeholder="Exercise Name">
                        <input type="number" placeholder="Sets">
                        <input type="number" placeholder="Reps">
                    </div>
                </div>
                <button onclick="addExerciseRow()">+ Add Exercise</button>
                <button onclick="saveCustomization()">Save</button>
            </div>
        `;
    } else if (type === 'log') {
        body.innerHTML = `
            <h2>Log Workout</h2>
            <textarea placeholder="Workout notes..." style="width:100%;height:100px;"></textarea>
            <button onclick="closeModal()">Save Log</button>
        `;
    }

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// Add new exercise row
function addExerciseRow() {
    const list = document.getElementById('exercise-list');
    const row = document.createElement('div');
    row.className = 'exercise-row';
    row.innerHTML = `
        <input type="text" placeholder="Exercise Name">
        <input type="number" placeholder="Sets">
        <input type="number" placeholder="Reps">
    `;
    list.appendChild(row);
}

function saveCustomization() {
    alert("Customization saved (future logic will handle DB updates).");
    closeModal();
}

// Capitalize helper
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// On load
window.onload = () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        const saved = JSON.parse(localStorage.getItem("userSelections"));
        Object.assign(userSelections, saved);
        showDashboard();
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
