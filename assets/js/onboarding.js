let preferences = {
  goal: null,
  experience: null,
  equipment: null,
  frequency: null,
  includeCardio: false,
  cardioType: null,
  cardioSessions: 0
};

function markSelected(button) {
  button.parentElement.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
  button.classList.add("selected");
}

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
  completeOnboarding();
}));

async function completeOnboarding() {
  try {
    showLoading("Saving your preferences...");
    await savePreferencesToDB(preferences);
    await syncPreferencesToGoogleSheet(preferences);
    showSuccess("Preferences saved! Redirecting...");
    setTimeout(() => {
      document.getElementById("onboarding").style.display = "none";
      document.getElementById("app-content").style.display = "block";
      document.getElementById("bottom-nav").style.display = "flex";
      hideLoading();
    }, 1500);
  } catch (error) {
    hideLoading();
    alert("Could not sync now. Your preferences are saved locally.");
  }
}

// Loading indicator
function showLoading(message) {
  let loader = document.createElement("div");
  loader.id = "loading-overlay";
  loader.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.8); color: white; display: flex;
    justify-content: center; align-items: center; font-size: 1.2rem; z-index: 9999;
  `;
  loader.innerText = message;
  document.body.appendChild(loader);
}

function hideLoading() {
  let loader = document.getElementById("loading-overlay");
  if (loader) loader.remove();
}

function showSuccess(message) {
  let success = document.createElement("div");
  success.style.cssText = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: #ff6600; color: black; padding: 10px 20px; border-radius: 8px; font-weight: bold;
  `;
  success.innerText = message;
  document.body.appendChild(success);
  setTimeout(() => success.remove(), 2000);
}
