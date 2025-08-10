import { state } from './state.js';

/**
 * @file planGenerator.js - The "Workout Engine"
 * This file contains the core business logic for the Progression app. It's responsible for:
 * 1.  Dynamically generating entire, individualized mesocycles based on user profile.
 * 2.  Calculating week-to-week progression based on user performance.
 * 3.  Implementing training principles like Volume Landmarks (MV, MEV, MRV) and RIR-based periodization.
 */

// --- DATA & CONSTANTS ---

// Volume landmarks (sets per muscle group per week) based on training age.
// These are baseline values and can be adjusted by other factors (diet, recovery).
const VOLUME_LANDMARKS = {
    novice:       { mv: 4,  mev: 6,  mav: 10, mrv: 12 },
    beginner:     { mv: 6,  mev: 8,  mav: 12, mrv: 15 },
    intermediate: { mv: 8,  mev: 10, mav: 16, mrv: 20 },
    advanced:     { mv: 10, mev: 12, mav: 18, mrv: 22 },
};

// Defines how many exercises of each type (Primary, Secondary) are selected for a muscle group in a session.
const EXERCISE_COUNT_PER_SESSION = {
    Primary: 1,
    Secondary: 2,
};

// --- WORKOUT ENGINE ---

export const workoutEngine = {

    /**
     * Generates a complete, new mesocycle plan from scratch based on the user's profile.
     * This is the primary function for creating a new, intelligent workout program.
     * @param {object} userSelections - The detailed user profile from state.
     * @param {Array} allExercises - The full list of available exercises.
     * @param {number} durationWeeks - The total number of weeks for the mesocycle.
     * @returns {object} A complete mesocycle plan object.
     */
    generateNewMesocycle(userSelections, allExercises, durationWeeks) {
        const { trainingAge, goal, daysPerWeek } = userSelections;

        // 1. Determine the optimal split based on available days.
        const split = this._getSplitForDays(daysPerWeek);
        const landmarks = VOLUME_LANDMARKS[trainingAge] || VOLUME_LANDMARKS.beginner;

        // 2. Calculate target weekly volume (sets) for each muscle group.
        // For a new plan, we start at the Minimum Effective Volume (MEV).
        const weeklyVolumeTargets = this._calculateInitialWeeklyVolume(split.muscles, landmarks.mev);

        // 3. Build the template for one week of the mesocycle.
        const weeklyTemplate = this._buildWeekTemplate(split, weeklyVolumeTargets, allExercises, userSelections.style);

        // 4. Extrapolate the weekly template into a full mesocycle plan.
        const mesocycle = this._createFullMesocycle(weeklyTemplate, durationWeeks);

        return mesocycle;
    },

    /**
     * Calculates the progression for the next workout based on the completed one.
     * @param {object} completedWorkout - The workout data just completed by the user.
     * @param {object} nextWorkout - The workout object for the upcoming week to be modified.
     */
    calculateNextWorkoutProgression(completedWorkout, nextWorkout) {
        const { progressionModel, weightIncrement } = state.settings;

        completedWorkout.exercises.forEach((completedEx) => {
            const nextWeekEx = nextWorkout.exercises.find(ex => ex.exerciseId === completedEx.exerciseId);
            if (!nextWeekEx) return;

            // If no sets were logged, carry over the previous target.
            if (!completedEx.sets || completedEx.sets.length === 0) {
                nextWeekEx.targetLoad = completedEx.targetLoad || null;
                nextWeekEx.targetReps = completedEx.targetReps;
                return;
            }

            // Find the top set from the completed workout to base progression on.
            const topSet = completedEx.sets.reduce((max, set) => ((set.weight || 0) > (max.weight || 0) ? set : max), { weight: 0 });
            
            // Double Progression Logic
            if (progressionModel === 'double') {
                const repsAchievedInTopSet = topSet.reps || 0;
                const targetRepsForNextWeek = nextWeekEx.targetReps;

                // If user hit the top end of the rep range, increase weight.
                if (repsAchievedInTopSet >= (targetRepsForNextWeek + 2)) { // e.g., target 8, hit 10
                    nextWeekEx.targetLoad = (topSet.weight || 0) + weightIncrement;
                    nextWeekEx.targetReps = 8; // Reset to bottom of rep range
                } 
                // If user hit the target rep range, increase the rep target for next time.
                else if (repsAchievedInTopSet >= targetRepsForNextWeek) {
                    nextWeekEx.targetLoad = topSet.weight;
                    nextWeekEx.targetReps = (nextWeekEx.targetReps || 8) + 1;
                }
                // If user failed to hit the target, keep everything the same to try again.
                else {
                    nextWeekEx.targetLoad = topSet.weight;
                    nextWeekEx.targetReps = nextWeekEx.targetReps;
                }
            } 
            // Linear Progression Logic
            else { 
                const allSetsSuccessful = completedEx.sets.every(set => (set.reps || 0) >= completedEx.targetReps);
                nextWeekEx.targetLoad = allSetsSuccessful ? (topSet.weight || 0) + weightIncrement : topSet.weight;
                nextWeekEx.targetReps = completedEx.targetReps;
            }
        });
    },

    // --- PRIVATE HELPER FUNCTIONS ---

    /**
     * Determines the best training split based on the number of available training days.
     * @param {number} days - Number of training days per week.
     * @returns {object} A split object with a name and muscle group distribution.
     */
    _getSplitForDays(days) {
        if (days <= 3) {
            return { name: 'Full Body', muscles: ['chest', 'back', 'quads', 'hamstrings', 'shoulders', 'biceps', 'triceps', 'core'] };
        } else if (days === 4) {
            return { name: 'Upper/Lower', days: {
                'Upper A': ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
                'Lower A': ['quads', 'hamstrings', 'core'],
                'Upper B': ['back', 'chest', 'shoulders', 'triceps', 'biceps'],
                'Lower B': ['hamstrings', 'quads', 'core']
            }};
        } else { // 5+ days
            return { name: 'Push/Pull/Legs', days: {
                'Push': ['chest', 'shoulders', 'triceps'],
                'Pull': ['back', 'biceps'],
                'Legs': ['quads', 'hamstrings', 'core'],
            }};
        }
    },

    /**
     * Calculates the total number of sets needed per week for each muscle group.
     * @param {Array} musclesInSplit - All muscles trained in the split.
     * @param {number} targetVolume - The target volume landmark (e.g., MEV).
     * @returns {object} An object mapping muscle groups to their weekly set counts.
     */
    _calculateInitialWeeklyVolume(musclesInSplit, targetVolume) {
        const weeklyVolume = {};
        musclesInSplit.forEach(muscle => {
            weeklyVolume[muscle] = targetVolume;
        });
        // Adjust for smaller muscle groups that need less volume
        if (weeklyVolume.biceps) weeklyVolume.biceps = Math.round(targetVolume * 0.75);
        if (weeklyVolume.triceps) weeklyVolume.triceps = Math.round(targetVolume * 0.75);
        if (weeklyVolume.core) weeklyVolume.core = Math.round(targetVolume * 0.75);
        return weeklyVolume;
    },

    /**
     * Constructs the template for a single week of workouts.
     * @param {object} split - The chosen training split.
     * @param {object} weeklyVolumeTargets - The target weekly sets for each muscle.
     * @param {Array} allExercises - The list of all available exercises.
     * @param {string} equipmentStyle - 'gym' or 'home'.
     * @returns {Array} An array of day objects for the week.
     */
    _buildWeekTemplate(split, weeklyVolumeTargets, allExercises, equipmentStyle) {
        const weekTemplate = [];
        const equipmentFilter = this._getEquipmentFilter(equipmentStyle);
        let remainingVolume = { ...weeklyVolumeTargets };

        for (const dayLabel in split.days) {
            const dayMuscles = split.days[dayLabel];
            const dayObject = { name: dayLabel, exercises: [] };
            
            // Prioritize Primary exercises first
            dayMuscles.forEach(muscle => {
                if (remainingVolume[muscle] > 0) {
                    const exercises = this._selectExercisesForMuscleGroup(allExercises, muscle, equipmentFilter, 'Primary', 1);
                    if (exercises.length > 0) {
                        dayObject.exercises.push(...exercises);
                        remainingVolume[muscle] -= 3; // Assume a primary lift is 3 sets
                    }
                }
            });
            
            // Fill remaining volume with Secondary exercises
            dayMuscles.forEach(muscle => {
                while (remainingVolume[muscle] > 0) {
                     const exercises = this._selectExercisesForMuscleGroup(allExercises, muscle, equipmentFilter, 'Secondary', 1);
                     if (exercises.length > 0) {
                        dayObject.exercises.push(...exercises);
                        remainingVolume[muscle] -= 3; // Assume a secondary lift is 3 sets
                    } else {
                        break; // No more exercises to add for this muscle
                    }
                }
            });

            weekTemplate.push(dayObject);
        }
        return weekTemplate;
    },

    /**
     * Selects exercises for a given muscle group based on type and count.
     * @param {Array} allExercises - The full list of available exercises.
     * @param {string} muscle - The muscle group.
     * @param {Array} equipmentFilter - Available equipment.
     * @param {string} type - 'Primary' or 'Secondary'.
     * @param {number} count - Number of exercises to select.
     * @returns {Array} An array of exercise objects.
     */
    _selectExercisesForMuscleGroup(allExercises, muscle, equipmentFilter, type, count) {
        const exercisePool = allExercises.filter(ex =>
            ex.muscle.toLowerCase() === muscle.toLowerCase() &&
            (ex.type === type) &&
            (ex.equipment.includes('bodyweight') || ex.equipment.some(e => equipmentFilter.includes(e)))
        );

        // Shuffle and slice to get random exercises
        const selected = exercisePool.sort(() => 0.5 - Math.random()).slice(0, count);

        return selected.map(ex => ({
            exerciseId: `ex_${ex.name.replace(/\s+/g, '_')}`,
            name: ex.name,
            muscle: ex.muscle,
            type: ex.type,
            targetSets: 3, // Default sets, can be adjusted
            targetReps: 8, // Default reps, will be progressed
            targetRIR: 3, // Starting RIR
            targetLoad: null,
            sets: [],
            stallCount: 0,
            note: ''
        }));
    },

    /**
     * Creates the full mesocycle structure by populating each week.
     * @param {Array} weekTemplate - The template for a single week.
     * @param {number} durationWeeks - The total duration of the mesocycle.
     * @returns {object} The complete mesocycle object with all weeks and days.
     */
    _createFullMesocycle(weekTemplate, durationWeeks) {
        const mesocycle = { weeks: {} };

        for (let i = 1; i <= durationWeeks; i++) {
            mesocycle.weeks[i] = {};
            const isDeload = (i === durationWeeks);
            const targetRIR = this._getRirForWeek(i, durationWeeks);

            weekTemplate.forEach((dayTemplate, dayIndex) => {
                const dayKey = dayIndex + 1;
                // Deep copy the template to avoid reference issues
                const newDay = JSON.parse(JSON.stringify(dayTemplate));
                newDay.completed = false;
                
                newDay.exercises.forEach(ex => {
                    ex.targetRIR = targetRIR;
                    // For deload week, cut sets in half
                    if (isDeload) {
                        ex.targetSets = Math.ceil(ex.targetSets / 2);
                    }
                });
                mesocycle.weeks[i][dayKey] = newDay;
            });
        }
        return mesocycle;
    },

    /**
     * Determines the target Reps in Reserve (RIR) for a given week in a mesocycle.
     * @param {number} week - The current week number.
     * @param {number} totalWeeks - The total number of weeks in the mesocycle.
     * @returns {number} The target RIR.
     */
    _getRirForWeek(week, totalWeeks) {
        if (week === totalWeeks) return 4; // Deload week
        const progress = (week - 1) / (totalWeeks - 2); // Normalize progress from 0 to 1
        if (progress < 0.33) return 3; // First third of the cycle
        if (progress < 0.66) return 2; // Middle third of the cycle
        return 1; // Final third before deload
    },

    /**
     * Gets the list of available equipment based on the user's training style.
     * @param {string} style - The user's training style ('gym' or 'home').
     * @returns {Array} A list of equipment tags.
     */
    _getEquipmentFilter(style) {
        if (style === 'gym') return ['barbell', 'dumbbell', 'machine', 'cable', 'rack', 'bench', 'bodyweight', 'pullup-bar'];
        if (style === 'home') return ['bodyweight', 'dumbbell', 'pullup-bar']; // Added pullup-bar for home
        return ['barbell', 'dumbbell', 'machine', 'cable', 'rack', 'bench', 'bodyweight', 'pullup-bar'];
    },
};
