let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: "",
    frequency: 2
};

let templates = []; // Local cache for templates
let currentPlan = null;

/* -------------------------
   PROGRESS BAR
------------------------- */
function updateProgress() {
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.querySelector('.progress').style.width = percentage + "%";
}

/* -------------------------
   STEP NAVIGATION
------------------------- */
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

/* -------------------------
   SELECT CARD
------------------------- */
function selectCard(element, field, value) {
    userSelections[field] = value;

    const group = element.parentElement.querySelectorAll('.goal-card');
    group.forEach(card => card.classList.remove('active'));

    element.classList.add('active');
}

/* -------------------------
   COMPLETE ONBOARDING
------------------------- */
async function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));

    await savePreferencesToDB(userSelections);
    currentPlan = await generatePlan(userSelections);
    await savePlanToDB(currentPlan);

    renderDashboard(currentPlan);
}

/* -------------------------
   RENDER DASHBOARD
------------------------- */
async function renderDashboard(plan = null) {
    if (!plan) {
        plan = await getPlanFromDB();
    }
    if (!plan) {
        console.error("No plan found.");
        return;
    }
    currentPlan = plan;

    document.querySelector('.container').classList.add('hidden');
    const dashboard = document.getElementById('dashboard');
    dashboard.classList.remove('hidden');

    const summary = `
        Goal: ${capitalize(plan.goal)} | Level: ${capitalize(plan.experience)} | Days: ${plan.days}
    `;

    document.getElementById('userSummary')?.remove();
    const summaryElem = document.createElement('p');
    summaryElem.id = "userSummary";
    summaryElem.textContent = summary;
    dashboard.querySelector('h1').after(summaryElem);

    updateVolumeProgress(plan);
    renderCharts();
    loadWorkoutHistory();
}

/* -------------------------
   VOLUME PROGRESS
------------------------- */
function updateVolumeProgress(plan) {
    const progress = document.getElementById('volumeProgress');
    const summary = document.getElementById('volumeSummary');

    const percentage = (plan.currentVolume / plan.maxVolume) * 100;
    progress.style.width = `${percentage}%`;
    summary.textContent = `${plan.currentVolume} sets / ${plan.maxVolume} max`;
}

/* -------------------------
   CHARTS (Chart.js)
------------------------- */
function renderCharts() {
    const ctxVolume = document.getElementById('volumeChart').getContext('2d');
    new Chart(ctxVolume, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Volume (Sets)',
                data: [10, 14, 18, 22],
                borderColor: '#ff6b35',
                fill: false,
                tension: 0.2
            }]
        },
        options: { responsive: true }
    });

    const ctxLoad = document.getElementById('loadChart').getContext('2d');
    new Chart(ctxLoad, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Load (kg)',
                data: [500, 600, 700, 800],
                backgroundColor: '#ff914d'
            }]
        },
        options: { responsive: true }
    });
}

/* -------------------------
   WORKOUT HISTORY
------------------------- */
async function loadWorkoutHistory() {
    const workouts = await getAllWorkoutsFromDB();
    const list = document.getElementById('workoutList');
    list.innerHTML = "";
    workouts.forEach(w => {
        const li = document.createElement('li');
        li.textContent = `${w.date.split('T')[0]} - ${w.notes || 'No notes'} (Fatigue: ${w.fatigue || '-'})`;
        list.appendChild(li);
    });
}

/* -------------------------
   MODALS
------------------------- */
function openModal(type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');

    if (type === 'logWorkout') {
        modalBody.innerHTML = `
            <h2>Log Workout</h2>
            <textarea id="workoutNotes" placeholder="Notes"></textarea>
            <input type="number" id="fatigueScore" placeholder="Fatigue (1-10)" min="1" max="10">
            <button onclick="submitWorkout()">Save</button>
        `;
    } else if (type === 'planner') {
        modalBody.innerHTML = `
            <h2>Workout Templates</h2>
            <div class="template-actions">
                <input type="text" id="templateSearch" placeholder="Search Templates" oninput="searchTemplates()">
                <button onclick="openAddTemplateForm()">+ Add</button>
            </div>
            <ul class="template-list" id="templateList"></ul>
        `;
        renderTemplateList();
    } else if (type === 'settings') {
        modalBody.innerHTML = `
            <h2>Settings</h2>
            <p>Future options here (sync, theme, etc.)</p>
        `;
    }

    modal.classList.remove('hidden');
}
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

/* -------------------------
   TEMPLATE MANAGEMENT
------------------------- */
function renderTemplateList() {
    const list = document.getElementById('templateList');
    list.innerHTML = "";
    templates.forEach((tpl, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${tpl.name}
            <div>
                <button onclick="loadTemplate(${index})">Load</button>
                <button onclick="deleteTemplate(${index})">Delete</button>
            </div>
        `;
        list.appendChild(li);
    });
}

function openAddTemplateForm() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h2>Create Template</h2>
        <input type="text" id="templateName" placeholder="Template Name">
        <div id="exerciseRows"></div>
        <button onclick="addExerciseRow()">+ Add Exercise</button>
        <button onclick="saveTemplate()">Save Template</button>
    `;
}

function addExerciseRow() {
    const container = document.getElementById('exerciseRows');
    const div = document.createElement('div');
    div.classList.add('exercise-row');
    div.innerHTML = `
        <input type="text" placeholder="Exercise Name">
        <input type="number" placeholder="Sets">
        <input type="number" placeholder="Reps">
    `;
    container.appendChild(div);
}

function saveTemplate() {
    const name = document.getElementById('templateName').value.trim();
    if (!name) return alert("Template name required");

    const rows = document.querySelectorAll('#exerciseRows .exercise-row');
    const exercises = [];
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        exercises.push({
            name: inputs[0].value,
            sets: parseInt(inputs[1].value),
            reps: parseInt(inputs[2].value)
        });
    });

    templates.push({ name, exercises });
    renderTemplateList();
    alert("Template saved!");
    openModal('planner');
}

function deleteTemplate(index) {
    templates.splice(index, 1);
    renderTemplateList();
}

function searchTemplates() {
    const query = document.getElementById('templateSearch').value.toLowerCase();
    const filtered = templates.filter(t => t.name.toLowerCase().includes(query));
    const list = document.getElementById('templateList');
    list.innerHTML = "";
    filtered.forEach((tpl, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${tpl.name}
            <div>
                <button onclick="loadTemplate(${index})">Load</button>
                <button onclick="deleteTemplate(${index})">Delete</button>
            </div>
        `;
        list.appendChild(li);
    });
}

function loadTemplate(index) {
    alert(`Loaded Template: ${templates[index].name}`);
}

/* -------------------------
   LOG WORKOUT
------------------------- */
async function submitWorkout() {
    const fatigueScore = parseInt(document.getElementById('fatigueScore').value);
    const notes = document.getElementById('workoutNotes').value;

    await saveWorkoutToDB({
        date: new Date().toISOString(),
        fatigue: fatigueScore,
        notes
    });

    alert("Workout logged!");
    closeModal();
    loadWorkoutHistory();
}

/* -------------------------
   HELPERS
------------------------- */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* -------------------------
   INIT
------------------------- */
window.onload = async () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        const savedSelections = await getPreferencesFromDB();
        if (savedSelections) Object.assign(userSelections, savedSelections);
        renderDashboard();
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
