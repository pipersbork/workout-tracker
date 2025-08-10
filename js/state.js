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
        goal: 'hypertrophy', // More specific goals: 'hypertrophy', 'strength', 'fatLoss'
        experience: 'beginner', // 'novice', 'beginner', 'intermediate', 'advanced'
        style: 'gym',
        onboardingCompleted: false,
        // NEW: Detailed user factors for the "brain"
        trainingAge: 'beginner', // novice, beginner, intermediate, advanced, highlyAdvanced, masters
        dietaryStatus: 'maintenance', // surplus, maintenance, deficit
        sleepQuality: 8, // Scale of 1-10
        stressLevels: 3, // Scale of 1-10
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

    // NEW: Volume landmarks for each muscle group, will be calculated by the "brain"
    volumeLandmarks: {
        // Example structure:
        // chest: { mv: 8, mev: 10, mav: 16, mrv: 20 },
        // back: { mv: 10, mev: 12, mav: 18, mrv: 22 },
    },
    
    // User-Created Templates
    savedTemplates: [], // Stores plans saved as reusable templates

    // UI and View State
    currentViewName: 'onboarding',

    // Onboarding Wizard State
    onboarding: {
        currentStep: 1,
        totalSteps: 5, // Will likely increase with more detailed questions
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
    e1rmChart: null,

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
        suggestions: [],
        newPRs: 0,
    },

    // Holds the chronological history of all completed workouts
    workoutHistory: [],

    // Holds all personal records achieved by the user
    personalRecords: [],

    // Temporary state for the feedback modal
    feedbackState: {
        currentExercise: null,
        currentExerciseIndex: null,
        // NEW: To store feedback from the user
        soreness: {}, // e.g., { chest: 'moderate', back: 'mild' }
        pump: {},
        jointPain: {},
    },
};
