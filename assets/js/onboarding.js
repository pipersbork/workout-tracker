let preferences = {
  goal: null,
  experience: null,
  equipment: null,
  frequency: null,
  includeCardio: false,
  cardioType: null,
  cardioSessions: 0
};

// Event listeners for onboarding buttons
document.querySelectorAll(".select-goal").forEach(btn => btn.addEventListener("click", () => {
  preferences.goal = btn.dataset.goal;
  markSelected(btn);
}));

document.querySelectorAll(".select-experience").forEach(btn => btn.addEventListener("click", () => {
  preferences.experience = btn.dataset.exp;
  markSelected(btn);
}));

document.querySelectorAll(".select-equipment").forEach(btn => btn.addEventListener("click", () => {
  preferences.equipment = btn.dataset.equip;
  markSelected(btn);
}));

document.querySelectorAll(".select-frequency").forEach(btn => btn.addEventListener("click", () => {
  preferences.frequency = btn.dataset.days;
  markSelected(btn);
}));

document.querySelectorAll(".select-cardio-toggle").forEach(btn => btn.addEventListener("click", () => {
  preferences.includeCardio = btn.dataset.cardio === "yes";
  document.getElementById("cardio-options").style.display = preferences.includeCardio ? "block" : "none";
  markSelected(btn);
}));

document.querySelectorAll(".select-cardio-type").forEach(btn => btn.addEventListener("click", () => {
  preferences.cardioType = btn.dataset.type;
  markSelected(btn);
}));

document.querySelectorAll(".select-cardio-frequency").forEach(btn => btn.addEventListener("click", () => {
  preferences.cardioSessions = parseInt(btn.dataset.cardiofreq);
  markSelected(btn);
  finishOnboarding();
}));

function markSelected(button) {
  button.parentElement.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
  button.classList.add("selected");
}

// Complete onboarding
async function finishOnboarding() {
  await savePreferencesToDB(preferences);
  await syncPreferencesToGoogleSheet(preferences);

  document.getElementById("onboarding").style.display = "none";
  document.getElementById("app-content").style.display = "block";
  document.getElementById("bottom-nav").style.display = "flex";
}
