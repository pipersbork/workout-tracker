let GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzxomn7b3HhL_Fjm2gXFxvRvo0cz4CI4ym2ETb2oL37kp1qgxJYzo0hbSmsEv4SYw9Cog/exec";

/**
 * Sync user preferences to Google Sheets
 */
async function syncPreferencesToGoogleSheet(preferences) {
  return await sendDataToGoogleSheets({ type: "preferences", payload: preferences });
}

/**
 * Sync workout data
 */
async function syncWorkoutToGoogleSheet(workout) {
  return await sendDataToGoogleSheets({ type: "workout", payload: workout });
}

/**
 * Generic POST to Google Apps Script
 */
async function sendDataToGoogleSheets(data) {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    console.error("Sync failed:", error);
    return { success: false, error: error.message };
  }
}
