// --- FIREBASE SDK IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- MODULE IMPORTS ---
import { state, elements, viewMap } from './state.js';
import { planGenerator } from './planGenerator.js';

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
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const app = {
    state,
    elements,
    viewMap,
    planGenerator,

    async init() {
        await this.loadExercises();
        this.addEventListeners();
        this.handleAuthentication();
    },

    handleAuthentication() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.state.userId = user.uid;
                await this.loadStateFromFirestore();
                this.applyTheme();
    
                const splashProgressBar = document.querySelector('#step1 .progress');
    
                const transitionFromSplash = () => {
                    this.showView('home');
                };
    
                this.showView('onboarding', true); 
    
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (splashProgressBar) {
                            splashProgressBar.style.width = '100%';
                            splashProgressBar.addEventListener('transitionend', transitionFromSplash, { once: true });
                        } else {
                            setTimeout(transitionFromSplash, 1200);
                        }
                    }, 100);
                });
    
            } else {
                signInAnonymously(auth).catch((error) => console.error("Anonymous sign-in failed:", error));
            }
        });
    },

    async loadExercises() {
        try {
            const response = await fetch('exercises.json');
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            this.state.exercises = await response.json();
        } catch (error) {
            console.error("Failed to load exercises.json:", error);
            this.showModal(
                'Error Loading Data',
                'Could not load the necessary exercise data. Please check your connection and refresh the page.',
                [{ text: 'OK', class: 'cta-button' }]
            );
        }
    },

    async loadStateFromFirestore() {
        if (!this.state.userId) return;
        const userDocRef = doc(db, "users", this.state.userId);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                this.state.userSelections = data.userSelections || this.state.userSelections;
                this.state.settings = data.settings || this.state.settings;
                this.state.allPlans = data.allPlans || [];
                this.state.activePlanId = data.activePlanId || (this.state.allPlans.length > 0 ? this.state.allPlans[0].id : null);
                this.state.currentView = data.currentView || this.state.currentView;
            } else {
                this.state.userSelections.onboardingCompleted = true;
                await this.saveStateToFirestore();
            }
            this.state.isDataLoaded = true;
        } catch (error) {
            console.error("Error loading state from Firestore:", error);
        }
    },

    async saveStateToFirestore() {
        if (!this.state.userId) return;
        const userDocRef = doc(db, "users", this.state.userId);
        const dataToSave = {
            userSelections: this.state.userSelections,
            settings: this.state.settings,
            allPlans: this.state.allPlans,
            activePlanId: this.state.activePlanId,
            currentView: this.state.currentView
        };
        try {
            await setDoc(userDocRef, dataToSave);
        } catch (error) {
            console.error("Error saving state to Firestore:", error);
        }
    },

    addEventListeners() {
        // ... (This function will be moved to its own file in a later step)
    },

    // ... All other functions from your original file will go here
    // For now, I'm leaving this blank so you can copy them in.
    // In the next step, we will create ui.js and move them there.
};

// Bind all methods to the main app object
for (const key in app) {
    if (typeof app[key] === 'function') {
        app[key] = app[key].bind(app);
    }
}
for (const key in app.customPlanWizard) {
    if (typeof app.customPlanWizard[key] === 'function') {
        app.customPlanWizard[key] = app.customPlanWizard[key].bind(app.customPlanWizard);
    }
}

app.init();
