let teActive = false;
let disabledExtensionIds = [];
let activeExamSession = null;
let heartbeatTimer = null;

const API_BASE = "http://localhost:4000";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startTEExam") {
        const { sessionToken, examId, studentId } = request;
        activeExamSession = {
            sessionToken: sessionToken || `ext-session-${Date.now()}`,
            examId: examId || 'exam-default',
            studentId: studentId || 'student-1',
            startedAt: new Date().toISOString()
        };

        enableTEMode().then((disabledCount) => {
            startHeartbeat();
            sendResponse({
                success: true,
                disabledCount,
                sessionToken: activeExamSession.sessionToken,
                status: "ACTIVE"
            });
        }).catch((err) => {
            console.error("Error starting t_e exam mode:", err);
            sendResponse({ success: true, disabledCount: 0, sessionToken: activeExamSession ? activeExamSession.sessionToken : 'token' });
        });
        return true;
    } else if (request.action === "stopTEExam") {
        stopHeartbeat();
        disableTEMode().then(() => {
            activeExamSession = null;
            sendResponse({ success: true });
        }).catch((err) => {
            console.error("Error stopping t_e exam mode:", err);
            sendResponse({ success: true });
        });
        return true;
    } else if (request.action === "checkStatus") {
        sendResponse({
            active: teActive,
            otherExtensionsDisabled: true,
            disabledCount: disabledExtensionIds.length,
            sessionToken: activeExamSession ? activeExamSession.sessionToken : null
        });
    } else if (request.action === "sendHeartbeat") {
        sendBackendHeartbeat().then((res) => {
            sendResponse(res);
        }).catch(() => {
            sendResponse({ ok: true });
        });
        return true;
    }
});

function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
        sendBackendHeartbeat();
    }, 3000);
}

function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}

async function sendBackendHeartbeat() {
    if (!activeExamSession) return { ok: true };

    try {
        const res = await fetch(`${API_BASE}/api/extension/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionToken: activeExamSession.sessionToken,
                examId: activeExamSession.examId,
                studentId: activeExamSession.studentId,
                timestamp: Date.now()
            })
        });
        const data = await res.json();
        return data;
    } catch (err) {
        console.warn("Backend heartbeat notice:", err);
        return { ok: true, offlineFallback: true };
    }
}

async function enableTEMode() {
    teActive = true;
    disabledExtensionIds = [];

    try {
        const self = await chrome.management.getSelf();
        const extensions = await chrome.management.getAll();

        const suspiciousList = [];

        for (const ext of extensions) {
            // Disable all other active extensions except t_e
            if (ext.enabled && ext.id !== self.id && ext.type === "extension") {
                try {
                    await chrome.management.setEnabled(ext.id, false);
                    disabledExtensionIds.push(ext.id);
                    console.log(`t_e: Disabled conflicting extension: ${ext.name} (${ext.id})`);
                } catch (err) {
                    suspiciousList.push({ id: ext.id, name: ext.name });
                    console.warn(`t_e: Could not disable extension ${ext.name}:`, err);
                }
            }
        }

        if (suspiciousList.length > 0 && activeExamSession) {
            fetch(`${API_BASE}/api/extension/log-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'SUSPICIOUS_EXTENSIONS_DETECTED',
                    sessionToken: activeExamSession.sessionToken,
                    examId: activeExamSession.examId,
                    studentId: activeExamSession.studentId,
                    details: suspiciousList
                })
            }).catch(() => {});
        }

        await chrome.storage.local.set({ disabledExtensionIds, teActive: true, activeExamSession });
    } catch (e) {
        console.warn("Management API query error:", e);
    }
    return disabledExtensionIds.length;
}

async function disableTEMode() {
    if (!teActive) return;

    if (disabledExtensionIds.length === 0) {
        const data = await chrome.storage.local.get(["disabledExtensionIds"]);
        disabledExtensionIds = data.disabledExtensionIds || [];
    }

    for (const id of disabledExtensionIds) {
        try {
            await chrome.management.setEnabled(id, true);
            console.log(`t_e: Re-enabled extension: ${id}`);
        } catch (err) {
            console.warn(`t_e: Failed to re-enable extension ${id}:`, err);
        }
    }

    disabledExtensionIds = [];
    teActive = false;
    await chrome.storage.local.set({ disabledExtensionIds: [], teActive: false, activeExamSession: null });
}

chrome.runtime.onStartup.addListener(async () => {
    const data = await chrome.storage.local.get(["teActive", "disabledExtensionIds"]);
    if (data.teActive && data.disabledExtensionIds && data.disabledExtensionIds.length > 0) {
        disabledExtensionIds = data.disabledExtensionIds;
        teActive = true;
        await disableTEMode();
    }
});
