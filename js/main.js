import { handleAuthentication, loadExercises } from './firebaseService.js';
import { initEventListeners } from './eventHandlers.js';
import { applyTheme, showView, renderOnboardingStep, cacheDOMElements } from './ui.js';
import { state } from './state.js';

/**
 * @file main.js is the entry point for the application.
 * It initializes everything in the correct order.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. INITIALIZE UI ---
    // First, cache all DOM elements so the UI functions know what to work with.
    // This is the critical step that fixes the blank screen.
    cacheDOMElements();

    // --- 2. INITIALIZE EVENTS ---
    // Now that the UI is ready, attach all event listeners.
    initEventListeners();

    // --- 3. LOAD STATIC DATA ---
    // Load non-user-specific data like the exercise list.
    await loadExercises();

    // --- 4. AUTHENTICATE AND LOAD USER DATA ---
    // Handle user sign-in and load their specific data (or create a new profile).
    // The callback function will run once the user is authenticated and their data is loaded.
    handleAuthentication(() => {
        // Apply the user's saved theme (or default)
        applyTheme();

        // --- 5. RENDER THE CORRECT VIEW ---
        // Finally, now that all data is loaded, show the correct screen.
        if (state.userSelections.onboardingCompleted) {
             showView('home', true);
        } else {
            showView('onboarding', true);
        }
    });

    // Register the service worker for offline functionality
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
});
