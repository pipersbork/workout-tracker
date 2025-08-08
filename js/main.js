import { handleAuthentication, loadExercises } from './firebaseService.js';
import { initEventListeners } from './eventHandlers.js';
import { applyTheme, showView } from './ui.js';

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

        // Show the initial view. The showView function already contains the logic
        // to automatically redirect to 'onboarding' if the user hasn't completed it yet.
        // We pass 'true' to skip the initial fade-in animation on load.
        showView('home', true);
    });
});
