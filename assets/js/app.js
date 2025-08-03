let currentStep = 1;
const totalSteps = 6;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: ""
};

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

/* Select card (Step 2) */
function selectCard(element, field, value) {
    userSelections[field] = value;

    const group = element.parentElement.querySelectorAll('.goal-card');
    group.forEach(card => card.classList.remove('active'));

    element.classList.add('active');
}

/* Select option button (Steps 3-4) */
function selectOption(field, value) {
    userSelections[field] = value;

    const group = document.querySelector(`.button-group[data-field="${field}"]`);
    group.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('active'));

    const clickedBtn = [...group.querySelectorAll('.option-btn')]
        .find(btn => btn.getAttribute('onclick').includes(value));
    if (clickedBtn) clickedBtn.classList.add('active');
}

/* Validate selection before moving to next step */
function validateStep(field) {
    if (!userSelections[field]) {
        alert("Please select an option before continuing.");
        return false;
    }
    return true;
}

/* Complete onboarding */
function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));
    renderDashboard();
}

/* On page load */
window.onload = () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        renderDashboard();
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
