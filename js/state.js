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
        goal: 'hypertrophy', // 'hypertrophy', 'strength', 'fatLoss'
        trainingAge: 'beginner', // 'novice', 'beginner', 'intermediate', 'advanced'
        daysPerWeek: 4, // Default value, will be updated by user
        dietaryStatus: 'maintenance', // 'surplus', 'maintenance', 'deficit'
        style: 'gym',
        onboardingCompleted: false,
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
    editingPlanId: null,
    currentView: {
        week: 1,
        day: 1
    },

    // Volume landmarks for each muscle group, will be calculated by the "brain"
    volumeLandmarks: {
        // Example structure:
        // chest: { mv: 8, mev: 10, mav: 16, mrv: 20 },
    },
    
    // User-Created Templates
    savedTemplates: [],

    // UI and View State
    currentViewName: 'onboarding',

    // Onboarding Wizard State
    onboarding: {
        currentStep: 1,
        totalSteps: 7, // Updated to reflect new onboarding questions
    },

    // Temporary state for building a new plan (DEPRECATED - will be removed)
    builderPlan: {
        days: []
    },
    isPlanBuilderDirty: false,

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
        soreness: {},
        pump: {},
        jointPain: {},
    },
};
