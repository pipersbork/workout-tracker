let GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzxomn7b3HhL_Fjm2gXFxvRvo0cz4CI4ym2ETb2oL37kp1qgxJYzo0hbSmsEv4SYw9Cog/exec";

async function signInWithGoogle() {
  alert("You will be redirected to grant Google permissions.");
  window.open(GAS_WEB_APP_URL, "_blank");
}

document.getElementById("googleSignInBtn").addEventListener("click", signInWithGoogle);

