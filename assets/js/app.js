let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: "",
    frequency: 2 // Default
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

/* Validate selection */
function validateStep(field) {
    if (!userSelections[field]) {
        alert("Please select an option before continuing.");
        return false;
    }
    return true;
}

/* Select option card */
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

    const plan = await generatePlan(userSelections);
    await savePlanToDB(plan);
    renderDashboard(plan);
}

/* Render dashboard */
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

/* Log workout UI */
function logWorkout() {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="log-workout">
            <h2>Log Your Workout</h2>
            <textarea id="workoutNotes" placeholder="Optional notes"></textarea>
            <label for="fatigueScore">Fatigue Score (1–10):</label>
            <input type="number" id="fatigueScore" min="1" max="10">
            <button class="cta-button" onclick="submitWorkout()">Submit</button>
            <button class="cta-button" onclick="renderDashboard()">Cancel</button>
        </div>
    `;
}

/* Submit workout */
async function submitWorkout() {
    const fatigueScore = parseInt(document.getElementById('fatigueScore').value);
    if (!fatigueScore || fatigueScore < 1 || fatigueScore > 10) {
        alert("Please enter a valid fatigue score (1–10).");
        return;
    }

    const notes = document.getElementById('workoutNotes').value;
    let currentPlan = await getPlanFromDB();

    currentPlan = applyProgression(currentPlan, []);
    currentPlan = checkFatigue(fatigueScore, currentPlan);

    await savePlanToDB(currentPlan);
    await saveWorkoutToDB({ date: new Date().toISOString(), fatigue: fatigueScore, notes });

    renderDashboard(currentPlan);
}

/* Manual adjustments */
async function manualAdjust() {
    const plan = await getPlanFromDB();

    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="manual-adjust">
            <h2>Custom Adjustments</h2>
            ${plan.sessions.map((session, sIndex) => `
                <div class="session-edit">
                    <h3>${session.name}</h3>
                    ${session.exercises.map((ex, eIndex) => `
                        <div>
                            <p>${ex.name}</p>
                            <label>Sets:</label>
                            <input type="number" id="sets-${sIndex}-${eIndex}" value="${ex.sets}">
                            <label>RIR:</label>
                            <input type="number" id="rir-${sIndex}-${eIndex}" value="${ex.rir}">
                        </div>
                    `).join('')}
                </div>
            `).join('')}
            <button class="cta-button" onclick="saveManualAdjust()">Save Changes</button>
            <button class="cta-button" onclick="renderDashboard()">Cancel</button>
        </div>
    `;
}

/* Save adjustments */
async function saveManualAdjust() {
    const plan = await getPlanFromDB();

    plan.sessions.forEach((session, sIndex) => {
        session.exercises.forEach((ex, eIndex) => {
            ex.sets = parseInt(document.getElementById(`sets-${sIndex}-${eIndex}`).value);
            ex.rir = parseInt(document.getElementById(`rir-${sIndex}-${eIndex}`).value);
        });
    });

    await savePlanToDB(plan);
    renderDashboard(plan);
}

/* Helper */
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
