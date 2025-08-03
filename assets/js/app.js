// ==========================
// State Management
// ==========================
let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: "",
    frequency: 2 // Default, can be adjusted later
};

let workouts = JSON.parse(localStorage.getItem("workoutHistory")) || [];

// ==========================
// Onboarding Functions
// ==========================
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
    renderDashboard();
}

// ==========================
// Dashboard Rendering
// ==========================
function renderDashboard() {
    document.querySelector('.container').classList.add('hidden');
    const dashboard = document.getElementById('dashboard');
    dashboard.classList.remove('hidden');

    const planSummary = `
        <strong>Goal:</strong> ${capitalize(userSelections.goal)} | 
        <strong>Level:</strong> ${capitalize(userSelections.experience)} | 
        <strong>Days:</strong> ${userSelections.days}/week
    `;

    document.getElementById('userSummary').innerHTML = planSummary;

    updateCharts();
    loadWorkoutHistory();
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==========================
// Workout Logging
// ==========================
function openModal(type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');

    if (type === 'logWorkout') {
        modalBody.innerHTML = `
            <h2>Log Workout</h2>
            <textarea id="workoutNotes" placeholder="Workout details..."></textarea>
            <label>Fatigue Score (1-10)</label>
            <input type="number" id="fatigueScore" min="1" max="10">
            <button class="cta-button full-width" onclick="submitWorkout()">Save</button>
        `;
    } else if (type === 'planner') {
        modalBody.innerHTML = `
            <h2>Workout Planner</h2>
            <p>Feature coming soon: Customize your program!</p>
        `;
    } else if (type === 'settings') {
        modalBody.innerHTML = `
            <h2>Settings</h2>
            <button class="cta-button full-width" onclick="resetApp()">Reset App</button>
        `;
    }

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function submitWorkout() {
    const fatigueScore = parseInt(document.getElementById('fatigueScore').value);
    const notes = document.getElementById('workoutNotes').value.trim();

    if (!fatigueScore || fatigueScore < 1 || fatigueScore > 10) {
        alert("Please enter a valid fatigue score (1-10).");
        return;
    }

    const workout = {
        date: new Date().toISOString(),
        fatigue: fatigueScore,
        notes
    };

    workouts.push(workout);
    localStorage.setItem("workoutHistory", JSON.stringify(workouts));

    closeModal();
    updateCharts();
    loadWorkoutHistory();
}

function resetApp() {
    localStorage.clear();
    location.reload();
}

// ==========================
// Workout History
// ==========================
function loadWorkoutHistory() {
    const list = document.getElementById('workoutList');
    list.innerHTML = "";

    if (workouts.length === 0) {
        list.innerHTML = "<li>No workouts logged yet.</li>";
        return;
    }

    workouts.slice(-5).reverse().forEach(w => {
        const li = document.createElement('li');
        li.textContent = `${new Date(w.date).toLocaleDateString()} - Fatigue: ${w.fatigue} ${w.notes ? "| " + w.notes : ""}`;
        list.appendChild(li);
    });
}

// ==========================
// Charts
// ==========================
let volumeChart, loadChart;

function updateCharts() {
    const ctxVolume = document.getElementById('volumeChart').getContext('2d');
    const ctxLoad = document.getElementById('loadChart').getContext('2d');

    const labels = workouts.map(w => new Date(w.date).toLocaleDateString());
    const fatigueData = workouts.map(w => w.fatigue);
    const loadData = workouts.map(() => Math.floor(Math.random() * 100) + 50); // Placeholder

    if (volumeChart) volumeChart.destroy();
    if (loadChart) loadChart.destroy();

    volumeChart = new Chart(ctxVolume, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Fatigue Score',
                data: fatigueData,
                backgroundColor: '#ff6b35'
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    loadChart = new Chart(ctxLoad, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Estimated Load (kg)',
                data: loadData,
                borderColor: '#ff914d',
                fill: false,
                tension: 0.3
            }]
        },
        options: { responsive: true }
    });
}

// ==========================
// On Page Load
// ==========================
window.onload = () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        const savedSelections = JSON.parse(localStorage.getItem("userSelections"));
        Object.assign(userSelections, savedSelections);
        renderDashboard();
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
