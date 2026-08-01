document.addEventListener("DOMContentLoaded", () => {
    chrome.runtime.sendMessage({ action: "checkStatus" }, (response) => {
        const statusEl = document.getElementById("status");
        if (response && response.active) {
            statusEl.innerText = "Secured (Active)";
            statusEl.className = "status-badge status-active";
        } else {
            statusEl.innerText = "Idle";
            statusEl.className = "status-badge status-idle";
        }
    });
});
