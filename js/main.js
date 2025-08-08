import { handleAuthentication, loadExercises } from './firebaseService.js';
import { initEventListeners } from './eventHandlers.js';
import { applyTheme, showView, renderOnboardingStep } from './ui.js';
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

    // Show the onboarding screen immediately to prevent a blank page.
    // This provides a fast initial paint.
    if (!state.userSelections.onboardingCompleted) {
        showView('onboarding', true);
    } else {
        showView('home', true);
    }


    // Asynchronously load necessary data and handle user authentication.
    await loadExercises();

    // Start the authentication process. The callback will be executed
    // once the user is authenticated and their data has been loaded.
    handleAuthentication(() => {
        // Apply the user's saved theme (or default)
        applyTheme();

        // Once data is loaded, decide the correct view.
        // If onboarding is not complete, we stay there. If it is, we move to home.
        if (state.userSelections.onboardingCompleted) {
             showView('home', true);
        } else {
            // If the user is on a step other than 1 for some reason, re-render.
            renderOnboardingStep();
        }
    });
});
