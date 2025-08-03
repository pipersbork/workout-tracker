/* ===== Global State ===== */
let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: "",
    frequency: 2 // default, adjust based on onboarding
};

let trainingPlan = null; // Holds current plan

/* ===== Progress Bar Update ===== */
function updateProgress() {
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.querySelector('.progress').style.width = percentage + "%";
}

/* ===== Navigation Logic ===== */
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

/* ===== Finish Onboarding ===== */
async function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));

    // Generate training plan based on selections
    trainingPlan = generatePlan(userSelections);
    localStorage.setItem("trainingPlan", JSON.stringify(trainingPlan));

    renderDashboard(trainingPlan);
}

/* ===== Render Dashboard ===== */
function renderDashboard(plan = null) {
    if (!plan) {
        const savedPlan = localStorage.getItem("trainingPlan");
        if (savedPlan) {
            plan = JSON.parse(savedPlan);
        }
    }
    if (!plan) {
        console.error("No plan found.");
        return;
    }

    document.querySelector('.container').style.display = 'none';
    document.getElementById('dashboard').classList.remove('hidden');

    // Update summary
    document.getElementById('userSummary').innerHTML = `
        Goal: ${capitalize(plan.goal)} | Level: ${capitalize(plan.experience)} | Days: ${plan.days}
    `;

    // Update progress bar
    const progressPercent = (plan.currentVolume / plan.maxVolume) * 100;
    document.getElementById('volumeProgress').style.width = `${progressPercent}%`;
    document.getElementById('volumeSummary').textContent =
        `${plan.currentVolume} sets / ${plan.maxVolume} max`;

    // Render charts
    renderCharts(plan);

    // Load workout history
    loadWorkoutHistory();
}

/* ===== Generate Training Plan ===== */
function generatePlan(selections) {
    const baseVolume = selections.goal === "muscle" ? 10 : 6;
    const maxVolume = selections.goal === "muscle" ? 20 : 12;

    return {
        goal: selections.goal,
        experience: selections.experience,
        style: selections.style,
        days: selections.days,
        week: 1,
        currentVolume: baseVolume,
        maxVolume,
        rirTarget: selections.experience === "beginner" ? 3 : 2,
        sessions: generateSessions(selections)
    };
}

function generateSessions(selections) {
    const exercises = selections.goal === "muscle"
        ? ["Squat", "Bench Press", "Row", "Shoulder Press"]
        : ["Run", "Burpee", "Push-up", "Sit-up"];
    return Array.from({ length: selections.days }, (_, i) => ({
        name: `Session ${i + 1}`,
        exercises: exercises.map(ex => ({
            name: ex,
            sets: 3,
            reps: [8, 12],
            rir: selections.experience === "beginner" ? 3 : 2
        }))
    }));
}

/* ===== Charts ===== */
let volumeChartInstance = null;
let loadChartInstance = null;

function renderCharts(plan) {
    const ctxVolume = document.getElementById('volumeChart').getContext('2d');
    const ctxLoad = document.getElementById('loadChart').getContext('2d');

    const volumeData = {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        datasets: [{
            label: "Training Volume (Sets)",
            data: [plan.currentVolume, plan.currentVolume + 2, plan.currentVolume + 4, plan.maxVolume],
            backgroundColor: "rgba(255,107,53,0.7)"
        }]
    };

    const loadData = {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        datasets: [{
            label: "Estimated Load Progression",
            data: [100, 105, 110, 115],
            backgroundColor: "rgba(255,145,77,0.7)"
        }]
    };

    if (volumeChartInstance) volumeChartInstance.destroy();
    if (loadChartInstance) loadChartInstance.destroy();

    volumeChartInstance = new Chart(ctxVolume, {
        type: 'bar',
        data: volumeData,
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    loadChartInstance = new Chart(ctxLoad, {
        type: 'line',
        data: loadData,
        options: { responsive: true }
    });
}

/* ===== Workout History ===== */
function loadWorkoutHistory() {
    const history = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
    const list = document.getElementById('workoutList');
    list.innerHTML = "";
    history.forEach(w => {
        const li = document.createElement('li');
        li.textContent = `${w.date} - Fatigue: ${w.fatigue}`;
        list.appendChild(li);
    });
}

function saveWorkoutToHistory(entry) {
    const history = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
    history.push(entry);
    localStorage.setItem("workoutHistory", JSON.stringify(history));
    loadWorkoutHistory();
}

/* ===== Modal Logic ===== */
function openModal(type) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');

    if (type === "logWorkout") {
        body.innerHTML = `
            <h2>Log Workout</h2>
            <label>Fatigue Score (1-10)</label>
            <input type="number" id="fatigueScore" min="1" max="10">
            <textarea id="workoutNotes" placeholder="Notes"></textarea>
            <button class="cta-button" onclick="submitWorkout()">Save</button>
        `;
    } else if (type === "planner") {
        body.innerHTML = `
            <h2>Adjust Your Plan</h2>
            <p>Edit sets/RIR for exercises</p>
            ${trainingPlan.sessions.map((session, sIndex) => `
                <div>
                    <h3>${session.name}</h3>
                    ${session.exercises.map((ex, eIndex) => `
                        <div>
                            <p>${ex.name}</p>
                            <input type="number" id="sets-${sIndex}-${eIndex}" value="${ex.sets}"> Sets
                            <input type="number" id="rir-${sIndex}-${eIndex}" value="${ex.rir}"> RIR
                        </div>
                    `).join('')}
                </div>
            `).join('')}
            <button class="cta-button" onclick="saveManualAdjust()">Save Changes</button>
        `;
    } else if (type === "settings") {
        body.innerHTML = `
            <h2>Settings</h2>
            <p>Additional options coming soon...</p>
        `;
    }

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

/* ===== Save Workout (Log Modal) ===== */
function submitWorkout() {
    const fatigue = parseInt(document.getElementById('fatigueScore').value);
    if (!fatigue || fatigue < 1 || fatigue > 10) {
        alert("Enter a valid fatigue score (1-10)");
        return;
    }
    const notes = document.getElementById('workoutNotes').value;

    saveWorkoutToHistory({
        date: new Date().toLocaleDateString(),
        fatigue,
        notes
    });

    closeModal();
}

/* ===== Save Manual Adjust ===== */
function saveManualAdjust() {
    trainingPlan.sessions.forEach((session, sIndex) => {
        session.exercises.forEach((ex, eIndex) => {
            ex.sets = parseInt(document.getElementById(`sets-${sIndex}-${eIndex}`).value);
            ex.rir = parseInt(document.getElementById(`rir-${sIndex}-${eIndex}`).value);
        });
    });

    localStorage.setItem("trainingPlan", JSON.stringify(trainingPlan));
    renderDashboard(trainingPlan);
    closeModal();
}

/* ===== Helpers ===== */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ===== Page Load ===== */
window.onload = () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        Object.assign(userSelections, JSON.parse(localStorage.getItem("userSelections")));
        trainingPlan = JSON.parse(localStorage.getItem("trainingPlan")) || generatePlan(userSelections);
        renderDashboard(trainingPlan);
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
