/* ===========================
   IndexedDB for Offline Storage
=========================== */

const DB_NAME = "progressionDB";
const DB_VERSION = 1;
let db;

// Open or create database
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = function (event) {
    db = event.target.result;

    if (!db.objectStoreNames.contains("workouts")) {
        db.createObjectStore("workouts", { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = function (event) {
    db = event.target.result;
    console.log("✅ IndexedDB initialized:", DB_NAME);
};

request.onerror = function (event) {
    console.error("❌ IndexedDB error:", event.target.error);
};

/* ===========================
   SAVE WORKOUT TO DB
=========================== */
function saveWorkoutToDB(workout) {
    const tx = db.transaction("workouts", "readwrite");
    const store = tx.objectStore("workouts");
    store.add(workout);

    tx.oncomplete = () => console.log("✅ Workout saved:", workout);
    tx.onerror = () => console.error("❌ Error saving workout");
}

/* ===========================
   GET ALL WORKOUTS
=========================== */
function getAllWorkoutsFromDB() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("workouts", "readonly");
        const store = tx.objectStore("workouts");
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/* ===========================
   CLEAR ALL WORKOUTS (for testing)
=========================== */
function clearAllWorkouts() {
    const tx = db.transaction("workouts", "readwrite");
    const store = tx.objectStore("workouts");
    store.clear();

    tx.oncomplete = () => console.log("✅ All workouts cleared");
}