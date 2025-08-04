/* ===========================
   GLOBAL VARIABLES
=========================== */
let currentStep = 1;
const totalSteps = 5;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: ""
};

let currentPlan = null;
let allPlans = []; // Stores multiple plans

/* ===========================
   EXERCISE DATABASE (Sample for now)
=========================== */
const EXERCISES = [
    { name: "Barbell Bench Press", muscle: "Chest", equipment: "Barbell" },
    { name: "Incline Dumbbell Press", muscle: "Chest", equipment: "Dumbbell" },
    { name: "Pull-Up", muscle: "Back", equipment: "Bodyweight" },
    { name: "Barbell Row", muscle: "Back", equipment: "Barbell" },
    { name: "Shoulder Press", muscle: "Shoulders", equipment: "Barbell" },
    { name: "Lateral Raise", muscle: "Shoulders", equipment: "Dumbbell" },
    { name: "Barbell Curl", muscle: "Biceps", equipment: "Barbell" },
    { name: "Triceps Pushdown", muscle: "Triceps", equipment: "Cable" },
    { name: "Squat", muscle: "Quads", equipment: "Barbell" },
    { name: "Romanian Deadlift", muscle: "Hamstrings", equipment: "Barbell" },
    { name: "Hip Thrust", muscle: "Glutes", equipment: "Barbell" },
    { name: "Plank", muscle: "Core", equipment: "Bodyweight" }
    // ✅ Expand to 250 later
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

function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));

    currentPlan = generatePlan(userSelections);
    allPlans.push(currentPlan);
    savePlans();

    renderDashboard(currentPlan);
}

/* ===========================
   MULTI-PLAN MANAGEMENT
=========================== */
function savePlans() {
    localStorage.setItem("allPlans", JSON.stringify(allPlans));
}

function loadPlans() {
    const saved = localStorage.getItem("allPlans");
    if (saved) {
        allPlans = JSON.parse(saved);
    }
}

function renderPlanSelector() {
    const selector = document.querySelector(".plan-selector");
    selector.innerHTML = allPlans.map((plan, index) => `
        <div class="plan-card ${index === allPlans.indexOf(currentPlan) ? 'active' : ''}" onclick="switchPlan(${index})">
            ${capitalize(plan.goal)} | ${capitalize(plan.experience)} | ${plan.days} Days
        </div>
    `).join('');
}

function switchPlan(index) {
    currentPlan = allPlans[index];
    savePlans();
    renderDashboard(currentPlan);
}

/* ===========================
   PLAN GENERATION
=========================== */
function generatePlan({ goal, experience, style, days }) {
    const baseSets = experience === 'beginner' ? 8 :
                     experience === 'experienced' ? 12 : 16;
    const maxSets = baseSets + 4;

    const repRange = goal === 'muscle' ? [6, 12] :
                     goal === 'combined' ? [8, 15] : [12, 20];
    const rir = experience === 'beginner' ? 3 :
                experience === 'experienced' ? 2 : 1;

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
    const filtered = EXERCISES.filter(ex => muscleGroups.includes(ex.muscle));
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
   DASHBOARD RENDER
=========================== */
function renderDashboard(plan) {
    document.querySelector('.container').style.display = "none";
    const dashboard = document.getElementById('dashboard');
    dashboard.style.display = "block";

    document.getElementById('summaryGoal').textContent = capitalize(plan.goal);
    document.getElementById('summaryExperience').textContent = capitalize(plan.experience);
    document.getElementById('summaryDays').textContent = plan.days;

    document.getElementById('volumeSummary').textContent =
        `${plan.currentVolume} sets / ${plan.maxVolume} max`;

    document.getElementById('volumeProgress').style.width =
        `${(plan.currentVolume / plan.maxVolume) * 100}%`;

    renderCharts(plan);
    renderPlanSelector();
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
                label: 'Volume (Sets)',
                data: [plan.currentVolume, plan.currentVolume + 5, plan.currentVolume + 10, plan.maxVolume],
                borderColor: '#ff6b35',
                fill: false,
                tension: 0.3
            }]
        }
    });

    const ctxLoad = document.getElementById('loadChart').getContext('2d');
    new Chart(ctxLoad, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Average Load',
                data: [100, 110, 120, 130],
                backgroundColor: '#ff914d'
            }]
        }
    });
}

/* ===========================
   MODAL: LOG WORKOUT
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
function submitWorkout() {
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
   UTILITY
=========================== */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ===========================
   PAGE LOAD
=========================== */
window.onload = () => {
    loadPlans();

    if (localStorage.getItem("onboardingCompleted") === "true" && allPlans.length > 0) {
        currentPlan = allPlans[0];
        renderDashboard(currentPlan);
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};