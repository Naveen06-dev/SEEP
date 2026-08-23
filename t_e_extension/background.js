// t_e Test Environment Shield - Background Service Worker (Manifest V3)
// Implements Fail-Closed Security State Machine & Enterprise Proctoring Engine

const API_BASE = "http://localhost:4000";
const ALLOWED_EXTENSION_IDS = []; // Administrator allowlist (Chrome runtime ID auto-excluded)

let currentSecurityState = "IDLE"; // IDLE | CHECKING | DISABLING | VERIFYING | SECURE | EXAM_ACTIVE | FAILED | RESTORING
let activeExamSession = null;
let disabledExtensionsList = [];
let heartbeatIntervalTimer = null;

// Initialize Storage Defaults
chrome.runtime.onInstalled.addListener(async () => {
    await updateStorageState({
        securityState: "IDLE",
        examActive: false,
        examId: null,
        studentId: null,
        sessionToken: null,
        disabledExtensions: [],
        lastError: null
    });
    console.log("🛡️ t_e Extension initialized successfully.");
});

// Listener for messages from Content Script / Web App
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_TE_STATUS" || request.action === "checkStatus") {
        getSecurityStatus().then((status) => sendResponse(status));
        return true;
    } else if (request.action === "START_TE_EXAM" || request.action === "START_NEOEXAMSHIELD") {
        handleStartExamWorkflow(request).then((res) => sendResponse(res));
        return true;
    } else if (request.action === "STOP_TE_EXAM" || request.action === "STOP_NEOEXAMSHIELD") {
        handleStopExamWorkflow().then((res) => sendResponse(res));
        return true;
    } else if (request.action === "GET_EXTENSIONS_LIST") {
        getLiveExtensionsList().then((res) => sendResponse(res));
        return true;
    } else if (request.action === "TOGGLE_EXTENSION") {
        toggleLiveExtension(request.id, request.enabled).then((res) => sendResponse(res));
        return true;
    } else if (request.action === "DISABLE_ALL_OTHER_EXTENSIONS") {
        disableAllOtherLiveExtensions().then((res) => sendResponse(res));
        return true;
    } else if (request.action === "LOG_EVENT") {
        logSecurityEvent(request.eventType, request.metadata || {}).then(() => sendResponse({ ok: true }));
        return true;
    }
});

/**
 * Core Security Verification Workflow: Scan -> Disable -> Verify -> Secure
 */
async function runSecurityCheckAndDisable() {
    currentSecurityState = "CHECKING";
    await updateStorageState({ securityState: "CHECKING", lastError: null });

    try {
        const selfId = chrome.runtime.id;
        const allExtensions = await chrome.management.getAll();

        // 1. Scan for active unauthorized extensions
        const unauthorizedActive = allExtensions.filter((ext) => {
            if (ext.id === selfId) return false;
            if (ALLOWED_EXTENSION_IDS.includes(ext.id)) return false;
            if (ext.type !== "extension") return false;
            return ext.enabled === true;
        });

        disabledExtensionsList = [];

        // 2. Attempt to disable unauthorized enabled extensions
        if (unauthorizedActive.length > 0) {
            currentSecurityState = "DISABLING";
            await updateStorageState({ securityState: "DISABLING" });

            for (const ext of unauthorizedActive) {
                try {
                    // Record state prior to disabling
                    disabledExtensionsList.push({
                        id: ext.id,
                        name: ext.name,
                        wasEnabled: true
                    });

                    await chrome.management.setEnabled(ext.id, false);
                    console.log(`t_e: Successfully disabled extension: ${ext.name} (${ext.id})`);
                } catch (err) {
                    console.error(`t_e: Failed to disable extension ${ext.name} (${ext.id}):`, err);
                    currentSecurityState = "FAILED";

                    const failedPayload = {
                        type: "UNABLE_TO_DISABLE_EXTENSION",
                        extensionId: ext.id,
                        extensionName: ext.name,
                        error: err.message
                    };

                    await updateStorageState({ securityState: "FAILED", lastError: failedPayload });
                    await logSecurityEvent("UNABLE_TO_DISABLE_EXTENSION", failedPayload);

                    return {
                        secure: false,
                        securityState: "FAILED",
                        reason: "UNABLE_TO_DISABLE_EXTENSION",
                        failedExtension: { id: ext.id, name: ext.name }
                    };
                }
            }
        }

        // 3. Verification Re-Scan (Do NOT trust setEnabled return value alone)
        currentSecurityState = "VERIFYING";
        await updateStorageState({ securityState: "VERIFYING", disabledExtensions: disabledExtensionsList });

        const reScanExtensions = await chrome.management.getAll();
        const remainingUnauthorized = reScanExtensions.filter((ext) => {
            if (ext.id === selfId) return false;
            if (ALLOWED_EXTENSION_IDS.includes(ext.id)) return false;
            if (ext.type !== "extension") return false;
            return ext.enabled === true;
        }).map(ext => ({ id: ext.id, name: ext.name, enabled: true }));

        if (remainingUnauthorized.length > 0) {
            currentSecurityState = "FAILED";
            const verifyFailedPayload = {
                type: "EXTENSION_REMAINED_ENABLED",
                unauthorizedExtensions: remainingUnauthorized
            };
            await updateStorageState({ securityState: "FAILED", lastError: verifyFailedPayload });
            await logSecurityEvent("EXTENSION_REMAINED_ENABLED", verifyFailedPayload);

            return {
                secure: false,
                securityState: "FAILED",
                reason: "UNAUTHORIZED_EXTENSION_ENABLED",
                enabledUnauthorizedExtensions: remainingUnauthorized
            };
        }

        // 4. Success Condition
        currentSecurityState = "SECURE";
        await updateStorageState({ securityState: "SECURE" });

        return {
            secure: true,
            securityState: "SECURE",
            disabledCount: disabledExtensionsList.length
        };

    } catch (err) {
        console.error("t_e: Unexpected scan error:", err);
        currentSecurityState = "FAILED";
        await updateStorageState({ securityState: "FAILED", lastError: err.message });
        return {
            secure: false,
            securityState: "FAILED",
            reason: "SCAN_EXCEPTION",
            details: err.message
        };
    }
}

/**
 * Handle Start Exam Workflow
 */
async function handleStartExamWorkflow(request) {
    const securityResult = await runSecurityCheckAndDisable();
    if (!securityResult.secure) {
        return securityResult;
    }

    const { sessionToken, examId, studentId } = request;
    activeExamSession = {
        sessionToken: sessionToken || `ext-session-${Date.now()}`,
        examId: examId || 'exam-demo-1',
        studentId: studentId || 'student-1',
        startedAt: new Date().toISOString()
    };

    currentSecurityState = "EXAM_ACTIVE";
    await updateStorageState({
        securityState: "EXAM_ACTIVE",
        examActive: true,
        examId: activeExamSession.examId,
        studentId: activeExamSession.studentId,
        sessionToken: activeExamSession.sessionToken
    });

    startHeartbeatEngine();
    await logSecurityEvent("EXAM_STARTED", { sessionToken: activeExamSession.sessionToken });

    return {
        success: true,
        secure: true,
        securityState: "EXAM_ACTIVE",
        sessionToken: activeExamSession.sessionToken,
        disabledCount: disabledExtensionsList.length
    };
}

/**
 * Handle Stop Exam Workflow & Restoring Extensions
 */
async function handleStopExamWorkflow() {
    currentSecurityState = "RESTORING";
    stopHeartbeatEngine();
    await updateStorageState({ securityState: "RESTORING" });

    const storedData = await chrome.storage.local.get(["disabledExtensions"]);
    const toRestore = storedData.disabledExtensions || disabledExtensionsList;

    for (const extObj of toRestore) {
        if (extObj.wasEnabled) {
            try {
                await chrome.management.setEnabled(extObj.id, true);
                console.log(`t_e: Restored extension: ${extObj.name || extObj.id}`);
            } catch (err) {
                console.warn(`t_e: Failed to restore extension ${extObj.id}:`, err);
            }
        }
    }

    if (activeExamSession) {
        await logSecurityEvent("EXAM_STOPPED", { sessionToken: activeExamSession.sessionToken });
    }

    activeExamSession = null;
    disabledExtensionsList = [];
    currentSecurityState = "IDLE";

    await updateStorageState({
        securityState: "IDLE",
        examActive: false,
        examId: null,
        studentId: null,
        sessionToken: null,
        disabledExtensions: [],
        lastError: null
    });

    return { success: true, securityState: "IDLE" };
}

/**
 * Heartbeat Engine using chrome.alarms (Manifest V3 compatible) + fallback timer
 */
function startHeartbeatEngine() {
    stopHeartbeatEngine();
    chrome.alarms.create("te-heartbeat-alarm", { periodInMinutes: 0.05 }); // ~3s
    heartbeatIntervalTimer = setInterval(() => {
        sendBackendHeartbeat();
    }, 3000);
}

function stopHeartbeatEngine() {
    chrome.alarms.clear("te-heartbeat-alarm");
    if (heartbeatIntervalTimer) {
        clearInterval(heartbeatIntervalTimer);
        heartbeatIntervalTimer = null;
    }
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "te-heartbeat-alarm") {
        sendBackendHeartbeat();
    }
});

async function sendBackendHeartbeat() {
    if (!activeExamSession) return;
    try {
        const res = await fetch(`${API_BASE}/api/extension/heartbeat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sessionToken: activeExamSession.sessionToken,
                examId: activeExamSession.examId,
                studentId: activeExamSession.studentId,
                timestamp: Date.now()
            })
        });
        const data = await res.json();
        if (data && data.status === "LOCKED") {
            console.warn("t_e: Backend locked session due to heartbeat violation.");
        }
    } catch (err) {
        console.warn("t_e: Heartbeat network ping notice:", err.message);
    }
}

/**
 * Log Security Events to Backend Telemetry
 */
async function logSecurityEvent(eventType, metadata = {}) {
    try {
        await fetch(`${API_BASE}/api/extension/log-event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                eventType,
                sessionToken: activeExamSession ? activeExamSession.sessionToken : null,
                examId: activeExamSession ? activeExamSession.examId : null,
                studentId: activeExamSession ? activeExamSession.studentId : null,
                timestamp: Date.now(),
                metadata
            })
        });
    } catch (err) {
        console.warn("t_e: Security log event notice:", err.message);
    }
}

/**
 * Get Security Status for Popup / Content Script
 */
async function getSecurityStatus() {
    const data = await chrome.storage.local.get([
        "securityState", "examActive", "examId", "studentId", "disabledExtensions", "lastError"
    ]);

    return {
        extensionInstalled: true,
        extensionActive: true,
        securityState: data.securityState || currentSecurityState,
        examActive: data.examActive || false,
        disabledCount: (data.disabledExtensions || []).length,
        lastError: data.lastError || null
    };
}

async function updateStorageState(obj) {
    return new Promise((resolve) => {
        chrome.storage.local.set(obj, () => resolve());
    });
}

/**
 * Browser Startup Recovery - Restore disabled extensions if Chrome closed unexpectedly mid-exam
 */
chrome.runtime.onStartup.addListener(async () => {
    const data = await chrome.storage.local.get(["examActive", "disabledExtensions", "activeExamSession"]);
    if (data.examActive && data.disabledExtensions && data.disabledExtensions.length > 0) {
        console.warn("t_e: Unclean browser shutdown during active exam detected. Restoring disabled extensions...");
        
        for (const extObj of data.disabledExtensions) {
            if (extObj.wasEnabled) {
                try {
                    await chrome.management.setEnabled(extObj.id, true);
                    console.log(`t_e: Restored extension post-restart: ${extObj.name || extObj.id}`);
                } catch (e) {
                    console.warn(`t_e: Startup restoration error for ${extObj.id}:`, e);
                }
            }
        }

        await logSecurityEvent("EXAM_INTERRUPTED_BROWSER_RESTART", {
            sessionToken: data.activeExamSession ? data.activeExamSession.sessionToken : null
        });

        await updateStorageState({
            securityState: "IDLE",
            examActive: false,
            examId: null,
            studentId: null,
            sessionToken: null,
            disabledExtensions: [],
            lastError: { type: "EXAM_INTERRUPTED_BROWSER_RESTART" }
        });
    }
});

/**
 * Live Extension Management for Web Portal Integration
 */
async function getLiveExtensionsList() {
    try {
        const selfId = chrome.runtime.id;
        const all = await chrome.management.getAll();
        const list = all.filter(e => e.type === "extension").map(e => ({
            id: e.id,
            name: e.name,
            description: e.description || "",
            version: e.version || "1.0",
            enabled: e.enabled,
            isSelf: e.id === selfId
        }));
        return { ok: true, extensions: list, selfId };
    } catch(e) {
        return { ok: false, error: e.message, extensions: [] };
    }
}

async function toggleLiveExtension(id, enabled) {
    try {
        await chrome.management.setEnabled(id, enabled);
        return { ok: true, id, enabled };
    } catch(e) {
        return { ok: false, error: e.message };
    }
}

async function disableAllOtherLiveExtensions() {
    try {
        const selfId = chrome.runtime.id;
        const all = await chrome.management.getAll();
        let disabledCount = 0;
        for (const ext of all) {
            if (ext.id !== selfId && ext.type === "extension" && ext.enabled) {
                try {
                    await chrome.management.setEnabled(ext.id, false);
                    disabledCount++;
                } catch(e) {}
            }
        }
        return { ok: true, disabledCount };
    } catch(e) {
        return { ok: false, error: e.message };
    }
}

