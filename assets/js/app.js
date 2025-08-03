// ========================================
// app.js - Complete Workout Tracker Application
// ========================================

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// ========================================
// Database Module
// ========================================
const DB = (() => {
  const DB_NAME = 'WorkoutTrackerDB';
  const DB_VERSION = 1;
  let db = null;

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

        // Create all stores
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('workouts')) {
          db.createObjectStore('workouts', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('personalRecords')) {
          db.createObjectStore('personalRecords', { keyPath: 'exerciseName' });
        }
      };
    });
  };

  // Helper function to ensure DB is ready
  const ensureDB = async () => {
    if (!db) await init();
    return db;
  };

  // Generic save operation
  const save = async (storeName, data) => {
    await ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to save to ${storeName}`));
    });
  };

  // Generic get operation
  const get = async (storeName, key) => {
    await ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get from ${storeName}`));
    });
  };

  // Generic getAll operation
  const getAll = async (storeName) => {
    await ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to get all from ${storeName}`));
    });
  };

  return {
    init,
    preferences: {
      save: (data) => save('preferences', { id: 'user', ...data }),
      get: () => get('preferences', 'user')
    },
    workouts: {
      save: (data) => save('workouts', data),
      getAll: () => getAll('workouts')
    },
    personalRecords: {
      save: (data) => save('personalRecords', data),
      get: (exercise) => get('personalRecords', exercise),
      getAll: () => getAll('personalRecords')
    }
  };
})();

// ========================================
// Exercise Database
// ========================================
const ExerciseDB = {
  gym: {
    push: [
      { name: 'Bench Press', muscle: 'Chest', compound: true },
      { name: 'Overhead Press', muscle: 'Shoulders', compound: true },
      { name: 'Incline Dumbbell Press', muscle: 'Upper Chest', compound: true },
      { name: 'Dips', muscle: 'Chest/Triceps', compound: true },
      { name: 'Lateral Raises', muscle: 'Shoulders', compound: false },
      { name: 'Cable Fly', muscle: 'Chest', compound: false },
      { name: 'Tricep Extension', muscle: 'Triceps', compound: false }
    ],
    pull: [
      { name: 'Deadlift', muscle: 'Back/Legs', compound: true },
      { name: 'Pull-ups', muscle: 'Back/Biceps', compound: true },
      { name: 'Barbell Row', muscle: 'Back', compound: true },
      { name: 'Lat Pulldown', muscle: 'Lats', compound: true },
      { name: 'Face Pulls', muscle: 'Rear Delts', compound: false },
      { name: 'Barbell Curl', muscle: 'Biceps', compound: false },
      { name: 'Cable Row', muscle: 'Back', compound: false }
    ],
    legs: [
      { name: 'Squat', muscle: 'Quads/Glutes', compound: true },
      { name: 'Romanian Deadlift', muscle: 'Hamstrings/Glutes', compound: true },
      { name: 'Leg Press', muscle: 'Quads', compound: true },
      { name: 'Bulgarian Split Squat', muscle: 'Quads/Glutes', compound: true },
      { name: 'Leg Curl', muscle: 'Hamstrings', compound: false },
      { name: 'Leg Extension', muscle: 'Quads', compound: false },
      { name: 'Calf Raises', muscle: 'Calves', compound: false }
    ]
  },
  home: {
    push: [
      { name: 'Push-ups', muscle: 'Chest', compound: true },
      { name: 'Pike Push-ups', muscle: 'Shoulders', compound: true },
      { name: 'Diamond Push-ups', muscle: 'Triceps', compound: true },
      { name: 'Dips (Chair)', muscle: 'Chest/Triceps', compound: true }
    ],
    pull: [
      { name: 'Pull-ups (Door)', muscle: 'Back/Biceps', compound: true },
      { name: 'Inverted Row', muscle: 'Back', compound: true },
      { name: 'Superman', muscle: 'Lower Back', compound: false }
    ],
    legs: [
      { name: 'Bodyweight Squat', muscle: 'Quads/Glutes', compound: true },
      { name: 'Lunges', muscle: 'Quads/Glutes', compound: true },
      { name: 'Jump Squats', muscle: 'Quads', compound: true },
      { name: 'Single Leg RDL', muscle: 'Hamstrings', compound: true },
      { name: 'Wall Sit', muscle: 'Quads', compound: false },
      { name: 'Glute Bridge', muscle: 'Glutes', compound: false },
      { name: 'Calf Raises', muscle: 'Calves', compound: false }
    ]
  }
};

// ========================================
// Workout Generator
// ========================================
const WorkoutGenerator = {
  generatePlan(preferences) {
    const { goal, experience, equipment, frequency } = preferences;
    const split = this.getSplit(parseInt(frequency));
    
    const workouts = split.map((type, index) => ({
      day: index + 1,
      type: type,
      exercises: this.generateWorkout(type, equipment, goal, experience)
    }));

    return {
      id: Date.now(),
      preferences,
      workouts,
      createdAt: new Date().toISOString()
    };
  },

  getSplit(frequency) {
    const splits = {
      2: ['Upper', 'Lower'],
      3: ['Push', 'Pull', 'Legs'],
      4: ['Upper', 'Lower', 'Push', 'Pull'],
      5: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
      6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs']
    };
    return splits[frequency] || splits[3];
  },

  generateWorkout(type, equipment, goal, experience) {
    const exercises = [];
    const db = ExerciseDB[equipment];
    
    // Determine which muscle groups to train
    const muscleGroups = {
      'Upper': ['push', 'pull'],
      'Lower': ['legs'],
      'Push': ['push'],
      'Pull': ['pull'],
      'Legs': ['legs']
    };
    
    const groups = muscleGroups[type] || ['push'];
    
    // Add exercises for each muscle group
    groups.forEach(group => {
      const available = db[group] || [];
      const compounds = available.filter(ex => ex.compound);
      const isolations = available.filter(ex => !ex.compound);
      
      // Add compound exercises
      const compoundCount = goal === 'strength' ? 2 : 1;
      this.selectRandom(compounds, compoundCount).forEach(ex => {
        exercises.push({
          ...ex,
          sets: experience === 'beginner' ? 3 : 4,
          reps: goal === 'strength' ? [4, 6] : [8, 12],
          rest: goal === 'strength' ? 3 : 2
        });
      });
      
      // Add isolation exercises
      const isolationCount = goal === 'hypertrophy' ? 2 : 1;
      this.selectRandom(isolations, isolationCount).forEach(ex => {
        exercises.push({
          ...ex,
          sets: 3,
          reps: [10, 15],
          rest: 1.5
        });
      });
    });
    
    return exercises;
  },

  selectRandom(array, count) {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, array.length));
  }
};

// ========================================
// UI Controller
// ========================================
const UI = {
  showOnboarding() {
    document.getElementById('onboarding').classList.remove('hidden');
    document.getElementById('app-content').classList.add('hidden');
    document.getElementById('bottom-nav').classList.add('hidden');
  },

  showApp() {
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app-content').classList.remove('hidden');
    document.getElementById('bottom-nav').classList.remove('hidden');
  },

  showLoading() {
    const loader = document.createElement('div');
    loader.id = 'loading-overlay';
    loader.className = 'loading-overlay';
    loader.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(loader);
  },

  hideLoading() {
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.remove();
  },

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast show ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  },

  renderWorkoutPlan(plan) {
    const container = document.getElementById('workout-plan');
    if (!container) return;

    const today = new Date().getDay() || 7;
    const workout = plan.workouts[today % plan.workouts.length];
    
    container.innerHTML = `
      <h3>${workout.type} Day</h3>
      ${workout.exercises.map(ex => `
        <div class="exercise-item">
          <div>
            <div class="exercise-name">${ex.name}</div>
            <div class="text-muted">${ex.muscle}</div>
          </div>
          <div class="exercise-details">
            <span>${ex.sets} sets</span>
            <span>${ex.reps[0]}-${ex.reps[1]} reps</span>
            <span>${ex.rest}min rest</span>
          </div>
        </div>
      `).join('')}
    `;
  },

  renderHistory(workouts) {
    const container = document.getElementById('history-container');
    if (!container) return;

    if (workouts.length === 0) {
      container.innerHTML = '<p class="text-muted">No workouts recorded yet</p>';
      return;
    }

    container.innerHTML = workouts.slice(-10).reverse().map(workout => `
      <div class="card">
        <h4>${new Date(workout.date).toLocaleDateString()}</h4>
        <p class="text-muted mb-0">${workout.type} • ${workout.duration}min</p>
      </div>
    `).join('');
  }
};

// ========================================
// Main App Controller
// ========================================
const App = {
  preferences: null,
  currentPlan: null,

  async init() {
    try {
      // Initialize database
      await DB.init();
      
      // Check for existing user
      this.preferences = await DB.preferences.get();
      
      if (this.preferences) {
        // User exists, show app
        UI.showApp();
        await this.loadWorkoutPlan();
      } else {
        // New user, show onboarding
        UI.showOnboarding();
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Failed to initialize:', error);
      UI.showToast('Failed to load app', 'error');
    }
  },

  setupEventListeners() {
    // Onboarding selections
    document.querySelectorAll('.selection-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const group = card.parentElement;
        group.querySelectorAll('.selection-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        // Store selection
        const field = Object.keys(card.dataset)[0];
        const value = card.dataset[field];
        this.updatePreference(field, value);
      });
    });

    // Continue button
    const continueBtn = document.getElementById('continue-setup');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => this.completeOnboarding());
    }

    // Generate workout button
    const generateBtn = document.getElementById('generateWorkout');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateNewPlan());
    }

    // Save workout button
    const saveBtn = document.getElementById('saveWorkout');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveWorkout());
    }

    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => this.switchTab(item.dataset.tab));
    });
  },

  updatePreference(field, value) {
    if (!this.preferences) {
      this.preferences = {};
    }
    this.preferences[field] = value;
    
    // Check if all fields are filled
    const required = ['goal', 'experience', 'equipment', 'frequency'];
    const complete = required.every(field => this.preferences[field]);
    
    const continueBtn = document.getElementById('continue-setup');
    if (continueBtn) {
      continueBtn.disabled = !complete;
    }
  },

  async completeOnboarding() {
    if (!this.preferences) return;

    UI.showLoading();
    
    try {
      // Save preferences
      await DB.preferences.save(this.preferences);
      
      // Generate initial plan
      await this.generateNewPlan();
      
      // Show app
      UI.hideLoading();
      UI.showApp();
      UI.showToast('Welcome to Workout Tracker!', 'success');
      
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      UI.hideLoading();
      UI.showToast('Something went wrong', 'error');
    }
  },

  async loadWorkoutPlan() {
    // For now, generate a new plan if none exists
    if (!this.currentPlan && this.preferences) {
      await this.generateNewPlan();
    }
  },

  async generateNewPlan() {
    if (!this.preferences) return;

    this.currentPlan = WorkoutGenerator.generatePlan(this.preferences);
    UI.renderWorkoutPlan(this.currentPlan);
  },

  async saveWorkout() {
    if (!this.currentPlan) return;

    const workout = {
      date: new Date().toISOString(),
      type: this.currentPlan.workouts[0].type,
      duration: 45, // Placeholder
      completed: true
    };

    await DB.workouts.save(workout);
    UI.showToast('Workout saved!', 'success');
    
    // Refresh history if on history tab
    const historyTab = document.querySelector('.nav-item[data-tab="history"]');
    if (historyTab?.classList.contains('active')) {
      await this.loadHistory();
    }
  },

  async switchTab(tab) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tab);
    });

    // Show/hide content
    document.querySelectorAll('[id$="-content"]').forEach(content => {
      content.classList.add('hidden');
    });
    
    const content = document.getElementById(`${tab}-content`);
    if (content) {
      content.classList.remove('hidden');
    }

    // Load tab data
    if (tab === 'history') {
      await this.loadHistory();
    }
  },

  async loadHistory() {
    const workouts = await DB.workouts.getAll();
    UI.renderHistory(workouts);
  }
};
