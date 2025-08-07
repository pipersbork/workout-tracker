/**
 * @file state.js holds the single source of truth for the application's state.
 * All dynamic data, user selections, and settings are stored here.
 * This makes it easy to see what data the application is working with at any time.
 */

export const state = {
    // User and Authentication State
    userId: null,
    isDataLoaded: false,

    // Onboarding and User Preferences
    userSelections: {
        goal: 'muscle',
        experience: 'beginner',
        style: 'gym',
        onboardingCompleted: false
    },

    // App-wide Settings
    settings: {
        units: 'lbs',
        theme: 'dark',
        progressionModel: 'double',
        weightIncrement: 5
    },

    // Workout Plans and Progress
    allPlans: [],
    activePlanId: null,
    editingPlanId: null,
    currentView: {
        week: 1,
        day: 1
    },

    // UI and View State
    currentViewName: 'onboarding',

    // Temporary state for building a new plan
    builderPlan: {
        days: []
    },

    // Static Data Loaded from JSON
    exercises: [],

    // Chart.js instances for the performance summary
    progressChart: null,
    volumeChart: null,

    // NEW: Rest Timer State
    restTimer: {
        instance: null,      // Will hold the setInterval ID
        remaining: 180,      // Remaining time in seconds
        defaultTime: 180     // Default rest period
    }
};
