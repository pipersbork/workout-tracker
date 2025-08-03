let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: ""
};

// ========== PROGRESS BAR ==========
function updateProgress() {
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.querySelector('.progress').style.width = percentage + "%";
}

// ========== ONBOARDING ==========
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

// Finish Onboarding and Load Dashboard
async function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));

    await savePreferencesToDB(userSelections);
    renderDashboard();
}

// ========== DASHBOARD ==========
async function renderDashboard() {
    document.querySelector('.container').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');

    const prefs = await getPreferencesFromDB() || userSelections;

    document.getElementById('userSummary').textContent = `
        Goal: ${capitalize(prefs.goal)} | Level: ${capitalize(prefs.experience)} | Days: ${prefs.days}
    `;

    await renderTemplateList();
    await loadWorkoutHistory();
    renderCharts();
}

// ========== CAPITALIZE ==========
function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// ========== MODAL CONTROL ==========
function openModal(type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    modal.classList.remove('hidden');

    if (type === 'logWorkout') {
        modalBody.innerHTML = `
            <h2>Log Workout</h2>
            <textarea id="workoutNotes" placeholder="Workout notes"></textarea>
            <label>Fatigue Score (1-10)</label>
            <input type="number" id="fatigueScore" min="1" max="10">
            <button class="cta-button" onclick="submitWorkout()">Save</button>
        `;
    }

    if (type === 'planner') {
        modalBody.innerHTML = `
            <h2>Workout Templates</h2>
            <input type="text" id="templateSearch" class="template-search" placeholder="Search templates..." oninput="filterTemplates()">
            <ul id="templateList" class="template-list"></ul>
            <hr>
            <h3>Add New Template</h3>
            <input type="text" id="templateName" placeholder="Template Name">
            <textarea id="templateDetails" placeholder="Details (sets, reps, exercises)"></textarea>
            <button class="cta-button" onclick="addTemplate()">Add Template</button>
        `;
        renderTemplateList();
    }

    if (type === 'settings') {
        modalBody.innerHTML = `<h2>Settings</h2><p>Coming soon...</p>`;
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ========== TEMPLATES ==========
async function addTemplate() {
    const name = document.getElementById('templateName').value.trim();
    const details = document.getElementById('templateDetails').value.trim();

    if (!name || !details) {
        alert("Please enter template name and details");
        return;
    }

    const template = { id: Date.now(), name, details };
    await saveTemplateToDB(template);

    document.getElementById('templateName').value = "";
    document.getElementById('templateDetails').value = "";

    renderTemplateList();
}

async function renderTemplateList() {
    const templates = await getAllTemplatesFromDB();
    const list = document.getElementById('templateList');
    if (!list) return; // Modal not open

    list.innerHTML = "";
    templates.forEach(t => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${t.name}</span>
            <button class="delete-btn" onclick="deleteTemplate(${t.id})">Delete</button>
        `;
        list.appendChild(li);
    });
}

async function deleteTemplate(id) {
    await deleteTemplateFromDB(id);
    renderTemplateList();
}

function filterTemplates() {
    const search = document.getElementById('templateSearch').value.toLowerCase();
    const items = document.querySelectorAll('.template-list li');
    items.forEach(li => {
        const text = li.textContent.toLowerCase();
        li.style.display = text.includes(search) ? "" : "none";
    });
}

// ========== WORKOUT LOGGING ==========
async function submitWorkout() {
    const fatigueScore = parseInt(document.getElementById('fatigueScore').value);
    if (!fatigueScore || fatigueScore < 1 || fatigueScore > 10) {
        alert("Please enter a valid fatigue score (1–10).");
        return;
    }
    const notes = document.getElementById('workoutNotes').value;

    await saveWorkoutToDB({ date: new Date().toISOString(), fatigue: fatigueScore, notes });
    closeModal();
    loadWorkoutHistory();
}

async function loadWorkoutHistory() {
    const workouts = await getAllWorkoutsFromDB();
    const list = document.getElementById('workoutList');
    list.innerHTML = "";
    workouts.forEach(w => {
        const li = document.createElement('li');
        li.textContent = `${new Date(w.date).toLocaleDateString()} - Fatigue: ${w.fatigue} | ${w.notes}`;
        list.appendChild(li);
    });
}

// ========== CHARTS ==========
async function renderCharts() {
    const workouts = await getAllWorkoutsFromDB();
    const dates = workouts.map(w => new Date(w.date).toLocaleDateString());
    const fatigue = workouts.map(w => w.fatigue);

    const ctx = document.getElementById('volumeChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Fatigue Score',
                    data: fatigue,
                    borderColor: '#ff6b35',
                    fill: false
                }]
            }
        });
    }
}

// ========== PAGE LOAD ==========
window.onload = async () => {
    await initDB();

    if (localStorage.getItem("onboardingCompleted") === "true") {
        renderDashboard();
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
