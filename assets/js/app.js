let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: "",
    frequency: 2
};

/* ===== Onboarding Functions ===== */
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

/* ===== Modal Logic ===== */
function openModal() {
    document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

/* ===== Dashboard Rendering ===== */
async function renderDashboard(plan = null) {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="dashboard">
            <h1>Welcome to Progression</h1>
            <p><strong>Goal:</strong> ${capitalize(userSelections.goal)} | <strong>Experience:</strong> ${capitalize(userSelections.experience)}</p>
            <p><strong>Style:</strong> ${capitalize(userSelections.style)} | <strong>Days:</strong> ${userSelections.days}</p>

            <!-- Quick Setup & Advanced Buttons -->
            <div class="dashboard-actions" style="margin: 20px;">
                <button class="cta-button" onclick="openModal()">⚡ Quick Setup</button>
                <a href="mesocycle.html" class="cta-button" style="display:block; text-align:center;">🛠 Advanced Planner</a>
            </div>

            <!-- Placeholder for plan preview -->
            <div id="planPreview" style="margin-top:20px;">
                ${plan ? renderPlanPreview(plan) : "<p>No plan created yet. Use Quick Setup or Advanced Planner.</p>"}
            </div>
        </div>
    `;
}

/* Render preview of plan */
function renderPlanPreview(plan) {
    return `
        <h2>Your Plan</h2>
        <p><strong>Weeks:</strong> ${plan.weeks} | <strong>Intensity:</strong> ${capitalize(plan.intensity)}</p>
        <p><strong>Volume Progression:</strong></p>
        <ul>
            ${plan.weeksArray.map((w, i) => `<li>Week ${i + 1}: ${w.sets} sets | RIR ${w.rir}</li>`).join('')}
        </ul>
    `;
}

/* ===== Quick Setup Plan Generator ===== */
function generateQuickMesocycle() {
    const weeks = parseInt(document.getElementById('weeks').value);
    const intensity = document.getElementById('intensity').value;

    const baseSets = userSelections.experience === 'beginner' ? 8 : userSelections.experience === 'advanced' ? 14 : 10;
    const rirStart = 4;
    const rirEnd = intensity === 'high' ? 0 : 1;

    const weeksArray = [];
    for (let i = 0; i < weeks; i++) {
        const sets = baseSets + Math.floor((i / weeks) * 4); // progressive overload
        const rir = Math.max(rirStart - Math.floor((i / weeks) * (rirStart - rirEnd)), rirEnd);
        weeksArray.push({ week: i + 1, sets, rir });
    }

    const plan = { weeks, intensity, weeksArray };

    savePlanToDB(plan);
    closeModal();
    renderDashboard(plan);
}

/* ===== IndexedDB Helpers for Plan ===== */
async function savePlanToDB(plan) {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("preferences", "readwrite");
        tx.objectStore("preferences").put({ id: 2, plan });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject("Failed to save plan");
    });
}

async function getPlanFromDB() {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("preferences", "readonly");
        const request = tx.objectStore("preferences").get(2);
        request.onsuccess = () => resolve(request.result ? request.result.plan : null);
        request.onerror = () => reject("Failed to fetch plan");
    });
}

/* ===== Utility ===== */
function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

/* ===== On Load ===== */
window.onload = async () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        const savedSelections = JSON.parse(localStorage.getItem("userSelections"));
        Object.assign(userSelections, savedSelections);

        const savedPlan = await getPlanFromDB();
        renderDashboard(savedPlan);
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
