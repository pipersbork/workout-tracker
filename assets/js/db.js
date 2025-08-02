// db.js - IndexedDB setup for offline-first data
const DB_NAME = "workout-tracker";
const DB_VERSION = 1;
let db;

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
