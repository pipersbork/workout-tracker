/* ----------------------------
   IndexedDB Setup
----------------------------- */
const DB_NAME = "workout-tracker";
const DB_VERSION = 2; // Bumped version for new "plan" store
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
            if (!db.objectStoreNames.contains("plan")) {
                db.createObjectStore("plan", { keyPath: "id", autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => reject(event.target.error);
    });
}

/* ----------------------------
   Preferences
----------------------------- */
async function savePreferencesToDB(preferences) {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("preferences", "readwrite");
        tx.objectStore("preferences").put({ id: 1, ...preferences });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject("Failed to save preferences");
    });
}

async function getPreferencesFromDB() {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("preferences", "readonly");
        const request = tx.objectStore("preferences").get(1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to load preferences");
    });
}

/* ----------------------------
   Workouts
----------------------------- */
async function saveWorkoutToDB(workout) {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("workouts", "readwrite");
        tx.objectStore("workouts").add(workout);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject("Failed to save workout");
    });
}

async function getAllWorkoutsFromDB() {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("workouts", "readonly");
        const request = tx.objectStore("workouts").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to fetch workouts");
    });
}

/* ----------------------------
   Plan
----------------------------- */
async function savePlanToDB(plan) {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("plan", "readwrite");
        const store = tx.objectStore("plan");
        store.clear(); // Keep only latest plan
        store.add({ id: 1, ...plan });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject("Failed to save plan");
    });
}

async function getPlanFromDB() {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("plan", "readonly");
        const request = tx.objectStore("plan").get(1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to fetch plan");
    });
}

/* ----------------------------
   Clear All Data (Optional)
----------------------------- */
async function clearAllData() {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(["preferences", "workouts", "plan"], "readwrite");
        tx.objectStore("preferences").clear();
        tx.objectStore("workouts").clear();
        tx.objectStore("plan").clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject("Failed to clear data");
    });
}
