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

let plan = null;

/* ===========================
   EXERCISE DATABASE (SHORT SAMPLE)
=========================== */
const EXERCISES = [
    { name: "Barbell Bench Press", muscle: "Chest", equipment: "Barbell" },
    { name: "Incline Dumbbell Press", muscle: "Chest", equipment: "Dumbbell" },
    { name: "Pull-Up", muscle: "Back", equipment: "Bodyweight" },
    { name: "Barbell Row", muscle: "Back", equipment: "Barbell" },
    { name: "Shoulder Press", muscle: "Shoulders", equipment: "Barbell" },
    { name: "Barbell Curl", muscle: "Biceps", equipment: "Barbell" },
    { name: "Triceps Pushdown", muscle: "Triceps", equipment: "Cable" },
    { name: "Back Squat", muscle: "Quads", equipment: "Barbell" },
    { name: "Romanian Deadlift", muscle: "Hamstrings", equipment: "Barbell" },
    { name: "Hip Thrust", muscle: "Glutes", equipment: "Barbell" }
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

    plan = generatePlan(userSelections);
    renderDashboard(plan);
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

    const sessions = [
        { name: "Day 1 - Upper Body", exercises: getExercises(["Chest","Back"], 5, repRange, rir) },
        { name: "Day 2 - Lower Body", exercises: getExercises(["Quads","Hamstrings","Glutes"], 5, repRange, rir) }
    ];

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
    dashboard.classList.remove('hidden');

    document.getElementById('summaryGoal').textContent = capitalize(plan.goal);
    document.getElementById('summaryExperience').textContent = capitalize(plan.experience);
    document.getElementById('summaryDays').textContent = plan.days;

    document.getElementById('volumeSummary').textContent =
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
   MODAL
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
                ${plan.sessions.map((session, sIndex) => `
                    <h3>${session.name}</h3>
                    ${session.exercises.map((ex, eIndex) => `
                        <div class="exercise-row">
                            <input type="text" value="${ex.name}" readonly>
                            <input type="number" id="sets-${sIndex}-${eIndex}" value="${ex.sets}">
                            <input type="text" id="reps-${sIndex}-${eIndex}" value="${ex.reps}">
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
   PLANNER
=========================== */
function saveManualAdjust() {
    plan.sessions.forEach((session, sIndex) => {
        session.exercises.forEach((ex, eIndex) => {
            ex.sets = parseInt(document.getElementById(`sets-${sIndex}-${eIndex}`).value);
            ex.reps = document.getElementById(`reps-${sIndex}-${eIndex}`).value;
        });
    });
    localStorage.setItem("userPlan", JSON.stringify(plan));
    closeModal();
    renderDashboard(plan);
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
    if (localStorage.getItem("onboardingCompleted") === "true") {
        Object.assign(userSelections, JSON.parse(localStorage.getItem("userSelections")));
        plan = generatePlan(userSelections);
        renderDashboard(plan);
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};