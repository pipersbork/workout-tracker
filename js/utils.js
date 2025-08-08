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
        placeholder = `e.g. ${targetReps} reps @ ${targetRIR} RIR`;
    } else {
        const lastWeekEReps = (lastWeekSet?.reps || 0) + (lastWeekSet?.rir || 0);
        placeholder = lastWeekSet ? `${lastWeekEReps} reps` : `e.g. ${targetReps} reps`;
    }
    
    const hasNote = set.note && set.note.trim() !== '';

    return `
        <div class="set-row" data-set-index="${setIndex}">
            <div class="set-number">${setIndex + 1}</div>
            <div class="set-inputs">
                <input type="number" class="weight-input" placeholder="${lastWeekSet?.weight || '-'}" value="${set.weight || ''}" data-exercise-index="${exIndex}" data-set-index="${setIndex}">
                <input type="text" class="rep-rir-input" placeholder="${placeholder}" value="${set.rawInput || ''}" data-exercise-index="${exIndex}" data-set-index="${setIndex}">
            </div>
            <div class="set-actions">
                <button class="note-btn ${hasNote ? 'has-note' : ''}" data-action="openNoteModal" data-exercise-index="${exIndex}" data-set-index="${setIndex}" aria-label="Add or view note">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 6L9 17l-5-5"></path>
                        <path d="M12 20h.01"></path>
                        <path d="M15 20h.01"></path>
                        <path d="M18 20h.01"></path>
                        <path d="M21 20h.01"></path>
                        <path d="M9 20h.01"></path>
                        <path d="M6 20h.01"></path>
                        <path d="M3 20h.01"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
}
