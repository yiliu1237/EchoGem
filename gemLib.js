// gemLib.js
let gemVisible = false;

// A helper function to toggle the overlay
function toggleGemOverlay() {
  const overlay = document.getElementById("gemOverlay");
  if (!overlay) {
    console.warn("gemOverlay not found!");
    return;
  }

  gemVisible = !gemVisible;
  if (gemVisible) {
    overlay.classList.add("show");

    window.postMessage("PAUSE_ANIMATION", "*");
  } else {
    overlay.classList.remove("show");

    window.postMessage("RESUME_ANIMATION", "*");
  }
}

// Listen for Space in the parent
window.addEventListener("keydown", function (event) {
  if (event.code === "Space" && event.target === document.body) {
    event.preventDefault();
    toggleGemOverlay();
  }
});

// Listen for messages from the iframe 
window.addEventListener("message", (event) => {
  if (event.data === "TOGGLE_GEM") {
    toggleGemOverlay();
  }
});
