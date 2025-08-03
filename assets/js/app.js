/* ----------------------------
   Global State
----------------------------- */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzxomn7b3HhL_Fjm2gXFxvRvo0cz4CI4ym2ETb2oL37kp1qgxJYzo0hbSmsEv4SYw9Cog/exec";
let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: "",
    frequency: 2
};

/* ----------------------------
   Onboarding Functions
----------------------------- */
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

    const plan = await generatePlan(userSelections);
    await savePlanToDB(plan);
    renderDashboard(plan);
}

/* ----------------------------
   Dashboard Rendering
----------------------------- */
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

            <!-- Charts -->
            <canvas id="volumeChart"></canvas>
            <canvas id="loadChart"></canvas>

            <!-- Sessions -->
            <div class="sessions">
                ${plan.sessions.map(session => `
                    <div class="session-card">
                        <h2>${session.name}</h2>
                        ${session.exercises.map(ex => `
                            <div class="exercise">
                                <p><strong>${ex.name}</strong></p>
                                <p>${ex.sets} sets × ${ex.reps[0]}–${ex.reps[1]} reps</p>
                                <p>RIR: ${ex.rir}</p>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>

            <!-- Action Buttons -->
            <div class="dashboard-actions">
                <button class="cta-button" onclick="openModal('logWorkout')">Log Workout</button>
                <button class="cta-button" onclick="openModal('manualAdjust')">Custom Adjust</button>
            </div>

            <!-- Workout History -->
            <div class="workout-history">
                <h3>Recent Workouts</h3>
                <ul id="workoutList"></ul>
            </div>
        </div>
    `;

    loadWorkouts();
    renderCharts(plan);
}

/* ----------------------------
   Modals
----------------------------- */
function openModal(type) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');

    if (type === 'logWorkout') {
        body.innerHTML = `
            <h2>Log Your Workout</h2>
            <label for="fatigueScore">Fatigue (1–10):</label>
            <input type="number" id="fatigueScore" min="1" max="10">
            <textarea id="workoutNotes" placeholder="Optional notes"></textarea>
            <button class="cta-button" onclick="submitWorkout()">Submit</button>
        `;
    } else if (type === 'manualAdjust') {
        buildManualAdjustUI(body);
    }

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

async function submitWorkout() {
    const fatigueScore = parseInt(document.getElementById('fatigueScore').value);
    const notes = document.getElementById('workoutNotes').value;

    if (!fatigueScore || fatigueScore < 1 || fatigueScore > 10) {
        alert("Enter a valid fatigue score (1–10).");
        return;
    }

    let plan = await getPlanFromDB();
    plan = applyProgression(plan);
    plan = checkFatigue(fatigueScore, plan);

    await savePlanToDB(plan);
    await saveWorkoutToDB({ date: new Date().toISOString(), fatigue: fatigueScore, notes });

    closeModal();
    renderDashboard(plan);
}

/* ----------------------------
   Manual Adjust UI
----------------------------- */
async function buildManualAdjustUI(container) {
    const plan = await getPlanFromDB();
    container.innerHTML = `
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
    `;
}

async function saveManualAdjust() {
    const plan = await getPlanFromDB();
    plan.sessions.forEach((session, sIndex) => {
        session.exercises.forEach((ex, eIndex) => {
            ex.sets = parseInt(document.getElementById(`sets-${sIndex}-${eIndex}`).value);
            ex.rir = parseInt(document.getElementById(`rir-${sIndex}-${eIndex}`).value);
        });
    });

    await savePlanToDB(plan);
    closeModal();
    renderDashboard(plan);
}

/* ----------------------------
   Workout History
----------------------------- */
async function loadWorkouts() {
    const workouts = await getAllWorkoutsFromDB();
    const list = document.getElementById('workoutList');
    if (!list) return;
    list.innerHTML = "";
    workouts.slice(-5).forEach(w => {
        const li = document.createElement('li');
        li.textContent = `${new Date(w.date).toLocaleDateString()} | Fatigue: ${w.fatigue}`;
        list.appendChild(li);
    });
}

/* ----------------------------
   Charts
----------------------------- */
function renderCharts(plan) {
    const ctxVolume = document.getElementById('volumeChart');
    const ctxLoad = document.getElementById('loadChart');

    new Chart(ctxVolume, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3'],
            datasets: [{
                label: 'Volume (sets)',
                data: [plan.currentVolume, plan.currentVolume + 10, plan.currentVolume + 20],
                borderColor: '#ff6b35',
                backgroundColor: 'rgba(255,107,53,0.2)',
                fill: true
            }]
        }
    });

    new Chart(ctxLoad, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3'],
            datasets: [{
                label: 'Load (kg)',
                data: [100, 105, 110],
                borderColor: '#ff914d',
                backgroundColor: 'rgba(255,145,77,0.2)',
                fill: true
            }]
        }
    });
}

/* ----------------------------
   Helpers
----------------------------- */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ----------------------------
   On Load
----------------------------- */
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
