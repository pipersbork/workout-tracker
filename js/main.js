import { handleAuthentication, loadExercises } from './firebaseService.js';
import { initEventListeners } from './eventHandlers.js';
import { applyTheme, showView } from './ui.js';

/**
 * @file main.js is the entry point for the application.
 * It initializes event listeners and handles the authentication flow.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize event listeners for the entire application
    initEventListeners();

    // Load static exercise data from JSON file
    await loadExercises();

    // Start the authentication process. The callback function will be executed
    // once the user is authenticated and their data has been loaded.
    handleAuthentication(() => {
        // Apply the user's saved theme (or default)
        applyTheme();

        // Get the splash screen progress bar element
        const splashProgressBar = document.querySelector('#step1 .progress');

        // Define the function to transition from the splash screen to the home screen
        const transitionFromSplash = () => {
            showView('home');
        };

        // Show the initial onboarding/splash screen view without animation
        showView('onboarding', true);

        // Animate the progress bar on the splash screen
        requestAnimationFrame(() => {
            setTimeout(() => {
                if (splashProgressBar) {
                    splashProgressBar.style.width = '100%';
                    // When the progress bar animation ends, transition to the home screen
                    splashProgressBar.addEventListener('transitionend', transitionFromSplash, { once: true });
                } else {
                    // Fallback if the progress bar isn't found
                    setTimeout(transitionFromSplash, 1200);
                }
            }, 100); // A short delay to ensure the view is rendered
        });
    });
});
