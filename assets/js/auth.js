const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzxomn7b3HhL_Fjm2gXFxvRvo0cz4CI4ym2ETb2oL37kp1qgxJYzo0hbSmsEv4SYw9Cog/exec";

function handleCredentialResponse(response) {
    // Google sends back an ID token
    const idToken = response.credential;

    // Save token in localStorage
    localStorage.setItem("googleIdToken", idToken);

    // Send token to backend for verification & user info
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: "verifyUser",
            token: idToken
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log("Google Sign-In Verified:", data);
        if (data.email) {
            alert(`Welcome, ${data.email}!`);
        } else {
            alert("Welcome, User!");
        }
    })
    .catch(err => console.error("Sign-In Error:", err));
}
