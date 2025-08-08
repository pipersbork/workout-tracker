import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';
import { showModal } from './ui.js';

/**
 * @file firebaseService.js handles all interactions with Firebase,
 * including authentication and Firestore database operations, with an offline-first approach.
 */

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
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
 * Saves the essential parts of the application state to both localStorage and Firestore.
 * This enables offline functionality and cloud backup.
 */
export async function saveState() {
    if (!state.userId) return;

    const dataToSave = {
        userSelections: state.userSelections,
        settings: state.settings,
        allPlans: state.allPlans,
        savedTemplates: state.savedTemplates,
        activePlanId: state.activePlanId,
        currentView: state.currentView,
        workoutHistory: state.workoutHistory
    };

    // 1. Save to localStorage immediately for offline access
    try {
        const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        localData[state.userId] = dataToSave;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
    } catch (error) {
        console.error("Error saving state to localStorage:", error);
    }

    // 2. Save to Firestore for cloud backup. This happens in the background.
    try {
        const userDocRef = doc(db, "users", state.userId);
        await setDoc(userDocRef, dataToSave);
    } catch (error) {
        console.error("Error saving state to Firestore:", error);
        // You could optionally notify the user of a sync failure here
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
                dataLoaded = true;
            }
        }
    } catch (error) {
        console.error("Error loading state from localStorage:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
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
                // Save the fetched data back to local storage for next time
                await saveState();
            } else {
                // This is a new user. Save the default state.
                await saveState();
            }
        } catch (error) {
            console.error("Error loading state from Firestore:", error);
            showModal('Error', 'Could not load your saved data. Please refresh the page.');
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
