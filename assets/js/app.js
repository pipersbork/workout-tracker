/* ===============================
   GLOBAL STATE
=============================== */
let currentStep = 1;
const totalSteps = 6;
const userSelections = { goal: "", experience: "", style: "", days: "" };

/* ===============================
   ONBOARDING FLOW
=============================== */
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

/* ===============================
   PLAN GENERATION LOGIC
=============================== */
async function generatePlan(selections) {
    const { goal, experience, days, style } = selections;
    const experienceMap = {
        beginner: { baseSets: 8, rir: 3, maxVolume: 80 },
        experienced: { baseSets: 12, rir: 2, maxVolume: 100 },
        advanced: { baseSets: 14, rir: 1, maxVolume: 120 }
    };
    const exp = experienceMap[experience];
    const sessions = [];
    const exerciseLibrary = {
        gym: {
            push: ["Barbell Bench Press", "Incline Dumbbell Press", "Overhead Press", "Lateral Raise"],
            pull: ["Pull-Ups", "Barbell Row", "Face Pulls", "Bicep Curl"],
            legs: ["Back Squat", "Romanian Deadlift", "Leg Press", "Calf Raises"]
        },
        home: {
            push: ["Push-Ups", "Dumbbell Press", "Pike Push-Up", "DB Lateral Raise"],
            pull: ["Inverted Row", "DB Row", "Band Pull-Apart", "DB Curl"],
            legs: ["Bodyweight Squat", "Lunge", "Glute Bridge", "Calf Raise"]
        }
    };
    let split;
    if (days == 3) split = ["Full Body", "Full Body", "Full Body"];
    else if (days == 4) split = ["Upper", "Lower", "Upper", "Lower"];
    else if (days == 5) split = ["Push", "Pull", "Legs", "Upper", "Lower"];
    else split = ["Push", "Pull", "Legs", "Push", "Pull", "Legs"];

    split.forEach(dayType => {
        let exercises = [];
        const library = exerciseLibrary[style];
        if (dayType === "Full Body") {
            exercises = [library.push[0], library.pull[0], library.legs[0]];
        } else if (dayType === "Upper" || dayType === "Push") {
            exercises = library.push.concat(library.pull.slice(0, 2));
        } else if (dayType === "Lower" || dayType === "Legs") {
            exercises = library.legs;
        }
        const exerciseDetails = exercises.map(name => ({
            name,
            sets: Math.round(exp.baseSets / days),
            reps: goal === "muscle" ? [8, 12] : goal === "cardio" ? [12, 20] : [6, 10],
            rir: exp.rir
        }));
        sessions.push({ name: `${dayType} Day`, exercises: exerciseDetails });
    });

    return {
        goal,
        experience,
        style,
        days,
        week: 1,
        rirTarget: exp.rir,
        currentVolume: days * exp.baseSets,
        maxVolume: exp.maxVolume,
        sessions
    };
}

/* ===============================
   ONBOARDING COMPLETE → PLAN
=============================== */
async function finishOnboarding() {
    const plan = await generatePlan(userSelections);
    localStorage.setItem("userSelections", JSON.stringify(userSelections));
    localStorage.setItem("trainingPlan", JSON.stringify(plan));
    renderDashboard(plan);
}

/* ===============================
   DASHBOARD + MODAL
=============================== */
function renderDashboard(plan = null) {
    if (!plan) {
        plan = JSON.parse(localStorage.getItem("trainingPlan"));
        if (!plan) return;
    }
    document.querySelector('.container').classList.add('hidden');
    const dashboard = document.getElementById('dashboard');
    dashboard.classList.remove('hidden');

    dashboard.innerHTML = `
        <div class="dashboard">
            <h1>🏋️ Your Training Dashboard</h1>
            <p><strong>Goal:</strong> ${plan.goal} | <strong>Level:</strong> ${plan.experience}</p>
            <div class="progress-bar">
                <div class="progress" style="width:${(plan.currentVolume / plan.maxVolume) * 100}%"></div>
            </div>
            <p>${plan.currentVolume} sets / ${plan.maxVolume} max</p>

            <button class="cta-button" onclick="openModal('planner')">Customize Plan</button>
        </div>
    `;
}

function openModal(type) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');
    modal.classList.remove('hidden');

    if (type === 'planner') {
        const plan = JSON.parse(localStorage.getItem("trainingPlan"));
        body.innerHTML = `
            <h2>Edit Your Plan</h2>
            ${plan.sessions.map((s, i) => `
                <div class="planner-form">
                    <h3>${s.name}</h3>
                    ${s.exercises.map((ex, j) => `
                        <div class="exercise-row">
                            <input type="text" id="ex-name-${i}-${j}" value="${ex.name}">
                            <input type="number" id="ex-sets-${i}-${j}" value="${ex.sets}">
                            <input type="text" id="ex-reps-${i}-${j}" value="${ex.reps[0]}-${ex.reps[1]}">
                            <input type="number" id="ex-rir-${i}-${j}" value="${ex.rir}">
                        </div>
                    `).join('')}
                    <button onclick="addExercise(${i})">+ Add Exercise</button>
                </div>
            `).join('')}
            <button class="cta-button" onclick="savePlan()">Save Changes</button>
        `;
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function addExercise(sessionIndex) {
    const container = document.querySelectorAll('.planner-form')[sessionIndex];
    const newRow = document.createElement('div');
    newRow.classList.add('exercise-row');
    newRow.innerHTML = `
        <input type="text" placeholder="Exercise Name">
        <input type="number" placeholder="Sets">
        <input type="text" placeholder="Reps (e.g. 8-12)">
        <input type="number" placeholder="RIR">
    `;
    container.insertBefore(newRow, container.lastElementChild);
}

function savePlan() {
    const plan = JSON.parse(localStorage.getItem("trainingPlan"));
    const forms = document.querySelectorAll('.planner-form');

    forms.forEach((form, i) => {
        const rows = form.querySelectorAll('.exercise-row');
        const updatedExercises = [];
        rows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            const [name, sets, reps, rir] = [...inputs].map(input => input.value);
            if (name && sets && reps) {
                const repRange = reps.split('-').map(Number);
                updatedExercises.push({
                    name,
                    sets: parseInt(sets),
                    reps: repRange,
                    rir: parseInt(rir)
                });
            }
        });
        plan.sessions[i].exercises = updatedExercises;
    });

    localStorage.setItem("trainingPlan", JSON.stringify(plan));
    closeModal();
    renderDashboard(plan);
}

/* ===============================
   ON LOAD
=============================== */
window.onload = () => {
    if (localStorage.getItem("trainingPlan")) {
        renderDashboard();
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
