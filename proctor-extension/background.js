let proctoringActive = false;
let disabledExtensionIds = [];

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startProctoring") {
        startProctoring().then((disabledCount) => {
            sendResponse({ success: true, disabledCount });
        }).catch((err) => {
            console.error("Error starting proctoring:", err);
            sendResponse({ success: false, error: err.message });
        });
        return true; // keeps response channel open for async
    } else if (request.action === "stopProctoring") {
        stopProctoring().then(() => {
            sendResponse({ success: true });
        }).catch((err) => {
            console.error("Error stopping proctoring:", err);
            sendResponse({ success: false, error: err.message });
        });
        return true;
    } else if (request.action === "checkStatus") {
        sendResponse({ active: proctoringActive, disabledExtensions: disabledExtensionIds });
    }
});

async function startProctoring() {
    if (proctoringActive) return disabledExtensionIds.length;

    proctoringActive = true;
    disabledExtensionIds = [];

    // Get this extension's details to avoid self-disabling
    const self = await chrome.management.getSelf();

    // Get all extensions
    const extensions = await chrome.management.getAll();

    for (const ext of extensions) {
        // Only disable extensions (not apps or themes), and do not disable our own proctor extension
        if (ext.enabled && ext.id !== self.id && ext.type === "extension") {
            try {
                await chrome.management.setEnabled(ext.id, false);
                disabledExtensionIds.push(ext.id);
                console.log(`Disabled extension: ${ext.name} (${ext.id})`);
            } catch (err) {
                console.error(`Failed to disable extension ${ext.name}:`, err);
            }
        }
    }

    // Save disabled ids to local storage in case service worker restarts
    await chrome.storage.local.set({ disabledExtensionIds, proctoringActive });
    return disabledExtensionIds.length;
}

async function stopProctoring() {
    if (!proctoringActive) return;

    // Load from storage if empty
    if (disabledExtensionIds.length === 0) {
        const data = await chrome.storage.local.get(["disabledExtensionIds"]);
        disabledExtensionIds = data.disabledExtensionIds || [];
    }

    for (const id of disabledExtensionIds) {
        try {
            await chrome.management.setEnabled(id, true);
            console.log(`Re-enabled extension: ${id}`);
        } catch (err) {
            console.error(`Failed to re-enable extension ${id}:`, err);
        }
    }

    disabledExtensionIds = [];
    proctoringActive = false;
    await chrome.storage.local.set({ disabledExtensionIds, proctoringActive });
}

// Restore extensions on startup if background worker was terminated mid-exam
chrome.runtime.onStartup.addListener(async () => {
    const data = await chrome.storage.local.get(["proctoringActive", "disabledExtensionIds"]);
    if (data.proctoringActive && data.disabledExtensionIds && data.disabledExtensionIds.length > 0) {
        disabledExtensionIds = data.disabledExtensionIds;
        proctoringActive = true;
        await stopProctoring();
    }
});
