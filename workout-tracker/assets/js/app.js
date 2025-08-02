document.addEventListener('DOMContentLoaded', () => {
  const generateBtn = document.getElementById('generateWorkout');
  const saveBtn = document.getElementById('saveWorkout');
  const workoutPlanDiv = document.getElementById('workout-plan');

  generateBtn.addEventListener('click', async () => {
    const pref = await getPreferences();
    if (!pref) {
      alert("Complete onboarding first.");
      return;
    }

    const schedule = generateWeeklySchedule(pref);
    displayWorkoutPlan(schedule, workoutPlanDiv);
  });

  saveBtn.addEventListener('click', async () => {
    const pref = await getPreferences();
    const scheduleText = workoutPlanDiv.innerText;
    if (!scheduleText) {
      alert("Generate a workout first!");
      return;
    }

    // Save locally and sync to Google Sheets
    await saveWorkoutToDB({ date: new Date().toISOString(), plan: scheduleText });
    await syncWorkoutToGoogleSheet({ date: new Date().toISOString(), plan: scheduleText });

    alert("Workout saved successfully!");
  });
});

/**
 * Generate Weekly Schedule (Hybrid-Ready)
 */
function generateWeeklySchedule(pref) {
  const { goal, experience, equipment, frequency, includeCardio, cardioType, cardioSessions } = pref;

  const days = parseInt(frequency);
  let schedule = [];
  let split;

  // Define workout split
  if (days === 2) split = ["Upper", "Lower"];
  else if (days === 3) split = ["Push", "Pull", "Legs"];
  else if (days === 4) split = ["Upper", "Lower", "Upper", "Lower"];
  else if (days === 5) split = ["Push", "Pull", "Legs", "Upper", "Lower"];
  else if (days === 6) split = ["Push", "Pull", "Legs", "Push", "Pull", "Legs"];

  const source = getExerciseList(equipment);

  // Progressive overload base
  const baseSets = experience === "advanced" ? 4 : 3;
  const reps = goal === "strength" ? "4-6" : "8-12";

  // Build strength sessions
  split.forEach((focus, i) => {
    let workout = { day: `Day ${i+1}`, type: "strength", focus, exercises: [] };

    if (focus === "Push") {
      workout.exercises = source.push;
    } else if (focus === "Pull") {
      workout.exercises = source.pull;
    } else if (focus === "Legs") {
      workout.exercises = source.legs;
    } else {
      // Upper or Lower fallback
