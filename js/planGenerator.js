import { state } from './state.js';

/**
 * @file planGenerator.js - The "Workout Engine"
 * This file contains the core business logic for the Progression app. It's responsible for:
 * 1.  Dynamically generating entire, individualized mesocycles based on user profile.
 * 2.  Calculating week-to-week progression based on user performance and feedback (auto-regulation).
 * 3.  Generating real-time, intra-workout recommendations for the next set.
 * 4.  Implementing training principles like Volume Landmarks (MV, MEV, MRV) and RIR-based periodization.
 */

// --- DATA & CONSTANTS ---

const VOLUME_LANDMARKS = {
    novice:       { mv: 4,  mev: 6,  mav: 10, mrv: 12 },
    beginner:     { mv: 6,  mev: 8,  mav: 12, mrv: 15 },
    intermediate: { mv: 8,  mev: 10, mav: 16, mrv: 20 },
    advanced:     { mv: 10, mev: 12, mav: 18, mrv: 22 },
};

const EXERCISE_COUNT_PER_SESSION = {
    Primary: 1,
    Secondary: 2,
};

// --- WORKOUT ENGINE ---

export const workoutEngine = {

    /**
     * Generates a real-time recommendation for the next set based on the performance of the last set.
     * @param {object} completedSet - The set object that was just completed by the user.
     * @param {object} exercise - The full exercise object from the current workout plan.
     * @returns {string|null} A recommendation string (e.g., "Increase weight to 135 lbs") or null if no recommendation.
     */
    generateIntraWorkoutRecommendation(completedSet, exercise) {
        if (!completedSet.reps || !completedSet.weight) {
            return "Enter weight and reps to get a recommendation.";
        }

        const { weightIncrement } = state.settings;
        const repsPerformed = completedSet.reps;
        const rir = completedSet.rir;
        const targetReps = exercise.targetReps;
        const effectiveReps = repsPerformed + (rir || 0); // Estimated reps to failure

        // If performance is significantly above target, recommend increasing weight.
        if (effectiveReps > targetReps + 2) {
            const newWeight = completedSet.weight + weightIncrement;
            return `We recommend increasing to ${newWeight} ${state.settings.units}`;
        }

        // If performance is below target, recommend decreasing weight.
        if (effectiveReps < targetReps - 1 && completedSet.weight > weightIncrement) {
            const newWeight = completedSet.weight - weightIncrement;
            return `We recommend decreasing to ${newWeight} ${state.settings.units}`;
        }
        
        // If performance is on target, recommend maintaining weight.
        if (effectiveReps >= targetReps && effectiveReps <= targetReps + 2) {
            return `Good set! Stay at ${completedSet.weight} ${state.settings.units}`;
        }

        return "No recommendation at this time.";
    },

    generateNewMesocycle(userSelections, allExercises, durationWeeks) {
        const { trainingAge, goal, daysPerWeek } = userSelections;
        const split = this._getSplitForDays(daysPerWeek);
        const landmarks = VOLUME_LANDMARKS[trainingAge] || VOLUME_LANDMARKS.beginner;
        const weeklyVolumeTargets = this._calculateInitialWeeklyVolume(split.muscles, landmarks.mev);
        const weeklyTemplate = this._buildWeekTemplate(split, weeklyVolumeTargets, allExercises, userSelections.style);
        const mesocycle = this._createFullMesocycle(weeklyTemplate, durationWeeks);
        return mesocycle;
    },

    calculateNextWorkoutProgression(completedWorkout, nextWorkout) {
        const { progressionModel, weightIncrement } = state.settings;

        completedWorkout.exercises.forEach((completedEx) => {
            const nextWeekEx = nextWorkout.exercises.find(ex => ex.exerciseId === completedEx.exerciseId);
            if (!nextWeekEx) return;

            const jointPainFeedback = state.feedbackState.jointPain[completedEx.exerciseId];
            if (jointPainFeedback === 'moderate' || jointPainFeedback === 'severe') {
                const alternative = this._findAlternativeExercise(completedEx.exerciseId, state.exercises);
                if (alternative) {
                    nextWeekEx.name = alternative.name;
                    nextWeekEx.exerciseId = `ex_${alternative.name.replace(/\s+/g, '_')}`;
                    nextWeekEx.targetLoad = null; 
                    nextWeekEx.targetReps = 8;
                    console.log(`Substituted ${completedEx.name} with ${alternative.name} due to joint pain.`);
                    return;
                }
            }
            
            const muscleSoreness = state.feedbackState.soreness[completedEx.muscle.toLowerCase()];
            if ((muscleSoreness === 'moderate' || muscleSoreness === 'severe') && nextWeekEx.targetSets > 1) {
                nextWeekEx.targetSets -= 1;
                console.log(`Reduced sets for ${nextWeekEx.name} next week due to soreness.`);
            }

            if (!completedEx.sets || completedEx.sets.length === 0) {
                nextWeekEx.targetLoad = completedEx.targetLoad || null;
                nextWeekEx.targetReps = completedEx.targetReps;
                return;
            }

            const topSet = completedEx.sets.reduce((max, set) => ((set.weight || 0) > (max.weight || 0) ? set : max), { weight: 0 });
            
            if (progressionModel === 'double') {
                const repsAchievedInTopSet = topSet.reps || 0;
                const targetRepsForNextWeek = nextWeekEx.targetReps;

                if (repsAchievedInTopSet >= (targetRepsForNextWeek + 2)) {
                    nextWeekEx.targetLoad = (topSet.weight || 0) + weightIncrement;
                    nextWeekEx.targetReps = 8;
                } else if (repsAchievedInTopSet >= targetRepsForNextWeek) {
                    nextWeekEx.targetLoad = topSet.weight;
                    nextWeekEx.targetReps = (nextWeekEx.targetReps || 8) + 1;
                } else {
                    nextWeekEx.targetLoad = topSet.weight;
                    nextWeekEx.targetReps = nextWeekEx.targetReps;
                }
            } else { 
                const allSetsSuccessful = completedEx.sets.every(set => (set.reps || 0) >= completedEx.targetReps);
                nextWeekEx.targetLoad = allSetsSuccessful ? (topSet.weight || 0) + weightIncrement : topSet.weight;
                nextWeekEx.targetReps = completedEx.targetReps;
            }
        });
    },

    // --- PRIVATE HELPER FUNCTIONS ---

    _getSplitForDays(days) {
        if (days <= 3) {
            return { 
                name: 'Full Body', 
                days: {
                    'Full Body A': ['quads', 'chest', 'back', 'shoulders'],
                    'Full Body B': ['hamstrings', 'back', 'chest', 'biceps', 'triceps'],
                    'Full Body C': ['quads', 'shoulders', 'back', 'core']
                },
                muscles: ['chest', 'back', 'quads', 'hamstrings', 'shoulders', 'biceps', 'triceps', 'core']
            };
        } else if (days === 4) {
            return { 
                name: 'Upper/Lower', 
                days: {
                    'Upper A': ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
                    'Lower A': ['quads', 'hamstrings', 'core'],
                    'Upper B': ['back', 'chest', 'shoulders', 'triceps', 'biceps'],
                    'Lower B': ['hamstrings', 'quads', 'core']
                },
                muscles: ['chest', 'back', 'quads', 'hamstrings', 'shoulders', 'biceps', 'triceps', 'core']
            };
        } else {
            return { 
                name: 'Push/Pull/Legs', 
                days: {
                    'Push': ['chest', 'shoulders', 'triceps'],
                    'Pull': ['back', 'biceps'],
                    'Legs': ['quads', 'hamstrings', 'core'],
                },
                muscles: ['chest', 'back', 'quads', 'hamstrings', 'shoulders', 'biceps', 'triceps', 'core']
            };
        }
    },

    _calculateInitialWeeklyVolume(musclesInSplit, targetVolume) {
        const weeklyVolume = {};
        musclesInSplit.forEach(muscle => {
            weeklyVolume[muscle] = targetVolume;
        });
        if (weeklyVolume.biceps) weeklyVolume.biceps = Math.round(targetVolume * 0.75);
        if (weeklyVolume.triceps) weeklyVolume.triceps = Math.round(targetVolume * 0.75);
        if (weeklyVolume.core) weeklyVolume.core = Math.round(targetVolume * 0.75);
        return weeklyVolume;
    },

    _buildWeekTemplate(split, weeklyVolumeTargets, allExercises, equipmentStyle) {
        const weekTemplate = [];
        const equipmentFilter = this._getEquipmentFilter(equipmentStyle);
        let remainingVolume = { ...weeklyVolumeTargets };

        for (const dayLabel in split.days) {
            const dayMuscles = split.days[dayLabel];
            const dayObject = { name: dayLabel, exercises: [] };
            
            dayMuscles.forEach(muscle => {
                if (remainingVolume[muscle] > 0) {
                    const exercises = this._selectExercisesForMuscleGroup(allExercises, muscle, equipmentFilter, 'Primary', 1);
                    if (exercises.length > 0) {
                        dayObject.exercises.push(...exercises);
                        remainingVolume[muscle] -= 3;
                    }
                }
            });
            
            dayMuscles.forEach(muscle => {
                while (remainingVolume[muscle] > 0) {
                     const exercises = this._selectExercisesForMuscleGroup(allExercises, muscle, equipmentFilter, 'Secondary', 1);
                     if (exercises.length > 0) {
                        dayObject.exercises.push(...exercises);
                        remainingVolume[muscle] -= 3;
                    } else {
                        break;
                    }
                }
            });

            weekTemplate.push(dayObject);
        }
        return weekTemplate;
    },

    _selectExercisesForMuscleGroup(allExercises, muscle, equipmentFilter, type, count) {
        const exercisePool = allExercises.filter(ex =>
            ex.muscle.toLowerCase() === muscle.toLowerCase() &&
            (ex.type === type) &&
            (ex.equipment.includes('bodyweight') || ex.equipment.some(e => equipmentFilter.includes(e)))
        );

        const selected = exercisePool.sort(() => 0.5 - Math.random()).slice(0, count);

        return selected.map(ex => ({
            exerciseId: `ex_${ex.name.replace(/\s+/g, '_')}`,
            name: ex.name,
            muscle: ex.muscle,
            type: ex.type,
            targetSets: 3,
            targetReps: 8,
            targetRIR: 3,
            targetLoad: null,
            sets: [],
            stallCount: 0,
            note: ''
        }));
    },
    
    _findAlternativeExercise(exerciseId, allExercises) {
        const originalExerciseName = exerciseId.replace('ex_', '').replace(/_/g, ' ');
        const originalExercise = allExercises.find(ex => ex.name === originalExerciseName);
        if (!originalExercise || !originalExercise.alternatives || originalExercise.alternatives.length === 0) {
            return null;
        }
        const alternativeName = originalExercise.alternatives[0];
        return allExercises.find(ex => ex.name === alternativeName) || null;
    },

    _createFullMesocycle(weekTemplate, durationWeeks) {
        const mesocycle = { weeks: {} };

        for (let i = 1; i <= durationWeeks; i++) {
            mesocycle.weeks[i] = {};
            const isDeload = (i === durationWeeks);
            const targetRIR = this._getRirForWeek(i, durationWeeks);

            weekTemplate.forEach((dayTemplate, dayIndex) => {
                const dayKey = dayIndex + 1;
                const newDay = JSON.parse(JSON.stringify(dayTemplate));
                newDay.completed = false;
                
                newDay.exercises.forEach(ex => {
                    ex.targetRIR = targetRIR;
                    if (isDeload) {
                        ex.targetSets = Math.ceil(ex.targetSets / 2);
                    }
                });
                mesocycle.weeks[i][dayKey] = newDay;
            });
        }
        return mesocycle;
    },

    _getRirForWeek(week, totalWeeks) {
        if (week === totalWeeks) return 4;
        const progress = (week - 1) / (totalWeeks - 2);
        if (progress < 0.33) return 3;
        if (progress < 0.66) return 2;
        return 1;
    },

    _getEquipmentFilter(style) {
        if (style === 'gym') return ['barbell', 'dumbbell', 'machine', 'cable', 'rack', 'bench', 'bodyweight', 'pullup-bar'];
        if (style === 'home') return ['bodyweight', 'dumbbell', 'pullup-bar'];
        return ['barbell', 'dumbbell', 'machine', 'cable', 'rack', 'bench', 'bodyweight', 'pullup-bar'];
    },
};
