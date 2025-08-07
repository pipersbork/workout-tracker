import { state } from './state.js';

/**
 * @file utils.js contains small, reusable helper functions used throughout the application.
 */

/**
 * Capitalizes the first letter of a string.
 * @param {string} str - The string to capitalize.
 * @returns {string} The capitalized string.
 */
export function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

/**
 * Creates the HTML for a single set row in the daily workout view.
 * @param {number} exIndex - The index of the exercise.
 * @param {number} setIndex - The index of the set.
 * @param {number} weight - The weight for the set.
 * @param {string} rawInput - The raw text input for reps/RIR.
 * @param {object} lastWeekSet - The data for the corresponding set from the previous week.
 * @param {number} targetReps - The target number of reps for the set.
 * @param {number} targetRIR - The target Reps in Reserve for the set.
 * @param {number} week - The current week number.
 * @returns {string} The HTML string for the set row.
 */
export function createSetRowHTML(exIndex, setIndex, weight, rawInput, lastWeekSet, targetReps, targetRIR, week) {
    let placeholder;
    if (week === 1) {
        // For the first week, the placeholder is based on target RIR
        placeholder = `e.g. ${targetReps} reps @ ${targetRIR} RIR`;
    } else {
        // For subsequent weeks, the placeholder is based on the previous week's performance
        const lastWeekEReps = (lastWeekSet?.reps || 0) + (lastWeekSet?.rir || 0);
        placeholder = lastWeekSet ? `${lastWeekEReps} reps` : `e.g. ${targetReps} reps`;
    }
    return `
        <div class="set-row" data-set-index="${setIndex}">
            <div class="set-number">${setIndex + 1}</div>
            <div class="set-inputs">
                <input type="number" class="weight-input" placeholder="${lastWeekSet?.weight || '-'}" value="${weight || ''}" data-exercise-index="${exIndex}" data-set-index="${setIndex}">
                <input type="text" class="rep-rir-input" placeholder="${placeholder}" value="${rawInput || ''}" data-exercise-index="${exIndex}" data-set-index="${setIndex}">
            </div>
        </div>
    `;
}
