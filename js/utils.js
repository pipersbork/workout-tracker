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
 * @param {object} set - The set data object, containing weight, rawInput, and note.
 * @param {object} lastWeekSet - The data for the corresponding set from the previous week.
 * @param {number} targetReps - The target number of reps for the set.
 * @param {number} targetRIR - The target Reps in Reserve for the set.
 * @param {number} week - The current week number.
 * @returns {string} The HTML string for the set row.
 */
export function createSetRowHTML(exIndex, setIndex, set, lastWeekSet, targetReps, targetRIR, week) {
    let placeholder;
    if (week === 1) {
        // For the first week, the placeholder is based on target RIR
        placeholder = `e.g. ${targetReps} reps @ ${targetRIR} RIR`;
    } else {
        // For subsequent weeks, the placeholder is based on the previous week's performance
        const lastWeekEReps = (lastWeekSet?.reps || 0) + (lastWeekSet?.rir || 0);
        placeholder = lastWeekSet ? `${lastWeekEReps} reps` : `e.g. ${targetReps} reps`;
    }
    
    // A set is considered logged if it has the `isLogged` flag.
    const isLogged = set.isLogged;

    return `
        <div class="set-row ${isLogged ? 'logged' : ''}" data-set-index="${setIndex}">
            <div class="set-number">${setIndex + 1}</div>
            <div class="set-inputs">
                <input type="number" class="weight-input" placeholder="${lastWeekSet?.weight || '-'}" value="${set.weight || ''}" data-exercise-index="${exIndex}" data-set-index="${setIndex}">
                <input type="text" class="rep-rir-input" placeholder="${placeholder}" value="${set.rawInput || ''}" data-exercise-index="${exIndex}" data-set-index="${setIndex}">
            </div>
            <div class="set-actions">
                <button class="log-set-btn" data-action="logSet" data-exercise-index="${exIndex}" data-set-index="${setIndex}" aria-label="Log Set">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </button>
            </div>
        </div>
    `;
}
