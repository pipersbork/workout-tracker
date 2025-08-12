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
 * Saves the entire application state. This is now primarily used for creating
 * a new user's document or for major sync events like completing a workout.
 */
export async function saveFullState() {
    if (!state.userId) return;

    // This object represents the complete, valid data structure for a user.
    // It matches the firestore.rules validation.
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

    // Save to localStorage for immediate offline access
    try {
        const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        localData[state.userId] = dataToSave;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
    } catch (error) {
        console.error("Error saving full state to localStorage:", error);
    }

    // Save to Firestore for cloud backup. Using setDoc with { merge: true }
    // is safer as it creates the doc if it doesn't exist, or merges/updates if it does.
    try {
        const userDocRef = doc(db, "users", state.userId);
        await setDoc(userDocRef, dataToSave, { merge: true });
    } catch (error) {
        console.error("Error saving full state to Firestore:", error);
        showModal('Sync Error', 'Could not save your data to the cloud. You may be offline or have a permissions issue.', [{ text: 'OK', class: 'cta-button' }]);
    }
}

/**
 * Updates a specific top-level field in the Firestore document and localStorage.
 * This is the preferred method for saving small changes (e.g., updating a setting).
 * @param {string} key - The top-level key in the state object to update (e.g., 'settings').
 * @param {*} value - The new value for the key.
 */
export async function updateState(key, value) {
    if (!state.userId) return;

    // 1. Update localStorage immediately for a snappy UI response.
    try {
        const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        if (localData[state.userId]) {
            localData[state.userId][key] = value;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
        } else {
            // If for some reason there's no local data, we should create it.
            await saveFullState();
        }
    } catch (error) {
        console.error(`Error updating '${key}' in localStorage:`, error);
    }

    // 2. Update Firestore in the background.
    try {
        const userDocRef = doc(db, "users", state.userId);
        await updateDoc(userDocRef, { [key]: value });
    } catch (error)
    {
        console.error(`Error updating '${key}' in Firestore:`, error);
        // This could happen if the user is offline. The local state is saved,
        // and the app will sync next time it loads with a connection.
        // We can choose to notify the user or handle it silently.
        showModal('Offline Notice', `Your changes have been saved locally and will sync with the cloud when you're back online.`, [{ text: 'OK', class: 'cta-button' }]);
    }
}


/**
 * Loads the application state, prioritizing local data for offline-first speed.
 * It then fetches from Firestore to ensure data is up-to-date.
 */
async function loadInitialState() {
    if (!state.userId) return;

    let localDataFound = false;

    // 1. Try to load from localStorage first for instant startup.
    try {
        const localDataString = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localDataString) {
            const allLocalData = JSON.parse(localDataString);
            const userData = allLocalData[state.userId];
            if (userData) {
                // Apply the local data to the state
                Object.assign(state, {
                    userSelections: { ...state.userSelections, ...userData.userSelections },
                    settings: { ...state.settings, ...userData.settings },
                    allPlans: userData.allPlans || [],
                    savedTemplates: userData.savedTemplates || [],
                    activePlanId: userData.activePlanId || null,
                    currentView: userData.currentView || state.currentView,
                    workoutHistory: userData.workoutHistory || [],
                    personalRecords: userData.personalRecords || [],
                });
                state.workoutTimer.isWorkoutInProgress = userData.isWorkoutInProgress || false;
                localDataFound = true;
            }
        }
    } catch (error) {
        console.error("Error loading state from localStorage:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
    }

    // 2. Fetch from Firestore to get the most up-to-date version.
    try {
        const userDocRef = doc(db, "users", state.userId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const firestoreData = docSnap.data();
            // Here, you could implement a merge strategy if needed, but for now,
            // we'll assume Firestore is the source of truth and update the state.
            Object.assign(state, {
                userSelections: { ...state.userSelections, ...firestoreData.userSelections },
                settings: { ...state.settings, ...firestoreData.settings },
                allPlans: firestoreData.allPlans || [],
                savedTemplates: firestoreData.savedTemplates || [],
                activePlanId: firestoreData.activePlanId || null,
                currentView: firestoreData.currentView || state.currentView,
                workoutHistory: firestoreData.workoutHistory || [],
                personalRecords: firestoreData.personalRecords || [],
            });
            state.workoutTimer.isWorkoutInProgress = firestoreData.isWorkoutInProgress || false;
            
            // IMPORTANT: After getting the latest from Firestore, update local storage
            // to ensure it's in sync for the next offline startup.
            await saveFullState();

        } else if (!localDataFound) {
            // This is a brand new user with no local or remote data.
            // Save the initial default state to both Firestore and local storage.
            await saveFullState();
        }
    } catch (error) {
        console.error("Error loading state from Firestore:", error);
        // If Firestore fails, the app can still run on local data if it was found.
        if (!localDataFound) {
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
