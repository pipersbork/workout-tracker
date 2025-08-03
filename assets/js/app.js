let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: "",
    frequency: 2 // Default, or calculate based on days
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

    const group = element.parentElement.querySelectorAll('.goal-card');
    group.forEach(card => card.classList.remove('active'));

    element.classList.add('active');
}

/* Complete onboarding and generate plan */
async function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));

    // Generate initial plan using progression engine
    const plan = await generatePlan(userSelections);
    await savePlanToDB(plan);

    renderDashboard(plan);
}

/* Render dashboard with plan details */
async function renderDashboard(plan = null) {
    if (!plan) {
        plan = await getPlanFromDB();
    }
    if (!plan) {
        console.error("No plan found.");
        return;
    }

    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="dashboard">
            <h1>🏋️ Your Training Plan</h1>
            <p><strong>Goal:</strong> ${capitalize(plan.goal)} | <strong>Level:</strong> ${capitalize(plan.experience)}</p>
            <p><strong>Week:</strong> ${plan.week} | <strong>Target RIR:</strong> ${plan.rirTarget}</p>

            <div class="progress-bar">
                <div class="progress" style="width:${(plan.currentVolume / plan.maxVolume) * 100}%"></div>
            </div>
            <p>${plan.currentVolume} sets / ${plan.maxVolume} max</p>

            <div class="sessions">
                ${plan.sessions.map(session => `
                    <div class="session-card">
                        <h2>${session.name}</h2>
                        ${session.exercises.map(ex => `
                            <div class="exercise">
                                <p><strong>${ex.name}</strong></p>
                                <p>${ex.sets} sets × ${ex.reps[0]}–${ex.reps[1]} reps</p>
                                <p>RIR: ${ex.rir}</p>
                                ${ex.load ? `<p>Load: ${ex.load}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>

            <div class="dashboard-actions">
                <button class="cta-button" onclick="logWorkout()">Log Workout</button>
                <button class="cta-button" onclick="manualAdjust()">Custom Adjust</button>
            </div>
        </div>
    `;
}

/* Helper: Capitalize text */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* On page load */
window.onload = async () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        const savedSelections = JSON.parse(localStorage.getItem("userSelections"));
        Object.assign(userSelections, savedSelections);
        renderDashboard();
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
