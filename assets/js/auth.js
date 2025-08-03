const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzxomn7b3HhL_Fjm2gXFxvRvo0cz4CI4ym2ETb2oL37kp1qgxJYzo0hbSmsEv4SYw9Cog/exec";

function handleCredentialResponse(response) {
    console.log("Google ID Token:", response.credential);

    // Store token locally
    localStorage.setItem("googleToken", response.credential);

    // Collect onboarding data
    const data = {
        name: document.getElementById('name')?.value || "",
        goal: document.getElementById('goal')?.value || "",
        experience: document.getElementById('experience')?.value || "",
        style: document.getElementById('style')?.value || "",
        days: document.getElementById('days')?.value || "",
        token: response.credential
    };

    // Send to Apps Script for saving
    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "onboarding", data })
    })
    .then(res => res.json())
    .then(result => {
        console.log("Onboarding synced:", result);
    })
    .catch(err => console.error("Sync error:", err));
}
