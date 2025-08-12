import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';
import { showModal } from './ui.js';

/**
 * @file firebaseService.js handles all interactions with Firebase,
 * including authentication and Firestore database operations, with an offline-first approach.
 */

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  // NOTE: This API key is intentionally hardcoded to make the app work in the local environment without a build tool.
  // The Firebase security rules still protect the data from unauthorized access.
  apiKey: "AIzaSyDSInOWrqR-AF2V8tv3vXIelnMCWROXKww",
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
 * Saves the entire application state. Used for initial setup and major syncs.
 * For individual changes, use updateState for better performance.
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

    // Save to localStorage for offline access
    try {
        const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        localData[state.userId] = dataToSave;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
    } catch (error) {
        console.error("Error saving full state to localStorage:", error);
    }

    // Save to Firestore for cloud backup
    try {
        const userDocRef = doc(db, "users", state.userId);
        await setDoc(userDocRef, dataToSave);
        return true;
    } catch (error) {
        console.error("Error saving full state to Firestore:", error);
        showModal('Sync Error', 'Could not save your data to the cloud. You may be offline or have a permissions issue.', [{ text: 'OK', class: 'cta-button' }]);
        return false;
    }
}

/**
 * Updates a specific field in the Firestore document and localStorage.
 * This is much more efficient than saving the entire state for small changes.
 * @param {string} key - The top-level key in the state object to update (e.g., 'settings').
 * @param {*} value - The new value for the key.
 * @returns {Promise<boolean>} A promise that resolves to true if the update was successful, false otherwise.
 */
export async function updateState(key, value) {
    if (!state.userId) return;

    // 1. Update localStorage immediately
    try {
        const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        if (localData[state.userId]) {
            localData[state.userId][key] = value;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
        }
    } catch (error) {
        console.error(`Error updating '${key}' in localStorage:`, error);
    }

    // 2. Update Firestore in the background
    try {
        const userDocRef = doc(db, "users", state.userId);
        await updateDoc(userDocRef, { [key]: value });
        return true;
    } catch (error) {
        console.error(`Error updating '${key}' in Firestore:`, error);
        showModal('Sync Error', `Could not update your settings. You may be offline or have a permissions issue.`, [{ text: 'OK', class: 'cta-button' }]);
        return false;
    }
}


/**
 * Loads the application state, prioritizing local data for offline-first speed.
 * Falls back to Firestore if no local data is available.
 */
async function loadInitialState() {
    if (!state.userId) return;

    let dataLoaded = false;

    // 1. Try to load from localStorage first
    try {
        const localDataString = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localDataString) {
            const allLocalData = JSON.parse(localDataString);
            const userData = allLocalData[state.userId];
            if (userData) {
                state.userSelections = { ...state.userSelections, ...userData.userSelections };
                state.settings = { ...state.settings, ...userData.settings };
                state.allPlans = userData.allPlans || [];
                state.savedTemplates = userData.savedTemplates || [];
                state.activePlanId = userData.activePlanId || (state.allPlans.length > 0 ? state.allPlans[0].id : null);
                state.currentView = userData.currentView || state.currentView;
                state.workoutHistory = userData.workoutHistory || [];
                state.personalRecords = userData.personalRecords || [];
                state.workoutTimer.isWorkoutInProgress = userData.isWorkoutInProgress || false;
                await saveFullState();
            }
        }
    } catch (error) {
        console.error("Error loading state from localStorage:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }

    // 2. If no local data, try loading from Firestore
    if (!dataLoaded) {
        const userDocRef = doc(db, "users", state.userId);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                state.userSelections = { ...state.userSelections, ...data.userSelections };
                state.settings = { ...state.settings, ...data.settings };
                state.allPlans = data.allPlans || [];
                state.savedTemplates = data.savedTemplates || [];
                state.activePlanId = data.activePlanId || (state.allPlans.length > 0 ? state.allPlans[0].id : null);
                state.currentView = data.currentView || state.currentView;
                state.workoutHistory = data.workoutHistory || [];
                state.personalRecords = data.personalRecords || [];
                state.workoutTimer.isWorkoutInProgress = data.isWorkoutInProgress || false;
                await saveFullState();
            } else {
                await saveFullState();
            }
        } catch (error) {
            console.error("Error loading state from Firestore:", error);
            showModal('Data Load Error', 'Could not load your saved data. Please check your connection and refresh the page.', [{ text: 'Refresh', class: 'cta-button', action: () => window.location.reload() }]);
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
            if (onAuthenticated) {
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
