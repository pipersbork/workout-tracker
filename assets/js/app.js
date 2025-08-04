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

let plan = null;

/* ===========================
   EXERCISE LIBRARY (150+)
=========================== */
const exerciseLibrary = [
    // Chest
    { name: "Barbell Bench Press", group: "chest", equipment: "barbell" },
    { name: "Incline Dumbbell Press", group: "chest", equipment: "dumbbell" },
    { name: "Push-Ups", group: "chest", equipment: "bodyweight" },
    { name: "Cable Fly", group: "chest", equipment: "cable" },
    { name: "Machine Chest Press", group: "chest", equipment: "machine" },
    // Back
    { name: "Pull-Ups", group: "back", equipment: "bodyweight" },
    { name: "Barbell Row", group: "back", equipment: "barbell" },
    { name: "Seated Cable Row", group: "back", equipment: "cable" },
    { name: "Lat Pulldown", group: "back", equipment: "cable" },
    { name: "Face Pull", group: "back", equipment: "cable" },
    // Shoulders
    { name: "Overhead Press", group: "shoulders", equipment: "barbell" },
    { name: "Dumbbell Lateral Raise", group: "shoulders", equipment: "dumbbell" },
    { name: "Arnold Press", group: "shoulders", equipment: "dumbbell" },
    { name: "Machine Shoulder Press", group: "shoulders", equipment: "machine" },
    // Arms
    { name: "Barbell Curl", group: "biceps", equipment: "barbell" },
    { name: "Dumbbell Curl", group: "biceps", equipment: "dumbbell" },
    { name: "Cable Pushdown", group: "triceps", equipment: "cable" },
    { name: "Overhead Dumbbell Extension", group: "triceps", equipment: "dumbbell" },
    // Legs
    { name: "Back Squat", group: "legs", equipment: "barbell" },
    { name: "Front Squat", group: "legs", equipment: "barbell" },
    { name: "Leg Press", group: "legs", equipment: "machine" },
    { name: "Bulgarian Split Squat", group: "legs", equipment: "dumbbell" },
    { name: "Romanian Deadlift", group: "legs", equipment: "barbell" },
    { name: "Leg Curl", group: "legs", equipment: "machine" },
    { name: "Calf Raise", group: "calves", equipment: "machine" },
    // Glutes
    { name: "Hip Thrust", group: "glutes", equipment: "barbell" },
    { name: "Cable Kickback", group: "glutes", equipment: "cable" },
    { name: "Glute Bridge", group: "glutes", equipment: "bodyweight" },
    // Core
    { name: "Plank", group: "core", equipment: "bodyweight" },
    { name: "Hanging Leg Raise", group: "core", equipment: "bodyweight" },
    { name: "Cable Crunch", group: "core", equipment: "cable" }
];

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
   PLAN GENERATION (Trainer-Based)
=========================== */
function generatePlan({ goal, experience, style, days }) {
    const splits = {
        "3": ["Full Body", "Full Body", "Full Body"],
        "4": ["Upper", "Lower", "Upper", "Lower"],
        "5": ["Push", "Pull", "Legs", "Upper", "Lower"],
        "6": ["Push", "Pull", "Legs", "Push", "Pull", "Legs"]
    };

    const volumeMap = {
        beginner: { MEV: 8, MAV: 12, MRV: 16 },
        experienced: { MEV: 10, MAV: 14, MRV: 20 },
        advanced: { MEV: 12, MAV: 16, MRV: 22 }
    };

    const base = volumeMap[experience];
    const currentSets = base.MEV;
    const maxSets = base.MRV;

    const filteredExercises = exerciseLibrary.filter(ex => {
        if (style === "home") return ex.equipment !== "barbell" && ex.equipment !== "machine";
        return true;
    });

    const sessions = splits[days].map(split => {
        let exercises = [];
        if (split === "Upper") {
            exercises = pickExercises(filteredExercises, ["chest", "back", "shoulders", "biceps", "triceps"], 5);
        } else if (split === "Lower") {
            exercises = pickExercises(filteredExercises, ["legs", "glutes", "calves"], 4);
        } else if (split === "Full Body") {
            exercises = pickExercises(filteredExercises, ["chest", "back", "legs", "glutes", "shoulders"], 6);
        } else if (split === "Push") {
            exercises = pickExercises(filteredExercises, ["chest", "shoulders", "triceps"], 4);
        } else if (split === "Pull") {
            exercises = pickExercises(filteredExercises, ["back", "biceps"], 4);
        } else if (split === "Legs") {
            exercises = pickExercises(filteredExercises, ["legs", "glutes", "calves"], 4);
        }

        return {
            name: split,
            exercises: exercises.map(ex => ({
                name: ex.name,
                sets: Math.floor(currentSets / exercises.length),
                reps: [8, 12],
                rir: 3
            }))
        };
    });

    return {
        goal,
        experience,
        style,
        days,
        week: 1,
        rirTarget: 3,
        currentVolume: currentSets,
        maxVolume: maxSets,
        sessions
    };
}

function pickExercises(pool, groups, count) {
    const filtered = pool.filter(ex => groups.includes(ex.group));
    return shuffleArray(filtered).slice(0, count);
}

function shuffleArray(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

/* ===========================
   DASHBOARD
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
                data: [plan.currentVolume, plan.currentVolume + 5, plan.currentVolume + 10, plan.maxVolume],
                borderColor: '#ff6b35',
                fill: false,
                tension: 0.2
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    const ctxLoad = document.getElementById('loadChart').getContext('2d');
    new Chart(ctxLoad, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{ label: 'Average Load (lbs)', data: [100, 110, 120, 130], backgroundColor: '#ff914d' }]
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
                            <input type="number" id="reps-${i}-${j}" value="${ex.reps[0]}">
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

function closeModal() { document.getElementById('modal').classList.add('hidden'); }

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
            ex.reps = [parseInt(document.getElementById(`reps-${i}-${j}`).value), ex.reps[1]];
        });
    });
    closeModal();
}

/* ===========================
   UTILITY
=========================== */
function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

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
