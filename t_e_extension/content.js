// t_e Test Environment Shield - Content Script Bridge (Manifest V3)
// DOM Handshake, PostMessage Communication Bridge, Capture-Phase Hotkey Monitor

// DOM Handshake Attributes
document.documentElement.setAttribute('data-te-extension-installed', 'true');
document.documentElement.setAttribute('data-te-extension-active', 'true');
document.documentElement.setAttribute('data-neoexamshield-installed', 'true');
document.documentElement.setAttribute('data-neoexamshield-active', 'true');
document.documentElement.setAttribute('data-te-exam-running', 'false');

// Suppress third-party extension background rejection noise
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (event.reason.errorName === 'exceptions.UserAuthError' || (event.reason.message && event.reason.message.includes('permission error')))) {
        event.preventDefault();
    }
});

console.log("🛡️ t_e Extension Security Agent loaded and active on SEEP Platform.");

// Listen to postMessage calls from React Exam Application
window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    const data = event.data;
    if (!data) return;

    const isAuthorizedSource = data.source === "seep-webpage" ||
                               data.source === "te-portal" ||
                               data.source === "neoexamshield-portal";

    if (isAuthorizedSource) {
        if (data.type === "CHECK_TE_STATUS" || data.type === "GET_TE_STATUS" || data.type === "CHECK_NEOEXAMSHIELD_STATUS") {
            try {
                chrome.runtime.sendMessage({ action: "GET_TE_STATUS" }, (response) => {
                    window.postMessage({
                        source: "te-extension",
                        type: "TE_STATUS_RESPONSE",
                        installed: true,
                        extensionInstalled: true,
                        extensionActive: true,
                        securityState: response ? response.securityState : "SECURE",
                        examActive: response ? response.examActive : false,
                        disabledCount: response ? response.disabledCount : 0
                    }, "*");
                });
            } catch (e) {
                window.postMessage({
                    source: "te-extension",
                    type: "TE_STATUS_RESPONSE",
                    installed: true,
                    extensionInstalled: true,
                    extensionActive: true,
                    securityState: "SECURE",
                    examActive: false,
                    disabledCount: 0
                }, "*");
            }
        } else if (data.type === "START_TE_EXAM" || data.type === "START_NEOEXAMSHIELD") {
            document.documentElement.setAttribute('data-te-exam-running', 'true');
            try {
                chrome.runtime.sendMessage({
                    action: "START_TE_EXAM",
                    sessionToken: data.sessionToken,
                    examId: data.examId,
                    studentId: data.studentId
                }, (response) => {
                    window.postMessage({
                        source: "te-extension",
                        type: "START_TE_EXAM_RESPONSE",
                        secure: response ? response.secure : false,
                        securityState: response ? response.securityState : "FAILED",
                        success: response ? response.success : false,
                        reason: response ? response.reason : null,
                        disabledCount: response ? response.disabledCount : 0
                    }, "*");
                });
            } catch (e) {
                window.postMessage({
                    source: "te-extension",
                    type: "START_TE_EXAM_RESPONSE",
                    secure: true,
                    securityState: "EXAM_ACTIVE",
                    success: true,
                    disabledCount: 0
                }, "*");
            }
        } else if (data.type === "STOP_TE_EXAM" || data.type === "STOP_NEOEXAMSHIELD") {
            document.documentElement.setAttribute('data-te-exam-running', 'false');
            try {
                chrome.runtime.sendMessage({ action: "STOP_TE_EXAM" }, (response) => {
                    window.postMessage({
                        source: "te-extension",
                        type: "STOP_TE_EXAM_RESPONSE",
                        success: response ? response.success : true,
                        securityState: "IDLE"
                    }, "*");
                });
            } catch (e) {
                window.postMessage({
                    source: "te-extension",
                    type: "STOP_TE_EXAM_RESPONSE",
                    success: true,
                    securityState: "IDLE"
                }, "*");
            }
        } else if (data.type === "FETCH_LIVE_EXTENSIONS") {
            try {
                chrome.runtime.sendMessage({ action: "GET_EXTENSIONS_LIST" }, (response) => {
                    window.postMessage({
                        source: "te-extension",
                        type: "LIVE_EXTENSIONS_RESPONSE",
                        ok: response ? response.ok : false,
                        extensions: response ? response.extensions : [],
                        selfId: response ? response.selfId : null
                    }, "*");
                });
            } catch (e) {
                window.postMessage({ source: "te-extension", type: "LIVE_EXTENSIONS_RESPONSE", ok: false, extensions: [] }, "*");
            }
        } else if (data.type === "TOGGLE_LIVE_EXTENSION") {
            try {
                chrome.runtime.sendMessage({ action: "TOGGLE_EXTENSION", id: data.id, enabled: data.enabled }, (response) => {
                    window.postMessage({
                        source: "te-extension",
                        type: "TOGGLE_LIVE_EXTENSION_RESPONSE",
                        ok: response ? response.ok : false,
                        id: data.id,
                        enabled: data.enabled
                    }, "*");
                });
            } catch (e) {
                window.postMessage({ source: "te-extension", type: "TOGGLE_LIVE_EXTENSION_RESPONSE", ok: false }, "*");
            }
        } else if (data.type === "DISABLE_ALL_LIVE_EXTENSIONS") {
            try {
                chrome.runtime.sendMessage({ action: "DISABLE_ALL_OTHER_EXTENSIONS" }, (response) => {
                    window.postMessage({
                        source: "te-extension",
                        type: "DISABLE_ALL_LIVE_EXTENSIONS_RESPONSE",
                        ok: response ? response.ok : false,
                        disabledCount: response ? response.disabledCount : 0
                    }, "*");
                });
            } catch (e) {
                window.postMessage({ source: "te-extension", type: "DISABLE_ALL_LIVE_EXTENSIONS_RESPONSE", ok: false }, "*");
            }
        }
    }
});

// Broadcast readiness event to webpage
window.postMessage({
    source: "te-extension",
    type: "TE_EXTENSION_READY",
    installed: true,
    active: true
}, "*");

// Capture-Phase Hotkey & Shortcut Monitor (Only active during active exam running state)
window.addEventListener("keydown", (e) => {
    const isExamRunning = document.documentElement.getAttribute('data-te-exam-running') === 'true';
    if (!isExamRunning) return;

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const key = e.key ? e.key.toLowerCase() : '';
    const code = e.code ? e.code.toLowerCase() : '';

    // Detect Escape Key
    if (key === 'escape' || key === 'esc') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        reportShortcutEvent("ESC_KEY_PRESSED", { key: e.key });
        return;
    }

    // Detect Windows Key / Meta / Win+G
    if (key === 'meta' || key === 'os' || key === 'win' || code.includes('meta') || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        reportShortcutEvent("WINDOWS_META_KEY_TRIGGERED", { key: e.key, code: e.code });
        return;
    }

    // Detect Ctrl+M / Cmd+M (Suspicious Shortcut Event)
    if (isCtrlOrCmd && key === 'm') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log("🛡️ t_e Extension: Suspicious shortcut Ctrl+M / Cmd+M intercepted.");
        reportShortcutEvent("SUSPICIOUS_AI_SHORTCUT_BLOCKED", { shortcut: "Ctrl/Cmd+M" });
        return;
    }

    // Intercept Alt shortcuts or Ctrl/Cmd combinations
    if (isCtrlOrCmd || e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
    }

    // Intercept Developer & Function Keys
    if (['f12', 'f11', 'f5', 'f1'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        reportShortcutEvent("PROHIBITED_F_KEY_BLOCKED", { key: e.key });
        return;
    }
}, true);

function reportShortcutEvent(eventType, metadata) {
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
                action: "LOG_EVENT",
                eventType,
                metadata
            });
        }
    } catch (e) {
        // Ignored in offline fallback
    }
}
