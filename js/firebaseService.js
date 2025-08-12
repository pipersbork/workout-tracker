import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';
import { showModal } from './ui.js';

/**
 * @file firebaseService.js handles all interactions with Firebase,
 * including authentication and Firestore database operations, with a robust "cloud-first" approach.
 */

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDSInOWrqR-AF2V8tv3vXIelnMCWROXKww",
  authDomain: "progression-700a3.firebaseapp.com",
  projectId: "progression-700a3",
  storageBucket: "progression-700a3.firebasestorage.app",
  messagingSenderId: "525938060953",
  appId: "1:525938060953:web:e453db795cd89aabc15208"
};

// --- FIREBASE INITIALIZATION ---
const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// --- LOCAL STORAGE KEY ---
const LOCAL_STORAGE_KEY = 'progressionAppState';

/**
 * Creates the complete, default state object for a new user.
 * This ensures any new user document is valid according to Firestore rules.
 * @returns {object} A complete user data object.
 */
function createDefaultUserData() {
    return {
        userSelections: {
            goal: 'hypertrophy',
            trainingAge: 'beginner',
            daysPerWeek: 4,
            dietaryStatus: 'maintenance',
            style: 'gym',
            onboardingCompleted: false,
        },
        settings: {
            units: 'lbs',
            theme: 'dark',
            progressionModel: 'double',
            weightIncrement: 5,
            restDuration: 90,
            haptics: true,
        },
        allPlans: [],
        activePlanId: null,
        workoutHistory: [],
        personalRecords: [],
        savedTemplates: [],
        currentView: { week: 1, day: 1 },
        isWorkoutInProgress: false,
    };
}

/**
 * Applies loaded data (from Firestore or local storage) to the global state.
 * @param {object} data - The user data to apply.
 */
function applyDataToState(data) {
    if (!data) return;
    
    state.userSelections = { ...state.userSelections, ...data.userSelections };
    state.settings = { ...state.settings, ...data.settings };
    state.allPlans = data.allPlans || [];
    state.savedTemplates = data.savedTemplates || [];
    state.activePlanId = data.activePlanId || (state.allPlans.length > 0 ? state.allPlans[0].id : null);
    state.currentView = data.currentView || state.currentView;
    state.workoutHistory = data.workoutHistory || [];
    state.personalRecords = data.personalRecords || [];
    state.workoutTimer.isWorkoutInProgress = data.isWorkoutInProgress || false;
}

/**
 * Saves the entire application state to both Firestore and local storage.
 * This function ensures data consistency across the cloud and the local device.
 */
export async function saveFullState() {
    if (!state.userId) return;

    const dataToSave = {
        userSelections: state.userSelections,
        settings: state.settings,
        allPlans: state.allPlans,
        savedTemplates: state.savedTemplates,
        activePlanId: state.activePlanId,
        currentView: state.currentView,
        workoutHistory: state.workoutHistory,
        personalRecords: state.personalRecords,
        isWorkoutInProgress: state.workoutTimer.isWorkoutInProgress,
    };

    // Save to Firestore first as the source of truth.
    try {
        const userDocRef = doc(db, "users", state.userId);
        await setDoc(userDocRef, dataToSave, { merge: true }); // Merge ensures we don't overwrite with partial data
    } catch (error) {
        console.error("Error saving full state to Firestore:", error);
        showModal('Sync Error', 'Could not save your data to the cloud. You may be offline.', [{ text: 'OK', class: 'cta-button' }]);
    }

    // Then, update local storage for offline access.
    try {
        const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        localData[state.userId] = dataToSave;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
    } catch (error) {
        console.error("Error saving full state to localStorage:", error);
    }
}

/**
 * Updates a specific top-level field in the state, Firestore, and local storage.
 * @param {string} key - The top-level key in the state object to update.
 * @param {*} value - The new value for the key.
 */
export async function updateState(key, value) {
    if (!state.userId) return;

    // 1. Update global state
    state[key] = value;

    // 2. Update local storage immediately for UI responsiveness
    try {
        const localDataString = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localDataString) {
            const allLocalData = JSON.parse(localDataString);
            if (allLocalData[state.userId]) {
                allLocalData[state.userId][key] = value;
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allLocalData));
            }
        }
    } catch (error) {
        console.error(`Error updating '${key}' in localStorage:`, error);
    }

    // 3. Update Firestore in the background
    try {
        const userDocRef = doc(db, "users", state.userId);
        await updateDoc(userDocRef, { [key]: value });
    } catch (error) {
        console.error(`Error updating '${key}' in Firestore:`, error);
        showModal('Offline Notice', 'Your changes are saved locally and will sync when you are back online.', [{ text: 'OK', class: 'cta-button' }]);
    }
}

/**
 * The core data loading function with a "cloud-first" strategy.
 * It ensures a valid user document exists before the app UI loads.
 */
async function loadInitialState() {
    if (!state.userId) return;

    try {
        const userDocRef = doc(db, "users", state.userId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            // User exists, load their data from Firestore.
            const firestoreData = docSnap.data();
            applyDataToState(firestoreData);
            // Sync this latest data to local storage.
            const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            localData[state.userId] = firestoreData;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
        } else {
            // This is a new user. Create their document in Firestore.
            const defaultData = createDefaultUserData();
            await setDoc(userDocRef, defaultData);
            applyDataToState(defaultData);
             // Save the new user's default data to local storage.
            const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            localData[state.userId] = defaultData;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
        }
    } catch (error) {
        console.error("Critical error loading or creating user data in Firestore:", error);
        // If Firestore fails, try to fall back to local storage.
        try {
            const localDataString = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (localDataString) {
                const allLocalData = JSON.parse(localDataString);
                const userData = allLocalData[state.userId];
                if (userData) {
                    applyDataToState(userData);
                    showModal('Offline Mode', 'Could not connect to the cloud. Running in offline mode.', [{ text: 'OK', class: 'cta-button' }]);
                } else {
                     throw new Error("No local data found for this user.");
                }
            } else {
                throw new Error("No local storage data found.");
            }
        } catch (localError) {
             console.error("Fallback to local storage failed:", localError);
             // FINAL FIX: If both cloud and local fail, create a default state to prevent a crash.
             const defaultData = createDefaultUserData();
             applyDataToState(defaultData);
             showModal('Welcome!', 'Could not connect to the cloud. Starting with a fresh profile. Your data will sync when you are back online.', [{ text: 'OK', class: 'cta-button' }]);
        }
    }

    state.isDataLoaded = true;
}

/**
 * Handles the authentication state changes for the user.
 * @param {Function} onAuthenticated - A callback function to run after the user is authenticated and data is loaded.
 */
export function handleAuthentication(onAuthenticated) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            state.userId = user.uid;
            await loadInitialState();
            if (onAuthenticated && state.isDataLoaded) {
                onAuthenticated();
            }
        } else {
            signInAnonymously(auth).catch((error) => {
                console.error("Anonymous sign-in failed:", error);
                showModal('Authentication Error', 'Could not sign in. Please check your connection and try again.');
            });
        }
    });
}

/**
 * Loads the list of exercises from a local JSON file.
 */
export async function loadExercises() {
    try {
        const response = await fetch('exercises.json');
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        state.exercises = await response.json();
    } catch (error) {
        console.error("Failed to load exercises.json:", error);
        showModal(
            'Error Loading Data',
            'Could not load the necessary exercise data. The app may not function correctly. Please check your connection and refresh the page.',
            [{ text: 'OK', class: 'cta-button' }]
        );
    }
}
