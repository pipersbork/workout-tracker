import { handleAuthentication, loadExercises } from './firebaseService.js';
import { initEventListeners } from './eventHandlers.js';
import { applyTheme, showView } from './ui.js';
import { state } from './state.js';

/**
 * @file main.js is the entry point for the application.
 * It initializes event listeners, handles the authentication flow, and registers the service worker.
 */

document.addEventListener('DOMContentLoaded', async () => {
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

    // Initialize event listeners for the entire application
    initEventListeners();

    // Load static exercise data from JSON file
    await loadExercises();

    // Start the authentication process. The callback function will be executed
    // once the user is authenticated and their data has been loaded.
    handleAuthentication(() => {
        // Apply the user's saved theme (or default)
        applyTheme();

        // Explicitly determine the starting view based on onboarding status.
        // This prevents skipping the onboarding flow for new or reset users.
        const initialView = state.userSelections.onboardingCompleted ? 'home' : 'onboarding';
        showView(initialView, true);
    });
});
