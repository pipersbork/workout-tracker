// db.js - IndexedDB setup for offline-first data
const DB_NAME = "workout-tracker";
const DB_VERSION = 1;
let db;
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzxomn7b3HhL_Fjm2gXFxvRvo0cz4CI4ym2ETb2oL37kp1qgxJYzo0hbSmsEv4SYw9Cog/exec";

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains("preferences")) {
        db.createObjectStore("preferences", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("workouts")) {
        db.createObjectStore("workouts", { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => reject(event.target.error);
  });
}

// Save user preferences locally
async function savePreferencesToDB(preferences) {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("preferences", "readwrite");
    tx.objectStore("preferences").put({ id: 1, ...preferences });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject("Failed to save preferences locally");
  });
}

// Get preferences
async function getPreferencesFromDB() {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("preferences", "readonly");
    const request = tx.objectStore("preferences").get(1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Failed to load preferences");
  });
}

// Save workout locally
async function saveWorkoutToDB(workout) {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workouts", "readwrite");
    tx.objectStore("workouts").add(workout);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject("Failed to save workout locally");
  });
}

// Get all workouts
async function getAllWorkoutsFromDB() {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workouts", "readonly");
    const store = tx.objectStore("workouts");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Failed to fetch workouts");
  });
}

/* ✅ SYNC LOGIC */

// Sync Preferences to Google Sheet
async function syncPreferences() {
  const prefs = await getPreferencesFromDB();
  if (!prefs) return;

  return fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "onboarding",
      data: prefs
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log("Preferences synced:", data);
  })
  .catch(err => console.error("Sync error:", err));
}

// Sync Workouts to Google Sheet
async function syncWorkouts() {
  const workouts = await getAllWorkoutsFromDB();
  if (!workouts || workouts.length === 0) return;

  return fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "syncWorkouts",
      token: localStorage.getItem("googleToken"),
      workouts
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log("Workouts synced:", data);

    // Clear after successful sync
    const tx = db.transaction("workouts", "readwrite");
    tx.objectStore("workouts").clear();
  })
  .catch(err => console.error("Sync error:", err));
}

// Auto sync when online
window.addEventListener("online", () => {
  syncPreferences();
  syncWorkouts();
});
