document.addEventListener('DOMContentLoaded', () => {
  const workoutTab = document.getElementById('tab-workout');
  const historyTab = document.getElementById('tab-history');
  const workoutContent = document.getElementById('workout-content');
  const historyContent = document.getElementById('history-content');

  // Switch to Workout tab
  workoutTab.addEventListener('click', () => {
    workoutContent.style.display = 'block';
    historyContent.style.display = 'none';
    highlightTab(workoutTab);
  });

  // Switch to History tab
  historyTab.addEventListener('click', async () => {
    workoutContent.style.display = 'none';
    historyContent.style.display = 'block';
    highlightTab(historyTab);

    // Load workout history
    await loadWorkoutHistory();
  });

  /**
   * Highlight selected tab
   */
  function highlightTab(selectedTab) {
    document.querySelectorAll('.bottom-nav-item').forEach(tab => {
      tab.classList.remove('active');
    });
    selectedTab.classList.add('active');
  }
});

/**
 * Load workout history from IndexedDB and display in UI
 */
async function loadWorkoutHistory() {
  const historyContainer = document.getElementById('history-container');
  historyContainer.innerHTML = '<p>Loading history...</p>';

  try {
    const history = await getWorkoutHistory();
    if (!history || history.length === 0) {
      historyContainer.innerHTML = '<p>No workouts saved yet.</p>';
      return;
    }

    let html = '<h3>Workout History</h3><ul>';
    history.reverse().forEach(item => {
      html += `<li>
        <strong>${new Date(item.date).toLocaleDateString()}</strong><br>
        <pre>${item.plan}</pre>
      </li>`;
    });
    html += '</ul>';

    historyContainer.innerHTML = html;
  } catch (error) {
    historyContainer.innerHTML = '<p>Error loading history.</p>';
    console.error(error);
  }
}
