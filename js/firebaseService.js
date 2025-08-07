import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';
import { showModal } from './ui.js';

/**
 * @file firebaseService.js handles all interactions with Firebase,
 * including authentication and Firestore database operations.
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

/**
 * Handles the authentication state changes for the user.
 * If a user is logged in, it loads their data. Otherwise, it signs them in anonymously.
 * @param {Function} onAuthenticated - A callback function to run after the user is authenticated and data is loaded.
 */
export function handleAuthentication(onAuthenticated) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in.
            state.userId = user.uid;
            await loadStateFromFirestore();
            if (onAuthenticated) {
                onAuthenticated();
            }
        } else {
            // User is signed out. Sign in anonymously.
            signInAnonymously(auth).catch((error) => {
                console.error("Anonymous sign-in failed:", error);
                showModal('Authentication Error', 'Could not sign in. Please check your connection and try again.');
            });
        }
    });
}

/**
 * Loads the user's saved state from Firestore.
 * If no state is found, it initializes a default state.
 */
export async function loadStateFromFirestore() {
    if (!state.userId) return;
    const userDocRef = doc(db, "users", state.userId);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Merge fetched data with the default state to prevent errors if some fields are missing
            state.userSelections = { ...state.userSelections, ...data.userSelections };
            state.settings = { ...state.settings, ...data.settings };
            state.allPlans = data.allPlans || [];
            state.activePlanId = data.activePlanId || (state.allPlans.length > 0 ? state.allPlans[0].id : null);
            state.currentView = data.currentView || state.currentView;
        } else {
            // No document found, so this is a new user.
            // The default state in state.js already has onboardingCompleted: false,
            // so we just need to save that initial state.
            await saveStateToFirestore();
        }
        state.isDataLoaded = true;
    } catch (error) {
        console.error("Error loading state from Firestore:", error);
        showModal('Error', 'Could not load your saved data. Please refresh the page.');
    }
}

/**
 * Saves the current application state to Firestore.
 */
export async function saveStateToFirestore() {
    if (!state.userId) return;
    const userDocRef = doc(db, "users", state.userId);
    const dataToSave = {
        userSelections: state.userSelections,
        settings: state.settings,
        allPlans: state.allPlans,
        activePlanId: state.activePlanId,
        currentView: state.currentView
    };
    try {
        await setDoc(userDocRef, dataToSave);
    } catch (error) {
        console.error("Error saving state to Firestore:", error);
        showModal('Error', 'Could not save your progress. Please check your connection.');
    }
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
