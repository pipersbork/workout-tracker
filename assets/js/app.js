let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: ""
};

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

function selectOption(field, value) {
    userSelections[field] = value;

    // Remove active from all buttons in this group
    const group = document.querySelector(`.button-group[data-field="${field}"]`);
    group.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('active'));

    // Highlight clicked button
    const clickedBtn = [...group.querySelectorAll('.option-btn')]
        .find(btn => btn.getAttribute('onclick').includes(value));
    if (clickedBtn) clickedBtn.classList.add('active');
}

function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));
    renderDashboard();
}

window.onload = () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        renderDashboard();
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
