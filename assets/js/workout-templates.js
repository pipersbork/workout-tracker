function getWorkoutTemplate(days) {
  return [
    { day: "Push", exercises: [{name:"Bench Press", sets:4, weight:135},{name:"Overhead Press", sets:3, weight:95}] },
    { day: "Pull", exercises: [{name:"Deadlift", sets:3, weight:225},{name:"Pull-Ups", sets:4, weight:0}] }
  ];
}
