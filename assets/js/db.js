const DB_NAME = "progression-app";
const DB_VERSION = 3; // Increment when schema changes
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;

            if (!db.objectStoreNames.contains("preferences")) {
                db.createObjectStore("preferences", { keyPath: "id" });
            }

            if (!db.objectStoreNames.contains("plan")) {
                db.createObjectStore("plan", { keyPath: "id" });
            }

            if (!db.objectStoreNames.contains("workouts")) {
                db.createObjectStore("workouts", { keyPath: "id", autoIncrement: true });
            }

            if (!db.objectStoreNames.contains("templates")) {
                db.createObjectStore("templates", { keyPath: "id", autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => reject(event.target.error);
    });
}

/* ---------------- PREFERENCES ---------------- */
async function savePreferencesToDB(preferences) {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("preferences", "readwrite");
        tx.objectStore("preferences").put({ id: "userPrefs", ...preferences });
        tx.oncomplete = resolve;
        tx.onerror = () => reject("Failed to save preferences");
    });
}

async function getPreferencesFromDB() {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("preferences", "readonly");
        const request = tx.objectStore("preferences").get("userPrefs");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to fetch preferences");
    });
}

/* ---------------- TRAINING PLAN ---------------- */
async function savePlanToDB(plan) {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("plan", "readwrite");
        tx.objectStore("plan").put({ id: "activePlan", ...plan });
        tx.oncomplete = resolve;
        tx.onerror = () => reject("Failed to save plan");
    });
}

async function getPlanFromDB() {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("plan", "readonly");
        const request = tx.objectStore("plan").get("activePlan");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to fetch plan");
    });
}

/* ---------------- WORKOUT LOGS ---------------- */
async function saveWorkoutToDB(workout) {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("workouts", "readwrite");
        tx.objectStore("workouts").add(workout);
        tx.oncomplete = resolve;
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

/* ---------------- TEMPLATES ---------------- */
async function saveTemplateToDB(template) {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("templates", "readwrite");
        tx.objectStore("templates").add(template);
        tx.oncomplete = resolve;
        tx.onerror = () => reject("Failed to save template");
    });
}

async function getAllTemplatesFromDB() {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("templates", "readonly");
        const request = tx.objectStore("templates").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to fetch templates");
    });
}
