// js/googleSheetsService.js
import { state } from './state.js';
import { showModal } from './ui.js';

/**
 * @file googleSheetsService.js handles all interactions with Google Sheets API,
 * replacing Firebase with user-owned Google Sheets for data storage.
 */

// --- GOOGLE SHEETS API CONFIGURATION ---
const GOOGLE_SHEETS_CONFIG = {
  // Your API Key from Google Cloud Console
  apiKey: 'AIzaSyDuiKQji6jpo8Upe_G7__uLiew8tGSUQ88', 
  // Your OAuth 2.0 Client ID from Google Cloud Console
  clientId: '993517201890-5p0tvh2eotpgshl8pv1sbs78bg8vg8o1.apps.googleusercontent.com', 
  // Note: The Client Secret (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) is a server-side credential and should not be included in client-side code. It is not needed for this application's functionality.
  discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  scopes: 'https://www.googleapis.com/auth/spreadsheets'
};

// --- LOCAL STORAGE KEY ---
const LOCAL_STORAGE_KEY = 'progressionAppState';
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// --- GLOBAL VARIABLES ---
let syncIntervalId = null;
let isGapiLoaded = false;
let isGisLoaded = false;
let tokenClient = null;
let spreadsheetId = null;

/**
 * Creates the complete, default state object for a new user.
 */
function createDefaultUserData() {
    return {
        userSelections: {
            goal: 'hypertrophy',
            trainingAge: 'beginner',
            daysPerWeek: 4,
            dietaryStatus: 'maintenance',
            style: 'gym',
            onboardingCompleted: false,
        },
        settings: {
            units: 'lbs',
            theme: 'dark',
            progressionModel: 'double',
            weightIncrement: 5,
            restDuration: 90,
            haptics: true,
        },
        allPlans: [],
        activePlanId: null,
        workoutHistory: [],
        personalRecords: [],
        savedTemplates: [],
        currentView: { week: 1, day: 1 },
        isWorkoutInProgress: false,
        lastSyncTime: null,
        spreadsheetId: null,
    };
}

/**
 * Applies loaded data to the global state.
 */
function applyDataToState(data) {
    if (!data) return;
    
    state.userSelections = { ...state.userSelections, ...data.userSelections };
    state.settings = { ...state.settings, ...data.settings };
    state.allPlans = data.allPlans || [];
    state.savedTemplates = data.savedTemplates || [];
    state.activePlanId = data.activePlanId || (state.allPlans.length > 0 ? state.allPlans[0].id : null);
    state.currentView = data.currentView || state.currentView;
    state.workoutHistory = data.workoutHistory || [];
    state.personalRecords = data.personalRecords || [];
    state.workoutTimer.isWorkoutInProgress = data.isWorkoutInProgress || false;
    state.lastSyncTime = data.lastSyncTime || null;
    spreadsheetId = data.spreadsheetId || null;
}

/**
 * Initialize Google API and Google Identity Services
 */
async function initializeGoogleAPIs() {
    return new Promise((resolve, reject) => {
        // Load Google API
        if (!window.gapi) {
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.onload = () => {
                window.gapi.load('client', async () => {
                    try {
                        await window.gapi.client.init({
                            apiKey: GOOGLE_SHEETS_CONFIG.apiKey,
                            discoveryDocs: GOOGLE_SHEETS_CONFIG.discoveryDocs,
                        });
                        isGapiLoaded = true;
                        checkInitializationComplete(resolve);
                    } catch (error) {
                        reject(error);
                    }
                });
            };
            gapiScript.onerror = reject;
            document.head.appendChild(gapiScript);
        }

        // Load Google Identity Services
        if (!window.google?.accounts) {
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.onload = () => {
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_SHEETS_CONFIG.clientId,
                    scope: GOOGLE_SHEETS_CONFIG.scopes,
                    callback: (response) => {
                        if (response.error) {
                            console.error('OAuth error:', response.error);
                            showModal('Authentication Error', 'Failed to authenticate with Google. Please try again.');
                            return;
                        }
                        console.log('OAuth successful');
                        // Token is automatically handled by gapi.client
                    },
                });
                isGisLoaded = true;
                checkInitializationComplete(resolve);
            };
            gisScript.onerror = reject;
            document.head.appendChild(gisScript);
        }
    });
}

function checkInitializationComplete(resolve) {
    if (isGapiLoaded && isGisLoaded) {
        resolve();
    }
}

/**
 * Authenticate user with Google OAuth
 */
async function authenticateUser() {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Google Identity Services not initialized'));
            return;
        }

        // Check if user is already signed in
        if (window.gapi.client.getToken()) {
            resolve();
            return;
        }

        tokenClient.callback = (response) => {
            if (response.error) {
                reject(new Error(response.error));
                return;
            }
            resolve();
        };

        tokenClient.requestAccessToken();
    });
}

/**
 * Create a new spreadsheet for the user
 */
async function createUserSpreadsheet() {
    try {
        const response = await window.gapi.client.sheets.spreadsheets.create({
            properties: {
                title: `Progression Workout Tracker - ${new Date().toLocaleDateString()}`
            },
            sheets: [
                {
                    properties: {
                        title: 'AppData'
                    }
                }
            ]
        });

        spreadsheetId = response.result.spreadsheetId;
        
        // Store spreadsheet ID in local storage
        const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        localData.spreadsheetId = spreadsheetId;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));

        // Set up the initial headers
        await setupSpreadsheetHeaders();
        
        return spreadsheetId;
    } catch (error) {
        console.error('Error creating spreadsheet:', error);
        throw error;
    }
}

/**
 * Set up the spreadsheet with proper headers
 */
async function setupSpreadsheetHeaders() {
    const headers = [
        'Timestamp',
        'DataType',
        'UserSelections',
        'Settings',
        'AllPlans',
        'ActivePlanId',
        'WorkoutHistory',
        'PersonalRecords',
        'SavedTemplates',
        'CurrentView',
        'IsWorkoutInProgress'
    ];

    try {
        await window.gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: 'AppData!A1:K1',
            valueInputOption: 'RAW',
            resource: {
                values: [headers]
            }
        });
    } catch (error) {
        console.error('Error setting up headers:', error);
        throw error;
    }
}

/**
 * Save data to Google Sheets
 */
async function saveDataToSheets() {
    if (!spreadsheetId) {
        console.error('No spreadsheet ID available');
        return false;
    }

    try {
        await authenticateUser();

        const dataToSave = {
            userSelections: state.userSelections,
            settings: state.settings,
            allPlans: state.allPlans,
            activePlanId: state.activePlanId,
            workoutHistory: state.workoutHistory,
            personalRecords: state.personalRecords,
            savedTemplates: state.savedTemplates,
            currentView: state.currentView,
            isWorkoutInProgress: state.workoutTimer.isWorkoutInProgress,
        };

        const timestamp = new Date().toISOString();
        const rowData = [
            timestamp,
            'FULL_STATE',
            JSON.stringify(dataToSave.userSelections),
            JSON.stringify(dataToSave.settings),
            JSON.stringify(dataToSave.allPlans),
            dataToSave.activePlanId || '',
            JSON.stringify(dataToSave.workoutHistory),
            JSON.stringify(dataToSave.personalRecords),
            JSON.stringify(dataToSave.savedTemplates),
            JSON.stringify(dataToSave.currentView),
            dataToSave.isWorkoutInProgress.toString()
        ];

        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'AppData!A:K',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [rowData]
            }
        });

        state.lastSyncTime = timestamp;
        console.log('Data successfully synced to Google Sheets');
        return true;
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        showModal('Sync Error', 'Could not save your data to Google Sheets. Your data is saved locally and will sync when the connection is restored.');
        return false;
    }
}

/**
 * Load data from Google Sheets
 */
async function loadDataFromSheets() {
    if (!spreadsheetId) {
        console.log('No spreadsheet ID available');
        return null;
    }

    try {
        await authenticateUser();

        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'AppData!A:K',
        });

        const rows = response.result.values;
        if (!rows || rows.length <= 1) {
            console.log('No data found in spreadsheet');
            return null;
        }

        // Get the most recent row (last row with data)
        const latestRow = rows[rows.length - 1];
        
        if (latestRow.length < 11) {
            console.log('Incomplete data row found');
            return null;
        }

        const loadedData = {
            userSelections: JSON.parse(latestRow[2] || '{}'),
            settings: JSON.parse(latestRow[3] || '{}'),
            allPlans: JSON.parse(latestRow[4] || '[]'),
            activePlanId: latestRow[5] || null,
            workoutHistory: JSON.parse(latestRow[6] || '[]'),
            personalRecords: JSON.parse(latestRow[7] || '[]'),
            savedTemplates: JSON.parse(latestRow[8] || '[]'),
            currentView: JSON.parse(latestRow[9] || '{"week":1,"day":1}'),
            isWorkoutInProgress: latestRow[10] === 'true',
            lastSyncTime: latestRow[0],
            spreadsheetId: spreadsheetId
        };

        console.log('Data successfully loaded from Google Sheets');
        return loadedData;
    } catch (error) {
        console.error('Error loading from Google Sheets:', error);
        return null;
    }
}

/**
 * Save data to local storage
 */
function saveToLocalStorage() {
    try {
        const dataToSave = {
            userSelections: state.userSelections,
            settings: state.settings,
            allPlans: state.allPlans,
            activePlanId: state.activePlanId,
            workoutHistory: state.workoutHistory,
            personalRecords: state.personalRecords,
            savedTemplates: state.savedTemplates,
            currentView: state.currentView,
            isWorkoutInProgress: state.workoutTimer.isWorkoutInProgress,
            lastSyncTime: state.lastSyncTime,
            spreadsheetId: spreadsheetId
        };

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

/**
 * Load data from local storage
 */
function loadFromLocalStorage() {
    try {
        const localDataString = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localDataString) {
            return JSON.parse(localDataString);
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
    return null;
}

/**
 * Start periodic sync
 */
function startPeriodicSync() {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
    }

    syncIntervalId = setInterval(async () => {
        console.log('Performing periodic sync...');
        await syncData();
    }, SYNC_INTERVAL);
}

/**
 * Stop periodic sync
 */
function stopPeriodicSync() {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
    }
}

/**
 * Main sync function
 */
async function syncData() {
    // Always save to local storage first
    saveToLocalStorage();
    
    // Try to sync with Google Sheets
    return await saveDataToSheets();
}

/**
 * Initialize the data service
 */
async function initializeDataService() {
    try {
        // Initialize Google APIs
        await initializeGoogleAPIs();

        // Load from local storage first
        const localData = loadFromLocalStorage();
        if (localData) {
            spreadsheetId = localData.spreadsheetId;
            applyDataToState(localData);
        }

        // If no spreadsheet ID, this is a new user
        if (!spreadsheetId) {
            const defaultData = createDefaultUserData();
            applyDataToState(defaultData);
            
            // Ask user if they want to connect to Google Sheets
            const shouldConnect = await askUserToConnectGoogleSheets();
            if (shouldConnect) {
                await authenticateUser();
                await createUserSpreadsheet();
                await syncData();
            }
        } else {
            // Try to load latest data from Google Sheets
            try {
                const sheetsData = await loadDataFromSheets();
                if (sheetsData) {
                    // Compare timestamps to see which is newer
                    const localTime = localData?.lastSyncTime;
                    const sheetsTime = sheetsData.lastSyncTime;
                    
                    if (!localTime || (sheetsTime && new Date(sheetsTime) > new Date(localTime))) {
                        applyDataToState(sheetsData);
                        saveToLocalStorage(); // Update local storage with newer data
                    }
                }
            } catch (error) {
                console.log('Could not load from Google Sheets, using local data');
            }
        }

        state.isDataLoaded = true;
        
        // Start periodic sync
        startPeriodicSync();
        
        return true;
    } catch (error) {
        console.error('Error initializing data service:', error);
        
        // Fallback to local data only
        const localData = loadFromLocalStorage();
        if (localData) {
            applyDataToState(localData);
        } else {
            applyDataToState(createDefaultUserData());
        }
        
        state.isDataLoaded = true;
        showModal('Offline Mode', 'Running in offline mode. Data will be saved locally.');
        return false;
    }
}

/**
 * Ask user if they want to connect to Google Sheets
 */
function askUserToConnectGoogleSheets() {
    return new Promise((resolve) => {
        showModal(
            'Connect to Google Sheets',
            'Would you like to sync your workout data with your own Google Sheets? This keeps your data in your control and enables sync across devices.',
            [
                { 
                    text: 'Skip for Now', 
                    class: 'secondary-button',
                    action: () => resolve(false)
                },
                { 
                    text: 'Connect to Google Sheets', 
                    class: 'cta-button',
                    action: () => resolve(true)
                }
            ]
        );
    });
}

/**
 * Handle page unload (save data before closing)
 */
function handlePageUnload() {
    // Perform final sync before closing
    syncData();
    stopPeriodicSync();
}

/**
 * Public API functions
 */
export async function saveFullState() {
    return await syncData();
}

export async function updateState(key, value) {
    // Update global state
    state[key] = value;
    
    // Save to local storage immediately
    saveToLocalStorage();
    
    // Note: We don't sync to sheets on every update to avoid rate limiting
    // The periodic sync will handle this
    return true;
}

export function handleAuthentication(onAuthenticated) {
    initializeDataService().then(() => {
        if (onAuthenticated && state.isDataLoaded) {
            onAuthenticated();
        }
    });
}

export async function loadExercises() {
    try {
        const response = await fetch('exercises.json');
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        state.exercises = await response.json();
    } catch (error) {
        console.error("Failed to load exercises.json:", error);
        showModal(
            'Error Loading Data',
            'Could not load the necessary exercise data. The app may not function correctly. Please check your connection and refresh the page.',
            [{ text: 'OK', class: 'cta-button' }]
        );
    }
}

// Set up page unload handler
window.addEventListener('beforeunload', handlePageUnload);
window.addEventListener('unload', handlePageUnload);

// For mobile apps, also handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        syncData();
    }
});
