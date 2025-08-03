import { generatePlan, applyProgression, checkFatigue } from './trainerLogic.js';

let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: ""
};

let currentPlan = null;

/* ===========================
   Onboarding Functions
=========================== */
function updateProgress() {
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.querySelector('.progress').style.width = percentage + "%";
}

window.nextStep = function() {
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
};

window.validateStep = function(field) {
    if (!userSelections[field]) {
        alert("Please select an option before continuing.");
        return false;
    }
    return true;
};

window.selectCard = function(element, field, value) {
    userSelections[field] = value;
    const group = element.parentElement.querySelectorAll('.goal-card');
    group.forEach(card => card.classList.remove('active'));
    element.classList.add('active');
};

window.finishOnboarding = async function() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));

    currentPlan = generatePlan(userSelections);
    renderDashboard();
};

/* ===========================
   Dashboard Rendering
=========================== */
function renderDashboard() {
    document.querySelector('.container').classList.add('hidden');
    const dashboard = document.getElementById('dashboard');
    dashboard.classList.remove('hidden');

    document.getElementById('userSummary').textContent =
        `${capitalize(currentPlan.goal)} | ${capitalize(currentPlan.experience)} | ${currentPlan.split}`;

    document.getElementById('volumeProgress').style.width =
        `${(currentPlan.currentVolume / currentPlan.maxVolume) * 100}%`;

    document.getElementById('volumeSummary').textContent =
        `${currentPlan.currentVolume} sets / ${currentPlan.maxVolume} max`;

    renderCharts();
    loadWorkoutHistory();
}

/* ===========================
   Charts
=========================== */
function renderCharts() {
    const ctx1 = document.getElementById('volumeChart').getContext('2d');
    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: Array.from({length: currentPlan.week}, (_, i) => `Week ${i + 1}`),
            datasets: [{
                label: 'Volume Progression',
                data: [currentPlan.currentVolume],
                borderColor: '#ff6b35',
                backgroundColor: 'rgba(255, 107, 53, 0.2)',
                fill: true
            }]
        }
    });

    const ctx2 = document.getElementById('loadChart').getContext('2d');
    new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: currentPlan.sessions.map(s => s.name),
            datasets: [{
                label: 'Sets per Session',
                data: currentPlan.sessions.map(s => s.exercises.reduce((sum, ex) => sum + ex.sets, 0)),
                backgroundColor: '#ff914d'
            }]
        }
    });
}

/* ===========================
   Modals (Planner, Log Workout)
=========================== */
window.openModal = function(type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');

    if (type === 'planner') {
        modalBody.innerHTML = buildPlannerUI();
    } else if (type === 'logWorkout') {
        modalBody.innerHTML = `
            <h2>Log Workout</h2>
            <label>Fatigue Score (1–10)</label>
            <input type="number" id="fatigueScore" min="1" max="10" />
            <textarea id="workoutNotes" placeholder="Notes..."></textarea>
            <button onclick="submitWorkout()">Submit</button>
        `;
    } else {
        modalBody.innerHTML = `<h2>Settings Coming Soon...</h2>`;
    }

    modal.classList.remove('hidden');
};

window.closeModal = function() {
    document.getElementById('modal').classList.add('hidden');
};

function buildPlannerUI() {
    return `
        <h2>Customize Your Plan</h2>
        ${currentPlan.sessions.map((session, sIndex) => `
            <div class="planner-form">
                <h3>${session.name}</h3>
                ${session.exercises.map((ex, eIndex) => `
                    <div class="exercise-row">
                        <input type="text" value="${ex.name}" disabled />
                        <input type="number" id="sets-${sIndex}-${eIndex}" value="${ex.sets}" />
                        <input type="number" id="rir-${sIndex}-${eIndex}" value="${ex.rir}" />
                    </div>
                `).join('')}
            </div>
        `).join('')}
        <button onclick="savePlanner()">Save Changes</button>
    `;
}

window.savePlanner = function() {
    currentPlan.sessions.forEach((session, sIndex) => {
        session.exercises.forEach((ex, eIndex) => {
            ex.sets = parseInt(document.getElementById(`sets-${sIndex}-${eIndex}`).value);
            ex.rir = parseInt(document.getElementById(`rir-${sIndex}-${eIndex}`).value);
        });
    });
    closeModal();
    renderDashboard();
};

window.submitWorkout = function() {
    const fatigueScore = parseInt(document.getElementById('fatigueScore').value);
    if (!fatigueScore || fatigueScore < 1 || fatigueScore > 10) return alert("Enter fatigue score 1–10");

    currentPlan = applyProgression(currentPlan);
    currentPlan = checkFatigue(fatigueScore, currentPlan);

    closeModal();
    renderDashboard();
};

/* ===========================
   Helpers
=========================== */
function loadWorkoutHistory() {
    const list = document.getElementById('workoutList');
    list.innerHTML = `<li>No workouts logged yet.</li>`;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ===========================
   On Load
=========================== */
window.onload = () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        const savedSelections = JSON.parse(localStorage.getItem("userSelections"));
        Object.assign(userSelections, savedSelections);
        currentPlan = generatePlan(userSelections);
        renderDashboard();
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
