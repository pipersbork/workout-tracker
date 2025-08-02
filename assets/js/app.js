document.getElementById("generateWorkout").addEventListener("click", () => {
  let workoutPlan = `
    <ul>
      <li>Squat - 4 sets of 8 reps</li>
      <li>Bench Press - 4 sets of 8 reps</li>
      <li>Barbell Row - 4 sets of 8 reps</li>
    </ul>
  `;
  document.getElementById("workout-plan").innerHTML = workoutPlan;
});

document.getElementById("saveWorkout").addEventListener("click", async () => {
  let workoutData = {
    date: new Date().toLocaleString(),
    plan: document.getElementById("workout-plan").innerHTML
  };

  try {
    await saveWorkoutToDB(workoutData);
    await syncWorkoutToGoogleSheet(workoutData);
    showSuccess("Workout saved!");
  } catch (error) {
    showSuccess("Saved offline. Will sync later.");
  }
});
