export const viewMap = {
    onboarding: 'onboarding-container',
    home: 'home-screen',
    planHub: 'plan-hub-view',
    templateLibrary: 'template-library-view',
    customPlanWizard: 'custom-plan-wizard-view',
    builder: 'builder-view',
    workout: 'daily-workout-view',
    performanceSummary: 'performance-summary-view',
    settings: 'settings-view',
};

export const state = {
    userId: null,
    isDataLoaded: false,
    userSelections: { 
        goal: 'muscle', 
        experience: 'beginner', 
        style: 'gym',
        onboardingCompleted: false
    },
    settings: {
        units: 'lbs',
        theme: 'dark',
        progressionModel: 'double',
        weightIncrement: 5
    },
    allPlans: [],
    activePlanId: null, 
    editingPlanId: null,
    currentView: { week: 1, day: 1 },
    currentViewName: 'onboarding',
    builderPlan: {
        days: [] 
    },
    exercises: [],
    progressChart: null,
    volumeChart: null,
};

export const elements = {
    onboardingContainer: document.getElementById('onboarding-container'),
    homeScreen: document.getElementById('home-screen'),
    planHubView: document.getElementById('plan-hub-view'),
    templateLibraryView: document.getElementById('template-library-view'),
    workoutView: document.getElementById('daily-workout-view'),
    builderView: document.getElementById('builder-view'),
    performanceSummaryView: document.getElementById('performance-summary-view'),
    settingsView: document.getElementById('settings-view'),
    customPlanWizardView: document.getElementById('custom-plan-wizard-view'),
    scheduleContainer: document.getElementById('schedule-container'),
    modal: document.getElementById('modal'),
    modalBody: document.getElementById('modal-body'),
    modalActions: document.getElementById('modal-actions'),
    activePlanDisplay: document.getElementById('active-plan-display'),
    builderTitle: document.getElementById('builder-title'),
    planManagementList: document.getElementById('plan-management-list'),
};
