// Set attribute on html tag to prove installation
document.documentElement.setAttribute('data-seep-proctor-installed', 'true');
console.log("SEEP Proctor Extension loaded and active on page.");

// Listen to window postMessage requests from the exam platform webpage
window.addEventListener("message", (event) => {
    // Only accept messages from the same window
    if (event.source !== window) return;

    const data = event.data;
    if (data && data.source === "seep-webpage") {
        if (data.type === "START_SECURE_EXAM") {
            console.log("Content script forwarding START_SECURE_EXAM to background");
            chrome.runtime.sendMessage({ action: "startProctoring" }, (response) => {
                window.postMessage({
                    source: "seep-extension",
                    type: "START_SECURE_EXAM_RESPONSE",
                    success: response ? response.success : false,
                    disabledCount: response ? response.disabledCount : 0
                }, "*");
            });
        } else if (data.type === "STOP_SECURE_EXAM") {
            console.log("Content script forwarding STOP_SECURE_EXAM to background");
            chrome.runtime.sendMessage({ action: "stopProctoring" }, (response) => {
                window.postMessage({
                    source: "seep-extension",
                    type: "STOP_SECURE_EXAM_RESPONSE",
                    success: response ? response.success : false
                }, "*");
            });
        } else if (data.type === "CHECK_EXECUTIVE_STATUS") {
            chrome.runtime.sendMessage({ action: "checkStatus" }, (response) => {
                window.postMessage({
                    source: "seep-extension",
                    type: "CHECK_EXECUTIVE_STATUS_RESPONSE",
                    active: response ? response.active : false,
                    disabledExtensions: response ? response.disabledExtensions : []
                }, "*");
            });
        }
    }
});
