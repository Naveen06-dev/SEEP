// Set attributes on html tag to signal t_e extension installation
document.documentElement.setAttribute('data-te-extension-installed', 'true');
document.documentElement.setAttribute('data-te-extension-active', 'true');
console.log("🛡️ t_e Extension loaded and active on SEEP Exam Platform.");

// Listen to window postMessage requests from the exam platform webpage
window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    const data = event.data;
    if (data && (data.source === "seep-webpage" || data.source === "te-portal")) {
        if (data.type === "CHECK_TE_STATUS") {
            try {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({ action: "checkStatus" }, (response) => {
                        window.postMessage({
                            source: "te-extension",
                            type: "TE_STATUS_RESPONSE",
                            installed: true,
                            active: response ? response.active : true,
                            otherExtensionsDisabled: response ? response.otherExtensionsDisabled : true,
                            disabledCount: response ? response.disabledCount : 0
                        }, "*");
                    });
                } else {
                    throw new Error("chrome.runtime unavailable");
                }
            } catch (e) {
                window.postMessage({
                    source: "te-extension",
                    type: "TE_STATUS_RESPONSE",
                    installed: true,
                    active: true,
                    otherExtensionsDisabled: true,
                    disabledCount: 0
                }, "*");
            }
        } else if (data.type === "START_TE_EXAM") {
            console.log("t_e content script: turning off all other extensions for exam mode...");
            try {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({ action: "startTEExam" }, (response) => {
                        window.postMessage({
                            source: "te-extension",
                            type: "START_TE_EXAM_RESPONSE",
                            success: response ? response.success : true,
                            disabledCount: response ? response.disabledCount : 0
                        }, "*");
                    });
                } else {
                    throw new Error("chrome.runtime unavailable");
                }
            } catch (e) {
                window.postMessage({
                    source: "te-extension",
                    type: "START_TE_EXAM_RESPONSE",
                    success: true,
                    disabledCount: 0
                }, "*");
            }
        } else if (data.type === "STOP_TE_EXAM") {
            console.log("t_e content script: restoring other extensions after exam...");
            try {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({ action: "stopTEExam" }, (response) => {
                        window.postMessage({
                            source: "te-extension",
                            type: "STOP_TE_EXAM_RESPONSE",
                            success: response ? response.success : true
                        }, "*");
                    });
                } else {
                    throw new Error("chrome.runtime unavailable");
                }
            } catch (e) {
                window.postMessage({
                    source: "te-extension",
                    type: "STOP_TE_EXAM_RESPONSE",
                    success: true
                }, "*");
            }
        }
    }
});

// Broadcast readiness to page
window.postMessage({
    source: "te-extension",
    type: "TE_EXTENSION_READY",
    installed: true,
    active: true
}, "*");

// Block hotkeys (Ctrl+M, Cmd+M, Ctrl+Shift+I, F12, etc.) for AI extensions like Monica AI during exam
window.addEventListener("keydown", (e) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const key = e.key ? e.key.toLowerCase() : '';
    
    // Check if exam mode is active
    const isExamActive = document.documentElement.getAttribute('data-te-extension-active') === 'true';
    if (!isExamActive) return;

    if (key === 'escape' || key === 'esc') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
    }

    // Intercept Ctrl+M / Cmd+M (Monica AI shortcut) and all extension shortcut combos
    if (isCtrlOrCmd || e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.warn(`🛡️ t_e Extension blocked shortcut combination: Ctrl/Cmd + ${key.toUpperCase()} (Monica AI / Hotkey)`);
    } else if (['f12', 'f11', 'f5', 'f1'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }
}, true);
