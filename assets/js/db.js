// db.js
const DB_NAME = "progressionDB";
const DB_VERSION = 1;
let db;

// Open IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;

            // Workout history
            if (!db.objectStoreNames.contains("workouts")) {
                db.createObjectStore("workouts", { keyPath: "id", autoIncrement: true });
            }

            // Plans
            if (!db.objectStoreNames.contains("plans")) {
                db.createObjectStore("plans", { keyPath: "id" });
            }

            // Exercises
            if (!db.objectStoreNames.contains("exercises")) {
                db.createObjectStore("exercises", { keyPath: "id" });
            }
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onerror = () => reject(request.error);
    });
}

// Save generic
function saveData(storeName, data) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(data);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

// Get all from store
function getAllData(storeName) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// ✅ Seed Exercises
async function seedExercises() {
    const exercises = await getAllData("exercises");
    if (exercises.length > 0) {
        console.log("Exercises already seeded.");
        return;
    }

    const response = await fetch("./assets/data/exercises.json");
    const exerciseData = await response.json();

    const tx = db.transaction("exercises", "readwrite");
    const store = tx.objectStore("exercises");

    exerciseData.forEach(ex => store.put(ex));

    tx.oncomplete = () => console.log("Exercises seeded successfully!");
    tx.onerror = () => console.error("Error seeding exercises:", tx.error);
}

// Initialize DB and seed
async function initDB() {
    await openDB();
    await seedExercises();
}

initDB();

