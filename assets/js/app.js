let currentStep = 1;
const totalSteps = 6;

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

function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    document.querySelector('.container').innerHTML = `
        <h1>Dashboard Placeholder</h1>
        <p>Your app goes here.</p>
    `;
}

// On load
window.onload = () => {
    if (localStorage.getItem("onboardingCompleted") === "true") {
        document.querySelector('.container').innerHTML = `
            <h1>Dashboard Placeholder</h1>
            <p>Your app goes here.</p>
        `;
    } else {
        document.querySelector('#step1').classList.add('active');
        updateProgress();
    }
};
