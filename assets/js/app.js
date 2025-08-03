let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: ""
};

/* Update progress bar */
function updateProgress() {
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.querySelector('.progress').style.width = percentage + "%";
}

/* Go to next step */
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

/* Validate selection for a specific field */
function validateStep(field) {
    if (!userSelections[field]) {
        alert("Please select an option before continuing.");
        return false;
    }
    return true;
}

/* Select a card option */
function selectCard(element, field, value) {
    userSelections[field] = value;

    // Remove active class from other cards in the group
    const group = element.parentElement.querySelectorAll('.goal-card');
    group.forEach(card => card.classList.remove('active'));

    // Highlight selected card
    element.classList.add('active');
}

/* Complete onboarding */
function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));
    renderDashboard();
}

/* Render dashboard after onboarding */
function renderDashboard() {
    document.body.innerHTML = `
        <div class="dashboard">
            <h1>Welcome to Progression</h1>
            <p>Your goal: ${userSelections.goal}</p>
            <p>Experience: ${userSelections.experience}</p>
            <p>Style: ${userSelections.style}</p>
            <p>Days/week: ${userSelections.days}</p>
            <div class="workout-form">
                <h2>Add Workout</h2>
                <textarea id="workoutDetails" placeholder="Describe your workout..."></textarea>
                <button class="cta-button" onclick="saveWorkout()">Save Workout</button>
            </div>
            <div class="workout-history">
                <h2>Workout History</h2>
                <ul id="workoutList"></ul>
            </div>
        </div>
    `;

    loadWorkouts();
}

/* Save workout to IndexedDB */
async function saveWorkout() {
    const details = document.getElementById('workoutDetails').value.trim();
    if (!details) return alert("Please enter workout details");

    await saveWorkoutToDB({ details, date: new Date().toISOString() });
    document.getElementById('workoutDetails').value = "";
    loadWorkouts();
}

/* Load workouts from IndexedDB */
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

/* On page load */
window.onload = () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        const savedSelections = JSON.parse(localStorage.getItem("userSelections"));
        Object.assign(userSelections, savedSelections);
        renderDashboard();
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
