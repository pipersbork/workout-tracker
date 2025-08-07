export const planGenerator = {
    generate(userSelections, allExercises, isCustom = false) {
        let template, description;
        
        if (isCustom) {
            const { days, priorityMuscles, goal } = userSelections;
            template = this._buildCustomTemplate(days, priorityMuscles, goal);
            description = `${days}-Day Custom Plan`;
        } else {
            const { experience, goal } = userSelections;
            if (goal === 'muscle') {
                if (experience === 'beginner') { template = this.templates.beginner.muscle; description = "3-Day Full Body Routine"; } 
                else if (experience === 'experienced') { template = this.templates.experienced.muscle; description = "4-Day Upper/Lower Split"; } 
                else { template = this.templates.advanced.muscle; description = "5-Day 'Body Part' Split"; }
            } else {
                template = this.templates.beginner.combined;
                description = "3-Day Full Body & Cardio Plan";
            }
        }

        const equipmentFilter = this._getEquipmentFilter(userSelections.style);
        const builderPlan = { days: [] };
        template.days.forEach(dayTemplate => {
            const newDay = { label: dayTemplate.label, isExpanded: true, muscleGroups: [] };
            dayTemplate.muscles.forEach(muscleGroup => {
                const newMuscleGroup = {
                    muscle: muscleGroup.name.toLowerCase(),
                    focus: muscleGroup.focus,
                    exercises: this._getExercisesForMuscle(allExercises, muscleGroup.name, equipmentFilter, muscleGroup.count)
                };
                newDay.muscleGroups.push(newMuscleGroup);
            });
            builderPlan.days.push(newDay);
        });
        
        return { builderPlan, description };
    },

    _buildCustomTemplate(days, priorityMuscles, goal) {
        let split;
        const baseVolume = { 'Primary': 2, 'Secondary': 1 };
        
        if (days <= 3) split = this.splits.fullBody(days, priorityMuscles, baseVolume);
        else if (days === 4) split = this.splits.upperLower(priorityMuscles, baseVolume);
        else if (days === 5) split = this.splits.pplUpperLower(priorityMuscles, baseVolume);
        else split = this.splits.pplTwice(priorityMuscles, baseVolume);

        return { days: split };
    },
    
    getRirForWeek(week, totalWeeks) {
        if (week === totalWeeks) return 4; // Deload week
        const progress = (week - 1) / (totalWeeks - 2); 
        if (totalWeeks <= 5) {
            if (week === 1) return 3;
            if (week === totalWeeks - 1) return 1;
            return 2;
        } else {
            if (week <= 2) return 3;
            if (week >= totalWeeks - 2) return 1;
            return 2;
        }
    },

    splits: {
        fullBody(days, priorities, volume) {
            const structure = [
                { label: 'Full Body A', muscles: [{ name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Chest', focus: 'Primary', count: volume.Primary }, { name: 'Back', focus: 'Primary', count: volume.Primary }] },
                { label: 'Full Body B', muscles: [{ name: 'Hamstrings', focus: 'Primary', count: volume.Primary }, { name: 'Shoulders', focus: 'Primary', count: volume.Primary }, { name: 'Back', focus: 'Primary', count: volume.Primary }] },
                { label: 'Full Body C', muscles: [{ name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Chest', focus: 'Primary', count: volume.Primary }, { name: 'Core', focus: 'Secondary', count: volume.Secondary }] }
            ];
            return structure.slice(0, days);
        },
        upperLower(priorities, volume) {
            const upperA = { label: 'Upper A', muscles: [{ name: 'Chest', focus: 'Primary', count: volume.Primary }, { name: 'Back', focus: 'Primary', count: volume.Primary }, { name: 'Shoulders', focus: 'Secondary', count: volume.Secondary }, { name: 'Biceps', focus: 'Secondary', count: volume.Secondary }] };
            const lowerA = { label: 'Lower A', muscles: [{ name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Hamstrings', focus: 'Primary', count: volume.Primary }, { name: 'Core', focus: 'Secondary', count: volume.Secondary }] };
            const upperB = { label: 'Upper B', muscles: [{ name: 'Shoulders', focus: 'Primary', count: volume.Primary }, { name: 'Back', focus: 'Primary', count: volume.Primary }, { name: 'Chest', focus: 'Secondary', count: volume.Secondary }, { name: 'Triceps', focus: 'Secondary', count: volume.Secondary }] };
            const lowerB = { label: 'Lower B', muscles: [{ name: 'Hamstrings', focus: 'Primary', count: volume.Primary }, { name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Core', focus: 'Secondary', count: volume.Secondary }] };
            
            priorities.forEach(p => {
                [upperA, lowerA, upperB, lowerB].forEach(day => {
                    day.muscles.forEach(mg => {
                        if (mg.name === p) mg.focus = 'Primary';
                    });
                });
            });

            return [upperA, lowerA, upperB, lowerB];
        },
        pplUpperLower(priorities, volume) {
            const push = { label: 'Push', muscles: [{ name: 'Chest', focus: 'Primary', count: volume.Primary }, { name: 'Shoulders', focus: 'Primary', count: volume.Primary }, { name: 'Triceps', focus: 'Secondary', count: volume.Secondary }] };
            const pull = { label: 'Pull', muscles: [{ name: 'Back', focus: 'Primary', count: volume.Primary + 1 }, { name: 'Biceps', focus: 'Secondary', count: volume.Secondary }] };
            const legs = { label: 'Legs', muscles: [{ name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Hamstrings', focus: 'Primary', count: volume.Primary }, { name: 'Core', focus: 'Secondary', count: volume.Secondary }] };
            const upper = { label: 'Upper', muscles: [{ name: 'Chest', focus: 'Primary', count: volume.Secondary }, { name: 'Back', focus: 'Primary', count: volume.Primary }, { name: 'Shoulders', focus: 'Secondary', count: volume.Secondary }] };
            const lower = { label: 'Lower', muscles: [{ name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Hamstrings', focus: 'Primary', count: volume.Primary }] };

            priorities.forEach(p => {
                [push, pull, legs, upper, lower].forEach(day => {
                    day.muscles.forEach(mg => {
                        if (mg.name === p) mg.focus = 'Primary';
                    });
                });
            });

            return [push, pull, legs, upper, lower];
        },
         pplTwice(priorities, volume) {
            const push1 = { label: 'Push 1', muscles: [{ name: 'Chest', focus: 'Primary', count: volume.Primary }, { name: 'Shoulders', focus: 'Primary', count: volume.Primary }, { name: 'Triceps', focus: 'Secondary', count: volume.Secondary }] };
            const pull1 = { label: 'Pull 1', muscles: [{ name: 'Back', focus: 'Primary', count: volume.Primary + 1 }, { name: 'Biceps', focus: 'Secondary', count: volume.Secondary }] };
            const legs1 = { label: 'Legs 1', muscles: [{ name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Hamstrings', focus: 'Primary', count: volume.Primary }, { name: 'Core', focus: 'Secondary', count: volume.Secondary }] };
            const push2 = { label: 'Push 2', muscles: [{ name: 'Shoulders', focus: 'Primary', count: volume.Primary }, { name: 'Chest', focus: 'Primary', count: volume.Primary }, { name: 'Triceps', focus: 'Secondary', count: volume.Secondary }] };
            const pull2 = { label: 'Pull 2', muscles: [{ name: 'Back', focus: 'Primary', count: volume.Primary + 1 }, { name: 'Biceps', focus: 'Secondary', count: volume.Secondary }] };
            const legs2 = { label: 'Legs 2', muscles: [{ name: 'Hamstrings', focus: 'Primary', count: volume.Primary }, { name: 'Quads', focus: 'Primary', count: volume.Primary }, { name: 'Core', focus: 'Secondary', count: volume.Secondary }] };
            
            priorities.forEach(p => {
                [push1, pull1, legs1, push2, pull2, legs2].forEach(day => {
                    day.muscles.forEach(mg => {
                        if (mg.name === p) mg.focus = 'Primary';
                    });
                });
            });

            return [push1, pull1, legs1, push2, pull2, legs2];
        }
    },

    _getEquipmentFilter(style) {
        if (style === 'gym') return ['barbell', 'dumbbell', 'machine', 'cable', 'rack', 'bench', 'bodyweight', 'pullup-bar'];
        if (style === 'home') return ['bodyweight', 'dumbbell'];
        return ['barbell', 'dumbbell', 'machine', 'cable', 'rack', 'bench', 'bodyweight', 'pullup-bar'];
    },

    _getExercisesForMuscle(allExercises, muscle, equipmentFilter, count) {
        if (muscle === 'Rest Day') return [];
        const filtered = allExercises.filter(ex => 
            ex.muscle === muscle && 
            (ex.equipment.includes('bodyweight') || ex.equipment.some(e => equipmentFilter.includes(e)))
        );
        return filtered.sort(() => 0.5 - Math.random()).slice(0, count).map(ex => ex.name);
    },

    getAllTemplates() {
        return [
            { id: 'beginner_muscle', name: 'Beginner Full Body', icon: '🌱', description: 'A 3-day full body routine for new lifters.', config: this.templates.beginner.muscle },
            { id: 'experienced_muscle', name: 'Experienced Upper/Lower', icon: '⚡️', description: 'A 4-day upper/lower split for intermediate lifters.', config: this.templates.experienced.muscle },
            { id: 'advanced_muscle', name: 'Advanced Body Part Split', icon: '🔥', description: 'A 5-day split for advanced lifters focusing on volume.', config: this.templates.advanced.muscle },
        ];
    },

    templates: {
        beginner: {
            muscle: {
                days: [
                    { label: 'Day 1: Full Body A', muscles: [{ name: 'Quads', focus: 'Primary', count: 1 }, { name: 'Chest', focus: 'Primary', count: 1 }, { name: 'Back', focus: 'Primary', count: 1 }, { name: 'Biceps', focus: 'Secondary', count: 1 }] },
                    { label: 'Day 2: Rest', muscles: [{ name: 'Rest Day', focus: 'Primary', count: 0 }] },
                    { label: 'Day 3: Full Body B', muscles: [{ name: 'Hamstrings', focus: 'Primary', count: 1 }, { name: 'Shoulders', focus: 'Primary', count: 1 }, { name: 'Back', focus: 'Primary', count: 1 }, { name: 'Triceps', focus: 'Secondary', count: 1 }] },
                    { label: 'Day 4: Rest', muscles: [{ name: 'Rest Day', focus: 'Primary', count: 0 }] },
                    { label: 'Day 5: Full Body C', muscles: [{ name: 'Quads', focus: 'Primary', count: 1 }, { name: 'Chest', focus: 'Primary', count: 1 }, { name: 'Back', focus: 'Primary', count: 1 }, { name: 'Core', focus: 'Secondary', count: 1 }] },
                ]
            },
            combined: {
                days: [
                    { label: 'Day 1: Full Body', muscles: [{ name: 'Quads', focus: 'Primary', count: 1 }, { name: 'Chest', focus: 'Primary', count: 1 }, { name: 'Back', focus: 'Primary', count: 1 }] },
                    { label: 'Day 2: Cardio', muscles: [{ name: 'Cardio', focus: 'Primary', count: 1 }] },
                    { label: 'Day 3: Full Body', muscles: [{ name: 'Hamstrings', focus: 'Primary', count: 1 }, { name: 'Shoulders', focus: 'Primary', count: 1 }, { name: 'Back', focus: 'Primary', count: 1 }] },
                ]
            }
        },
        experienced: {
            muscle: {
                days: [
                    { label: 'Day 1: Upper A', muscles: [{ name: 'Chest', focus: 'Primary', count: 2 }, { name: 'Back', focus: 'Primary', count: 2 }, { name: 'Shoulders', focus: 'Secondary', count: 1 }, { name: 'Biceps', focus: 'Secondary', count: 1 }] },
                    { label: 'Day 2: Lower A', muscles: [{ name: 'Quads', focus: 'Primary', count: 2 }, { name: 'Hamstrings', focus: 'Primary', count: 1 }, { name: 'Core', focus: 'Secondary', count: 1 }] },
                    { label: 'Day 3: Rest', muscles: [{ name: 'Rest Day', focus: 'Primary', count: 0 }] },
                    { label: 'Day 4: Upper B', muscles: [{ name: 'Back', focus: 'Primary', count: 2 }, { name: 'Shoulders', focus: 'Primary', count: 2 }, { name: 'Chest', focus: 'Secondary', count: 1 }, { name: 'Triceps', focus: 'Secondary', count: 1 }] },
                ]
            }
        },
        advanced: {
            muscle: {
                days: [
                    { label: 'Day 1: Push', muscles: [{ name: 'Chest', focus: 'Primary', count: 2 }, { name: 'Shoulders', focus: 'Primary', count: 2 }, { name: 'Triceps', focus: 'Secondary', count: 2 }] },
                    { label: 'Day 2: Pull', muscles: [{ name: 'Back', focus: 'Primary', count: 3 }, { name: 'Biceps', focus: 'Secondary', count: 2 }] },
                    { label: 'Day 3: Legs', muscles: [{ name: 'Quads', focus: 'Primary', count: 2 }, { name: 'Hamstrings', focus: 'Primary', count: 2 }, { name: 'Core', focus: 'Secondary', count: 1 }] },
                    { label: 'Day 4: Rest', muscles: [{ name: 'Rest Day', focus: 'Primary', count: 0 }] },
                    { label: 'Day 5: Upper', muscles: [{ name: 'Chest', focus: 'Primary', count: 1 }, { name: 'Back', focus: 'Primary', count: 2 }, { name: 'Shoulders', focus: 'Secondary', count: 1 }, { name: 'Biceps', focus: 'Secondary', count: 1 }, { name: 'Triceps', focus: 'Secondary', count: 1 }] },
                ]
            }
        }
    }
};
