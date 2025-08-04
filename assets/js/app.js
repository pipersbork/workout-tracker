let currentStep = 1;
const totalSteps = 5;

const userSelections = { goal: "", experience: "", style: "", days: "" };
let plan = null;

function updateProgress() {
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.querySelector('.progress').style.width = percentage + "%";
}

function nextStep() {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep++;
    if (currentStep <= totalSteps) {
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateProgress();
    }
}

function validateStep(field) {
    if (!userSelections[field]) {
        alert("Please select an option.");
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

function renderDashboard(plan) {
    document.getElementById('onboarding').style.display = "none";
    const dashboard = document.getElementById('dashboard');
    dashboard.classList.remove('hidden');

    document.getElementById('summaryGoal').textContent = capitalize(plan.goal);
    document.getElementById('summaryExperience').textContent = capitalize(plan.experience);
    document.getElementById('summaryDays').textContent = plan.days;

    document.getElementById('volumeSummary').textContent = `${plan.currentVolume} sets / ${plan.maxVolume} max`;
    document.getElementById('volumeProgress').style.width = `${(plan.currentVolume / plan.maxVolume) * 100}%`;

    renderCharts(plan);
}

function renderCharts(plan) {
    const ctx1 = document.getElementById('volumeChart').getContext('2d');
    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{ label: 'Volume', data: [plan.currentVolume, plan.currentVolume+5, plan.currentVolume+8, plan.maxVolume], borderColor: '#ff6b35', fill: false }]
        }
    });
    const ctx2 = document.getElementById('loadChart').getContext('2d');
    new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{ label: 'Load', data: [100, 120, 130, 150], backgroundColor: '#ff914d' }]
        }
    });
}

function generatePlan({ goal, experience, style, days }) {
    const baseSets = experience === 'beginner' ? 8 : experience === 'experienced' ? 12 : 16;
    const maxSets = baseSets + 4;
    return { goal, experience, style, days, currentVolume: baseSets, maxVolume: maxSets };
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

window.onload = () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        Object.assign(userSelections, JSON.parse(localStorage.getItem("userSelections")));
        plan = generatePlan(userSelections);
        renderDashboard(plan);
    } else {
        document.getElementById('step1').classList.add('active');
        updateProgress();
    }
};