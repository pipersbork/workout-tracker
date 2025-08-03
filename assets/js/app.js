let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: "",
    frequency: 2 // default, will adjust later
};

let volumeData = []; // For Chart.js
let chartInstance = null;

/* Update progress bar */
function updateProgress() {
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.querySelector('.progress').style.width = percentage + "%";
}

/* Go to next step */
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

/* Validate selection for a specific field */
function validateStep(field) {
    if (!userSelections[field]) {
        alert("Please select an option before continuing.");
        return false;
    }
    return true;
}

/* Select a card option */
function selectCard(element, field, value) {
    userSelections[field] = value;

    const group = element.parentElement.querySelectorAll('.goal-card');
    group.forEach(card => card.classList.remove('active'));

    element.classList.add('active');
}

/* Complete onboarding */
async function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));

    const plan = await generatePlan(userSelections);
    await savePlanToDB(plan);

    renderDashboard(plan);
}

/* Generate a sample training plan */
async function generatePlan(selections) {
    const baseSets = selections.experience === "beginner" ? 8 :
                     selections.experience === "experienced" ? 12 : 16;

    const sessions = [];
    const days = parseInt(selections.days);

    for (let i = 0; i < days; i++) {
        sessions.push({
            name: `Session ${i + 1}`,
            exercises: [
                { name: "Squat", sets: 3, reps: [6, 10], rir: 2 },
                { name: "Bench Press", sets: 3, reps: [8, 12], rir: 2 },
                { name: "Row", sets: 3, reps: [8, 12], rir: 2 }
            ]
        });
    }

    return {
        goal: selections.goal,
        experience: selections.experience,
        style: selections.style,
        days: days,
        week: 1,
        rirTarget: 2,
        currentVolume: baseSets,
        maxVolume: baseSets * 2,
        sessions
    };
}

/* Render dashboard */
async function renderDashboard(plan = null) {
    if (!plan) plan = await getPlanFromDB();
    if (!plan) {
        console.error("No plan found");
        return;
    }

    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="dashboard">
            <h1>🏋️ Your Training Plan</h1>
            <p><strong>Goal:</strong> ${capitalize(plan.goal)} | <strong>Level:</strong> ${capitalize(plan.experience)}</p>
            <p><strong>Week:</strong> ${plan.week} | <strong>Target RIR:</strong> ${plan.rirTarget}</p>

            <div class="progress-bar">
                <div class="progress" style="width:${(plan.currentVolume / plan.maxVolume) * 100}%"></div>
            </div>
            <p>${plan.currentVolume} sets / ${plan.maxVolume} max</p>

            <!-- Sessions -->
            <div class="sessions">
                ${plan.sessions.map(session => `
                    <div class="session-card">
                        <h2>${session.name}</h2>
                        ${session.exercises.map(ex => `
                            <div class="exercise">
                                <p><strong>${ex.name}</strong></p>
                                <p>${ex.sets} sets × ${ex.reps[0]}–${ex.reps[1]} reps</p>
                                <p>RIR: ${ex.rir}</p>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>

            <!-- Dashboard Actions -->
            <div class="dashboard-actions">
                <button class="cta-button" onclick="openModal('log')">Log Workout</button>
                <button class="cta-button" onclick="openModal('adjust')">Manual Adjust</button>
                <button class="cta-button" onclick="openModal('charts')">View Charts</button>
            </div>
        </div>
    `;

    // Store initial chart data
    if (volumeData.length === 0) {
        volumeData.push({ week: plan.week, volume: plan.currentVolume });
    }
}

/* Capitalize helper */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* Modal Logic */
function openModal(type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');

    if (type === 'log') {
        modalBody.innerHTML = `
            <h2>Log Workout</h2>
            <p>Enter fatigue score (1–10):</p>
            <input type="number" id="fatigueScore" min="1" max="10">
            <textarea id="workoutNotes" placeholder="Optional notes"></textarea>
            <button class="cta-button" onclick="submitWorkout()">Submit</button>
        `;
    } else if (type === 'adjust') {
        manualAdjustUI(modalBody);
    } else if (type === 'charts') {
        modalBody.innerHTML = `
            <h2>Volume Progression</h2>
            <canvas id="volumeChart" width="300" height="200"></canvas>
        `;
        setTimeout(renderChart, 200);
    }

    modal.classList.remove('hidden');
}
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

/* Submit Workout */
async function submitWorkout() {
    const fatigue = parseInt(document.getElementById('fatigueScore').value);
    if (!fatigue || fatigue < 1 || fatigue > 10) {
        alert("Please enter a valid fatigue score (1–10)");
        return;
    }

    const notes = document.getElementById('workoutNotes').value;
    let plan = await getPlanFromDB();

    plan = applyProgression(plan, fatigue);
    await savePlanToDB(plan);
    await saveWorkoutToDB({ date: new Date().toISOString(), fatigue, notes });

    volumeData.push({ week: plan.week, volume: plan.currentVolume });

    closeModal();
    renderDashboard(plan);
}

/* Manual Adjust UI */
async function manualAdjustUI(container) {
    const plan = await getPlanFromDB();

    container.innerHTML = `
        <h2>Manual Adjustments</h2>
        ${plan.sessions.map((session, sIndex) => `
            <div>
                <h3>${session.name}</h3>
                ${session.exercises.map((ex, eIndex) => `
                    <p>${ex.name}</p>
                    <input type="number" id="sets-${sIndex}-${eIndex}" value="${ex.sets}">
                    <input type="number" id="rir-${sIndex}-${eIndex}" value="${ex.rir}">
                `).join('')}
            </div>
        `).join('')}
        <button class="cta-button" onclick="saveManualAdjust()">Save</button>
    `;
}

/* Save Manual Adjustments */
async function saveManualAdjust() {
    const plan = await getPlanFromDB();

    plan.sessions.forEach((session, sIndex) => {
        session.exercises.forEach((ex, eIndex) => {
            ex.sets = parseInt(document.getElementById(`sets-${sIndex}-${eIndex}`).value);
            ex.rir = parseInt(document.getElementById(`rir-${sIndex}-${eIndex}`).value);
        });
    });

    await savePlanToDB(plan);
    closeModal();
    renderDashboard(plan);
}

/* Apply progression logic */
function applyProgression(plan, fatigueScore) {
    if (fatigueScore <= 4) {
        plan.currentVolume += 2;
        if (plan.currentVolume > plan.maxVolume) plan.currentVolume = plan.maxVolume;
    } else if (fatigueScore >= 8) {
        plan.currentVolume -= 2;
        if (plan.currentVolume < 8) plan.currentVolume = 8;
    }
    plan.week += 1;
    return plan;
}

/* Render Chart */
function renderChart() {
    const ctx = document.getElementById('volumeChart').getContext('2d');

    const labels = volumeData.map(d => `Week ${d.week}`);
    const data = volumeData.map(d => d.volume);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Volume (Sets)',
                data: data,
                borderColor: '#ff6b35',
                backgroundColor: 'rgba(255,107,53,0.2)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#fff' } }
            },
            scales: {
                x: { ticks: { color: '#fff' } },
                y: { ticks: { color: '#fff' } }
            }
        }
    });
}

/* On page load */
window.onload = async () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        const savedSelections = JSON.parse(localStorage.getItem("userSelections"));
        Object.assign(userSelections, savedSelections);
        renderDashboard();
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
