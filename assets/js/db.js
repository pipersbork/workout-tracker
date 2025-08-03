// ========================================
// db.js - Unified Database Module
// ========================================

const DB = (() => {
  const DB_NAME = 'WorkoutTrackerDB';
  const DB_VERSION = 4;
  let db = null;

  // Initialize database with all stores
  const init = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error('Failed to open database'));

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        db = event.target.result;

        // User preferences store
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' });
        }

        // Workout plans store
        if (!db.objectStoreNames.contains('plans')) {
          db.createObjectStore('plans', { keyPath: 'id' });
        }

        // Workout logs store
        if (!db.objectStoreNames.contains('workouts')) {
          const workoutStore = db.createObjectStore('workouts', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          workoutStore.createIndex('date', 'date', { unique: false });
          workoutStore.createIndex('planId', 'planId', { unique: false });
        }

        // Exercise logs store
        if (!db.objectStoreNames.contains('exercises')) {
          const exerciseStore = db.createObjectStore('exercises', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          exerciseStore.createIndex('workoutId', 'workoutId', { unique: false });
          exerciseStore.createIndex('name', 'name', { unique: false });
          exerciseStore.createIndex('date', 'date', { unique: false });
        }

        // Personal records store
        if (!db.objectStoreNames.contains('personalRecords')) {
          const prStore = db.createObjectStore('personalRecords', { 
            keyPath: 'exerciseName' 
          });
        }

        // Templates store
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
        }
      };
    });
  };

  // Ensure database is initialized
  const ensureDB = async () => {
    if (!db) {
      await init();
    }
    return db;
  };

  // Generic CRUD operations
  const operations = {
    // Create or update
    save: async (storeName, data) => {
      await ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to save to ${storeName}`));
      });
    },

    // Read single item
    get: async (storeName, id) => {
      await ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to get from ${storeName}`));
      });
    },

    // Read all items
    getAll: async (storeName) => {
      await ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error(`Failed to get all from ${storeName}`));
      });
    },

    // Delete item
    delete: async (storeName, id) => {
      await ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to delete from ${storeName}`));
      });
    },

    // Query by index
    getByIndex: async (storeName, indexName, value) => {
      await ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error(`Failed to query ${storeName} by ${indexName}`));
      });
    },

    // Clear store
    clear: async (storeName) => {
      await ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
      });
    }
  };

  // Specific data access methods
  return {
    init,

    // Preferences
    preferences: {
      save: (prefs) => operations.save('preferences', { id: 'user', ...prefs }),
      get: () => operations.get('preferences', 'user'),
      clear: () => operations.delete('preferences', 'user')
    },

    // Plans
    plans: {
      save: (plan) => operations.save('plans', { id: 'active', ...plan }),
      get: () => operations.get('plans', 'active'),
      getAll: () => operations.getAll('plans'),
      delete: (id) => operations.delete('plans', id)
    },

    // Workouts
    workouts: {
      save: (workout) => operations.save('workouts', { 
        ...workout, 
        date: workout.date || new Date().toISOString() 
      }),
      get: (id) => operations.get('workouts', id),
      getAll: () => operations.getAll('workouts'),
      getByDate: (date) => operations.getByIndex('workouts', 'date', date),
      getByPlan: (planId) => operations.getByIndex('workouts', 'planId', planId),
      delete: (id) => operations.delete('workouts', id)
    },

    // Exercises
    exercises: {
      save: (exercise) => operations.save('exercises', {
        ...exercise,
        date: exercise.date || new Date().toISOString()
      }),
      getByWorkout: (workoutId) => operations.getByIndex('exercises', 'workoutId', workoutId),
      getByName: (name) => operations.getByIndex('exercises', 'name', name),
      getAll: () => operations.getAll('exercises')
    },

    // Personal Records
    personalRecords: {
      save: (record) => operations.save('personalRecords', record),
      get: (exerciseName) => operations.get('personalRecords', exerciseName),
      getAll: () => operations.getAll('personalRecords')
    },

    // Templates
    templates: {
      save: (template) => operations.save('templates', template),
      get: (id) => operations.get('templates', id),
      getAll: () => operations.getAll('templates'),
      delete: (id) => operations.delete('templates', id)
    },

    // Utility methods
    clear: async () => {
      const stores = ['preferences', 'plans', 'workouts', 'exercises', 'personalRecords', 'templates'];
      await Promise.all(stores.map(store => operations.clear(store)));
    },

    export: async () => {
      const data = {};
      const stores = ['preferences', 'plans', 'workouts', 'exercises', 'personalRecords', 'templates'];
      
      for (const store of stores) {
        data[store] = await operations.getAll(store);
      }
      
      return data;
    },

    import: async (data) => {
      for (const [storeName, items] of Object.entries(data)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            await operations.save(storeName, item);
          }
        }
      }
    }
  };
})();

// ========================================
// app.js - Main Application Module
// ========================================

const App = (() => {
  // State management
  const state = {
    user: null,
    preferences: null,
    currentPlan: null,
    currentWorkout: null,
    isOnboarding: true,
    activeTab: 'workout'
  };

  // Initialize application
  const init = async () => {
    try {
      // Initialize database
      await DB.init();
      
      // Check for existing user
      const preferences = await DB.preferences.get();
      
      if (preferences) {
        state.preferences = preferences;
        state.isOnboarding = false;
        
        // Load active plan
        const plan = await DB.plans.get();
        if (plan) {
          state.currentPlan = plan;
        }
        
        // Show main app
        UI.showMainApp();
      } else {
        // Show onboarding
        UI.showOnboarding();
      }
      
      // Set up event listeners
      setupEventListeners();
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      UI.showError('Failed to load app. Please refresh.');
    }
  };

  // Event listeners setup
  const setupEventListeners = () => {
    // Selection cards
    document.querySelectorAll('.selection-card').forEach(card => {
      card.addEventListener('click', handleSelection);
    });

    // Continue button
    const continueBtn = document.querySelector('#continue-onboarding');
    if (continueBtn) {
      continueBtn.addEventListener('click', completeOnboarding);
    }

    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', handleTabChange);
    });

    // Action buttons
    const generateBtn = document.querySelector('#generate-workout');
    if (generateBtn) {
      generateBtn.addEventListener('click', generateWorkout);
    }

    const startWorkoutBtn = document.querySelector('#start-workout');
    if (startWorkoutBtn) {
      startWorkoutBtn.addEventListener('click', startWorkout);
    }
  };

  // Handle selection in onboarding
  const handleSelection = (event) => {
    const card = event.currentTarget;
    const group = card.parentElement;
    const field = card.dataset;

    // Update UI
    group.querySelectorAll('.selection-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    // Update state
    if (!state.preferences) {
      state.preferences = {};
    }

    Object.assign(state.preferences, field);
    
    // Update progress
    updateOnboardingProgress();
  };

  // Update onboarding progress
  const updateOnboardingProgress = () => {
    const totalFields = 4; // goal, experience, equipment, frequency
    const filledFields = Object.keys(state.preferences || {}).length;
    const progress = (filledFields / totalFields) * 100;
    
    UI.updateProgress(progress);
    
    // Enable continue button if all fields filled
    const continueBtn = document.querySelector('#continue-onboarding');
    if (continueBtn && filledFields === totalFields) {
      continueBtn.disabled = false;
      continueBtn.classList.add('btn-primary');
      continueBtn.classList.remove('btn-secondary');
    }
  };

  // Complete onboarding
  const completeOnboarding = async () => {
    if (!validateOnboarding()) {
      UI.showError('Please complete all selections');
      return;
    }

    UI.showLoading();

    try {
      // Save preferences
      await DB.preferences.save(state.preferences);
      
      // Generate initial plan
      const plan = await WorkoutGenerator.generatePlan(state.preferences);
      await DB.plans.save(plan);
      state.currentPlan = plan;
      
      // Update state
      state.isOnboarding = false;
      
      // Show main app
      UI.hideLoading();
      UI.showMainApp();
      UI.showSuccess('Welcome to Workout Tracker!');
      
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      UI.hideLoading();
      UI.showError('Failed to save preferences. Please try again.');
    }
  };

  // Validate onboarding selections
  const validateOnboarding = () => {
    const required = ['goal', 'experience', 'equipment', 'frequency'];
    return required.every(field => state.preferences && state.preferences[field]);
  };

  // Handle tab changes
  const handleTabChange = (event) => {
    const tab = event.currentTarget.dataset.tab;
    
    if (tab === state.activeTab) return;
    
    // Update UI
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Show/hide content
    document.querySelectorAll('[id$="-content"]').forEach(content => content.classList.add('hidden'));
    document.getElementById(`${tab}-content`).classList.remove('hidden');
    
    // Update state
    state.activeTab = tab;
    
    // Load tab-specific data
    loadTabData(tab);
  };

  // Load data for specific tab
  const loadTabData = async (tab) => {
    switch (tab) {
      case 'workout':
        if (state.currentPlan) {
          UI.renderWorkoutPlan(state.currentPlan);
        }
        break;
        
      case 'history':
        const workouts = await DB.workouts.getAll();
        UI.renderWorkoutHistory(workouts);
        break;
        
      case 'progress':
        const stats = await calculateStats();
        UI.renderProgress(stats);
        break;
    }
  };

  // Generate new workout
  const generateWorkout = async () => {
    UI.showLoading();
    
    try {
      const plan = await WorkoutGenerator.generatePlan(state.preferences);
      await DB.plans.save(plan);
      state.currentPlan = plan;
      
      UI.hideLoading();
      UI.renderWorkoutPlan(plan);
      UI.showSuccess('New workout plan generated!');
      
    } catch (error) {
      console.error('Failed to generate workout:', error);
      UI.hideLoading();
      UI.showError('Failed to generate workout. Please try again.');
    }
  };

  // Start workout session
  const startWorkout = () => {
    if (!state.currentPlan) {
      UI.showError('No workout plan available');
      return;
    }
    
    state.currentWorkout = {
      planId: state.currentPlan.id,
      startTime: new Date().toISOString(),
      exercises: []
    };
    
    WorkoutTracker.start(state.currentPlan);
  };

  // Calculate statistics
  const calculateStats = async () => {
    const workouts = await DB.workouts.getAll();
    const exercises = await DB.exercises.getAll();
    const prs = await DB.personalRecords.getAll();
    
    // Calculate date ranges
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Filter workouts by date
    const thisMonthWorkouts = workouts.filter(w => new Date(w.date) >= thisMonth);
    const lastMonthWorkouts = workouts.filter(w => 
      new Date(w.date) >= lastMonth && new Date(w.date) < thisMonth
    );
    
    // Calculate consistency
    const expectedWorkouts = state.preferences?.frequency || 3;
    const weeksThisMonth = Math.floor((now - thisMonth) / (7 * 24 * 60 * 60 * 1000));
    const consistency = Math.round((thisMonthWorkouts.length / (expectedWorkouts * weeksThisMonth)) * 100);
    
    return {
      totalWorkouts: workouts.length,
      thisMonthWorkouts: thisMonthWorkouts.length,
      lastMonthWorkouts: lastMonthWorkouts.length,
      consistency: Math.min(consistency, 100),
      personalRecords: prs.length,
      recentPRs: prs.filter(pr => {
        const prDate = new Date(pr.date);
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        return prDate >= weekAgo;
      }).length,
      favoriteExercises: calculateFavoriteExercises(exercises),
      volumeTrend: calculateVolumeTrend(exercises)
    };
  };

  // Calculate favorite exercises
  const calculateFavoriteExercises = (exercises) => {
    const counts = {};
    
    exercises.forEach(ex => {
      counts[ex.name] = (counts[ex.name] || 0) + 1;
    });
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  };

  // Calculate volume trend
  const calculateVolumeTrend = (exercises) => {
    // Group by week
    const weeklyVolume = {};
    
    exercises.forEach(ex => {
      const date = new Date(ex.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyVolume[weekKey]) {
        weeklyVolume[weekKey] = 0;
      }
      
      // Calculate volume (sets * reps * weight)
      ex.sets?.forEach(set => {
        weeklyVolume[weekKey] += (set.weight || 0) * (set.reps || 0);
      });
    });
    
    // Convert to array and sort by date
    return Object.entries(weeklyVolume)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12) // Last 12 weeks
      .map(([week, volume]) => ({ week, volume }));
  };

  // Public API
  return {
    init,
    state,
    generateWorkout,
    startWorkout
  };
})();
