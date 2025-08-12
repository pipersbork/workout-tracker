import { handleAuthentication, loadExercises } from './firebaseService.js';
import { initEventListeners } from './eventHandlers.js';
import { applyTheme, showView, showModal, toggleOfflineToast } from './ui.js';
import { state } from './state.js';

/**
 * @file main.js is the entry point for the application.
 * It initializes event listeners, handles the authentication flow, and registers the service worker.
 */

// --- GLOBAL ERROR HANDLER (Error Boundary) ---
window.onerror = function(message, source, lineno, colno, error) {
    console.error("A global error was caught:", { message, source, lineno, colno, error });
    // Display a user-friendly modal instead of crashing
    showModal(
        'An Unexpected Error Occurred',
        'Sorry, something went wrong. Please refresh the page. If the problem persists, please contact support.',
        [{ text: 'Refresh', class: 'cta-button', action: () => window.location.reload() }]
    );
    // Return true to prevent the default browser error handling (e.g., logging to console)
    return true;
};


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

    // Add online/offline event listeners
    window.addEventListener('online', () => toggleOfflineToast(false));
    window.addEventListener('offline', () => toggleOfflineToast(true));
    toggleOfflineToast(!navigator.onLine);


    // Load static exercise data from JSON file
    await loadExercises();

    // Start the authentication process. The callback function will be executed
    // once the user is authenticated and their data has been loaded.
    handleAuthentication(() => {
        // Apply the user's saved theme (or default)
        applyTheme();
        
        // Determine the initial view based on onboarding status and whether a workout is in progress.
        let initialView = 'onboarding';
        if (state.userSelections.onboardingCompleted) {
            initialView = state.workoutTimer.isWorkoutInProgress ? 'workout' : 'home';
        }
        showView(initialView, true);
    });
});
