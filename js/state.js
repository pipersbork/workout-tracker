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
        weightIncrement: 5,
        restDuration: 90, // Default rest duration in seconds
    },

    // Workout Plans and Progress
    allPlans: [],
    activePlanId: null,
    editingPlanId: null, // Holds the ID of the plan being edited
    currentView: {
        week: 1,
        day: 1
    },

    // User-Created Templates
    savedTemplates: [], // Stores plans saved as reusable templates

    // UI and View State
    currentViewName: 'onboarding',

    // Onboarding Wizard State
    onboarding: {
        currentStep: 1,
        totalSteps: 5,
    },

    // Temporary state for building a new plan
    builderPlan: {
        days: []
    },
    isPlanBuilderDirty: false, // Tracks if there are unsaved changes in the builder

    // Static Data Loaded from JSON
    exercises: [],

    // Chart.js instances for the performance summary
    progressChart: null,
    volumeChart: null,

    // Main Workout Stopwatch State
    workoutTimer: {
        instance: null,
        elapsed: 0,
        isRunning: false,
        startTime: 0,
    },

    // Rest Timer State
    restTimer: {
        instance: null,
        remaining: 0,
        isRunning: false,
    },

    // Temporary state for the workout summary screen
    workoutSummary: {
        suggestions: []
    },

    // Holds the chronological history of all completed workouts
    workoutHistory: [],
};
