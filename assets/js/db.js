const DB_NAME = "WorkoutTrackerDB";
const DB_VERSION = 1;
let db;

/**
 * Open IndexedDB
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      db = event.target.result;

      if (!db.objectStoreNames.contains("preferences")) {
        db.createObjectStore("preferences", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("workouts")) {
        db.createObjectStore("workouts", { autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject("Error opening database: " + event.target.errorCode);
    };
  });
}

/**
 * Save user preferences
 */
async function savePreferencesToDB(pref) {
  if (!db) await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("preferences", "readwrite");
    const store = tx.objectStore("preferences");
    store.put({ id: "userPrefs", ...pref });

    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

/**
 * Get user preferences
 */
async function getPreferences() {
  if (!db) await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("preferences", "readonly");
    const store = tx.objectStore("preferences");
    const request = store.get("userPrefs");

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = (e) => reject(e);
  });
}

/**
 * Save workout session
 */
async function saveWorkoutToDB(workout) {
  if (!db) await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workouts", "readwrite");
    const store = tx.objectStore("workouts");
    store.add(workout);

    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

/**
 * Get all workout history
 */
async function getWorkoutHistory() {
  if (!db) await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workouts", "readonly");
    const store = tx.objectStore("workouts");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (e) => reject(e);
  });
}
