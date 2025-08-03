function syncWorkouts(token) {
  const tx = db.transaction('workouts', 'readonly');
  const store = tx.objectStore('workouts');
  const req = store.getAll();
  req.onsuccess = () => {
    const workouts = req.result;
    if (workouts.length === 0) return;

    fetch('YOUR_APPS_SCRIPT_WEB_APP_URL', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, workouts })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        // Clear synced logs
        const txClear = db.transaction('workouts', 'readwrite');
        txClear.objectStore('workouts').clear();
        document.getElementById('logStatus').textContent = "✅ Synced to Google Sheets!";
      }
    })
    .catch(err => console.error("Sync error:", err));
  };
}

function handleCredentialResponse(response) {
  const token = response.credential;
  syncWorkouts(token);
}
