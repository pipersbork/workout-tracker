import { handleAuthentication, loadExercises } from './firebaseService.js';
import { initEventListeners } from './eventHandlers.js';
import { applyTheme, showView, initEventListeners as initUIEventListeners } from './ui.js';

/**
 * @file main.js is the entry point for the application.
 * It initializes event listeners and handles the authentication flow.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize event listeners for the entire application
    initEventListeners();       // from eventHandlers.js
    initUIEventListeners();     // from ui.js — needed for Get Started button

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
