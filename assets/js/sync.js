const API_URL = "https://script.google.com/macros/s/YOUR_GOOGLE_APPS_SCRIPT_URL/exec";

// Sync user preferences to Google Sheets
async function syncPreferencesToGoogleSheet(preferences) {
  try {
    const response = await fetch(API_URL + "?action=savePreferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences)
    });

    if (!response.ok) throw new Error("Failed to sync preferences");
    return true;
  } catch (error) {
    console.warn("Preferences sync failed. Retrying later.");
    // Optionally: Add retry queue logic
    return false;
  }
}

// Sync workout to Google Sheets
async function syncWorkoutToGoogleSheet(workout) {
  try {
    const response = await fetch(API_URL + "?action=saveWorkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workout)
    });

    if (!response.ok) throw new Error("Failed to sync workout");
    return true;
  } catch (error) {
    console.warn("Workout sync failed. Will retry later.");
    return false;
  }
}

// Retry sync when online
window.addEventListener("online", async () => {
  console.log("✅ Back online. Retrying sync...");
  const workouts = await getAllWorkoutsFromDB();
  for (let workout of workouts) {
    await syncWorkoutToGoogleSheet(workout);
  }
});
