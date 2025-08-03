/* ===========================
   GLOBAL VARIABLES
=========================== */
let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: ""
};

let plan = null; // Will hold the generated plan after onboarding

/* ===========================
   ONBOARDING LOGIC
=========================== */
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

    plan = generatePlan(userSelections);
    renderDashboard(plan);
}

/* ===========================
   DASHBOARD RENDER
=========================== */
function renderDashboard(plan) {
    document.querySelector('.container').style.display = "none";
    const dashboard = document.getElementById('dashboard');
    dashboard.style.display = "block";

    document.getElementById('userSummary').innerText = `
        Goal: ${capitalize(plan.goal)} | Level: ${capitalize(plan.experience)} | Days: ${plan.days}
    `;

    document.getElementById('volumeSummary').innerText = `
        ${plan.currentVolume} sets / ${plan.maxVolume} max
    `;

    document.getElementById('volumeProgress').style.width =
        `${(plan.currentVolume / plan.maxVolume) * 100}%`;

    // Render charts
    renderCharts(plan);

    // Load workout history
    loadWorkouts();
}

/* ===========================
   CHARTS
=========================== */
function renderCharts(plan) {
    const ctxVolume = document.getElementById('volumeChart').getContext('2d');
    new Chart(ctxVolume, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Training Volume (sets)',
                data: [plan.currentVolume, plan.currentVolume + 5, plan.currentVolume + 10, plan.maxVolume],
                borderColor: '#ff6b35',
                fill: false,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });

    const ctxLoad = document.getElementById('loadChart').getContext('2d');
    new Chart(ctxLoad, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Average Load (lbs)',
                data: [100, 110, 120, 130],
                backgroundColor: '#ff914d'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
}

/* ===========================
   MODAL HANDLING
=========================== */
function openModal(type) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');
    modal.classList.remove('hidden');

    if (type === 'logWorkout') {
        body.innerHTML = `
            <h2>Log Workout</h2>
            <textarea id="workoutNotes" placeholder="Workout details..."></textarea>
            <label for="fatigueScore">Fatigue Score (1–10):</label>
            <input type="number" id="fatigueScore" min="1" max="10">
            <button class="cta-button" onclick="submitWorkout()">Submit</button>
        `;
    } else if (type === 'planner') {
        body.innerHTML = `
            <h2>Customize Plan</h2>
            <div class="planner-form">
                ${plan.sessions.map((session, i) => `
                    <h3>${session.name}</h3>
                    ${session.exercises.map((ex, j) => `
                        <div class="exercise-row">
                            <input type="text" value="${ex.name}" readonly>
                            <input type="number" id="sets-${i}-${j}" value="${ex.sets}">
                            <input type="number" id="reps-${i}-${j}" value="${ex.reps}">
                        </div>
                    `).join('')}
                `).join('')}
                <button onclick="saveManualAdjust()">Save Changes</button>
            </div>
        `;
    } else {
        body.innerHTML = `<h2>Settings</h2><p>Coming soon...</p>`;
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

/* ===========================
   WORKOUT LOGGING
=========================== */
async function submitWorkout() {
    const fatigueScore = parseInt(document.getElementById('fatigueScore').value);
    const notes = document.getElementById('workoutNotes').value;

    if (!fatigueScore || fatigueScore < 1 || fatigueScore > 10) {
        alert("Please enter a valid fatigue score (1–10).");
        return;
    }

    const workout = { date: new Date().toISOString(), fatigue: fatigueScore, notes };
    saveWorkoutToDB(workout);
    closeModal();
    loadWorkouts();
}

async function loadWorkouts() {
    const workouts = await getAllWorkoutsFromDB();
    const list = document.getElementById('workoutList');
    list.innerHTML = "";
    workouts.forEach(w => {
        const li = document.createElement('li');
        li.textContent = `${w.notes || "Workout"} - Fatigue: ${w.fatigue} (on ${new Date(w.date).toLocaleDateString()})`;
        list.appendChild(li);
    });
}

/* ===========================
   MANUAL ADJUSTMENT
=========================== */
async function saveManualAdjust() {
    plan.sessions.forEach((session, i) => {
        session.exercises.forEach((ex, j) => {
            ex.sets = parseInt(document.getElementById(`sets-${i}-${j}`).value);
            ex.reps = parseInt(document.getElementById(`reps-${i}-${j}`).value);
        });
    });
    closeModal();
}

/* ===========================
   PLAN GENERATION (Trainer Logic Placeholder)
=========================== */
function generatePlan({ goal, experience, style, days }) {
    // Simple logic for now; later we'll integrate trainer-based progression
    const baseVolume = experience === 'beginner' ? 8 : experience === 'experienced' ? 12 : 16;
    return {
        goal,
        experience,
        style,
        days,
        week: 1,
        rirTarget: 3,
        currentVolume: baseVolume,
        maxVolume: baseVolume * 2,
        sessions: [
            {
                name: "Day 1 - Upper Body",
                exercises: [
                    { name: "Bench Press", sets: 3, reps: 10, rir: 3 },
                    { name: "Row", sets: 3, reps: 12, rir: 3 }
                ]
            },
            {
                name: "Day 2 - Lower Body",
                exercises: [
                    { name: "Squat", sets: 3, reps: 10, rir: 3 },
                    { name: "Leg Curl", sets: 3, reps: 12, rir: 3 }
                ]
            }
        ]
    };
}

/* ===========================
   UTILITY
=========================== */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ===========================
   PAGE LOAD
=========================== */
window.onload = async () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        Object.assign(userSelections, JSON.parse(localStorage.getItem("userSelections")));
        plan = generatePlan(userSelections);
        renderDashboard(plan);
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
