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

let plan = null; // Will hold generated workout plan

/* ===========================
   ONBOARDING
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

function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));

    plan = generatePlan(userSelections);
    renderDashboard(plan);
}

/* ===========================
   DASHBOARD
=========================== */
function renderDashboard(plan) {
    document.getElementById('onboarding').style.display = "none";
    const dashboard = document.getElementById('dashboard');
    dashboard.classList.remove('hidden');

    document.getElementById('userSummary').innerText =
        `Goal: ${capitalize(plan.goal)} | Level: ${capitalize(plan.experience)} | Days: ${plan.days}`;

    document.getElementById('volumeSummary').innerText =
        `${plan.currentVolume} sets / ${plan.maxVolume} max`;

    document.getElementById('volumeProgress').style.width =
        `${(plan.currentVolume / plan.maxVolume) * 100}%`;

    renderCharts(plan);
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
                data: [plan.currentVolume, plan.currentVolume + 5, plan.currentVolume + 8, plan.maxVolume],
                borderColor: '#ff6b35',
                fill: false,
                tension: 0.3
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    const ctxLoad = document.getElementById('loadChart').getContext('2d');
    new Chart(ctxLoad, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Avg Load (lbs)',
                data: [100, 110, 120, 130],
                backgroundColor: '#ff914d'
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

/* ===========================
   MODALS
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
                            <input type="text" id="reps-${i}-${j}" value="${ex.reps}">
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
   LOG WORKOUT
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
   SAVE MANUAL CHANGES
=========================== */
async function saveManualAdjust() {
    plan.sessions.forEach((session, i) => {
        session.exercises.forEach((ex, j) => {
            ex.sets = parseInt(document.getElementById(`sets-${i}-${j}`).value);
            ex.reps = document.getElementById(`reps-${i}-${j}`).value;
        });
    });
    closeModal();
}

/* ===========================
   PLAN GENERATION (Trainer Logic)
=========================== */
function generatePlan({ goal, experience, style, days }) {
    const baseSets = experience === 'beginner' ? 8 :
                     experience === 'experienced' ? 12 : 16;
    const maxSets = baseSets + 6;

    const repRange = goal === 'muscle' ? [6, 12] : goal === 'combined' ? [8, 15] : [12, 20];
    const rir = experience === 'beginner' ? 3 : experience === 'experienced' ? 2 : 1;

    let sessions = [];
    if (days <= 3) {
        sessions = [
            { name: "Full Body A", exercises: getExercises(["Chest","Back","Legs"], 5, repRange, rir) },
            { name: "Full Body B", exercises: getExercises(["Shoulders","Arms","Glutes"], 5, repRange, rir) },
            { name: "Full Body C", exercises: getExercises(["Chest","Back","Legs"], 5, repRange, rir) }
        ];
    } else if (days === 4) {
        sessions = [
            { name: "Upper A", exercises: getExercises(["Chest","Back","Shoulders"], 5, repRange, rir) },
            { name: "Lower A", exercises: getExercises(["Quads","Hamstrings","Glutes"], 5, repRange, rir) },
            { name: "Upper B", exercises: getExercises(["Chest","Back","Arms"], 5, repRange, rir) },
            { name: "Lower B", exercises: getExercises(["Quads","Hamstrings","Glutes"], 5, repRange, rir) }
        ];
    } else {
        sessions = [
            { name: "Push", exercises: getExercises(["Chest","Shoulders","Triceps"], 6, repRange, rir) },
            { name: "Pull", exercises: getExercises(["Back","Biceps"], 6, repRange, rir) },
            { name: "Legs", exercises: getExercises(["Quads","Hamstrings","Glutes"], 6, repRange, rir) },
            { name: "Push 2", exercises: getExercises(["Chest","Shoulders","Triceps"], 6, repRange, rir) },
            { name: "Pull 2", exercises: getExercises(["Back","Biceps"], 6, repRange, rir) },
            { name: "Legs 2", exercises: getExercises(["Quads","Hamstrings","Glutes"], 6, repRange, rir) }
        ];
    }

    return {
        goal,
        experience,
        style,
        days,
        week: 1,
        rirTarget: rir,
        currentVolume: baseSets,
        maxVolume: maxSets,
        sessions
    };
}

function getExercises(muscleGroups, count, repRange, rir) {
    const allExercises = [
        { name: "Barbell Bench Press", muscle: "Chest" },
        { name: "Incline Dumbbell Press", muscle: "Chest" },
        { name: "Pull-Up", muscle: "Back" },
        { name: "Barbell Row", muscle: "Back" },
        { name: "Shoulder Press", muscle: "Shoulders" },
        { name: "Lateral Raise", muscle: "Shoulders" },
        { name: "Barbell Curl", muscle: "Biceps" },
        { name: "Triceps Pushdown", muscle: "Triceps" },
        { name: "Back Squat", muscle: "Quads" },
        { name: "Romanian Deadlift", muscle: "Hamstrings" },
        { name: "Hip Thrust", muscle: "Glutes" }
    ];

    const filtered = allExercises.filter(ex => muscleGroups.includes(ex.muscle));
    const chosen = [];
    for (let i = 0; i < count && filtered.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * filtered.length);
        chosen.push({
            name: filtered[randomIndex].name,
            sets: 3,
            reps: `${repRange[0]}-${repRange[1]}`,
            rir
        });
        filtered.splice(randomIndex, 1);
    }
    return chosen;
}

/* ===========================
   UTIL
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