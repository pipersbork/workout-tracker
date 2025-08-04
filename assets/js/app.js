/* ===========================
   GLOBAL VARIABLES
=========================== */
let currentStep = 1;
const totalSteps = 5;

const userSelections = {
    goal: "",
    experience: "",
    style: "",
    days: ""
};

let plan = null;

/* ===========================
   EXERCISE DATABASE (Expanded)
=========================== */
const EXERCISES = [
    { name: "Barbell Bench Press", muscle: "Chest", equipment: "Barbell" },
    { name: "Incline Dumbbell Press", muscle: "Chest", equipment: "Dumbbell" },
    { name: "Push-Up", muscle: "Chest", equipment: "Bodyweight" },
    { name: "Pull-Up", muscle: "Back", equipment: "Bodyweight" },
    { name: "Lat Pulldown", muscle: "Back", equipment: "Cable" },
    { name: "Barbell Row", muscle: "Back", equipment: "Barbell" },
    { name: "Dumbbell Row", muscle: "Back", equipment: "Dumbbell" },
    { name: "Shoulder Press", muscle: "Shoulders", equipment: "Barbell" },
    { name: "Lateral Raise", muscle: "Shoulders", equipment: "Dumbbell" },
    { name: "Barbell Curl", muscle: "Biceps", equipment: "Barbell" },
    { name: "Triceps Pushdown", muscle: "Triceps", equipment: "Cable" },
    { name: "Back Squat", muscle: "Quads", equipment: "Barbell" },
    { name: "Lunge", muscle: "Quads", equipment: "Dumbbell" },
    { name: "Romanian Deadlift", muscle: "Hamstrings", equipment: "Barbell" },
    { name: "Hip Thrust", muscle: "Glutes", equipment: "Barbell" },
    { name: "Calf Raise", muscle: "Calves", equipment: "Machine" },
    { name: "Plank", muscle: "Core", equipment: "Bodyweight" },
    { name: "Cable Crunch", muscle: "Core", equipment: "Cable" },
    { name: "Russian Twist", muscle: "Core", equipment: "Dumbbell" }
    // Expand to 250+ as needed
];

/* ===========================
   ONBOARDING LOGIC
=========================== */
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

function finishOnboarding() {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("userSelections", JSON.stringify(userSelections));

    plan = generatePlan(userSelections);
    renderDashboard(plan);
}

/* ===========================
   PLAN GENERATION (Trainer Logic)
=========================== */
function generatePlan({ goal, experience, style, days }) {
    const baseSets = experience === 'beginner' ? 8 :
                     experience === 'experienced' ? 12 : 16;
    const maxSets = baseSets + 4;

    const repRange = goal === 'muscle' ? [6, 12] :
                     goal === 'combined' ? [8, 15] : [12, 20];
    const rir = experience === 'beginner' ? 3 :
                experience === 'experienced' ? 2 : 1;

    let sessions = [];
    if (days <= 3) {
        sessions = [
            { name: "Full Body A", exercises: getExercises(["Chest","Back","Legs"], 5, repRange, rir) },
            { name: "Full Body B", exercises: getExercises(["Shoulders","Arms","Glutes"], 5, repRange, rir) },
            { name: "Full Body C", exercises: getExercises(["Chest","Back","Legs"], 5, repRange, rir) }
        ];
    } else if (days === 4) {
        sessions = [
            { name: "Upper A", exercises: getExercises(["Chest","Back","Shoulders"], 5, repRange, rir) },
            { name: "Lower A", exercises: getExercises(["Quads","Hamstrings","Glutes"], 5, repRange, rir) },
            { name: "Upper B", exercises: getExercises(["Chest","Back","Arms"], 5, repRange, rir) },
            { name: "Lower B", exercises: getExercises(["Quads","Hamstrings","Glutes"], 5, repRange, rir) }
        ];
    } else {
        sessions = [
            { name: "Push", exercises: getExercises(["Chest","Shoulders","Triceps"], 6, repRange, rir) },
            { name: "Pull", exercises: getExercises(["Back","Biceps"], 6, repRange, rir) },
            { name: "Legs", exercises: getExercises(["Quads","Hamstrings","Glutes"], 6, repRange, rir) },
            { name: "Push 2", exercises: getExercises(["Chest","Shoulders","Triceps"], 6, repRange, rir) },
            { name: "Pull 2", exercises: getExercises(["Back","Biceps"], 6, rep