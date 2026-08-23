document.addEventListener("DOMContentLoaded", () => {
    const statusBadge = document.getElementById("statusBadge");
    const statusMsg = document.getElementById("statusMsg");
    const unauthCount = document.getElementById("unauthCount");
    const sessionStatus = document.getElementById("sessionStatus");
    const refreshBtn = document.getElementById("refreshBtn");

    function fetchAndRenderStatus() {
        chrome.runtime.sendMessage({ action: "GET_TE_STATUS" }, (response) => {
            if (!response) {
                renderUI("IDLE", false, 0, null);
                return;
            }
            renderUI(
                response.securityState || "IDLE",
                response.examActive || false,
                response.disabledCount || 0,
                response.lastError || null
            );
        });
    }

    function renderUI(securityState, examActive, disabledCount, lastError) {
        unauthCount.textContent = disabledCount;
        sessionStatus.textContent = examActive ? "Active Session" : "Inactive";

        statusBadge.className = "status-badge";

        switch (securityState) {
            case "EXAM_ACTIVE":
                statusBadge.textContent = "● Exam Active";
                statusMsg.textContent = `Security Shield active. ${disabledCount} unauthorized extensions disabled.`;
                break;
            case "SECURE":
                statusBadge.textContent = "● Secure";
                statusMsg.textContent = `Environment verified secure. Ready to launch exam.`;
                break;
            case "CHECKING":
            case "DISABLING":
            case "VERIFYING":
                statusBadge.textContent = `● ${securityState}`;
                statusMsg.textContent = `Scanning & verifying browser extension security state...`;
                break;
            case "FAILED":
                statusBadge.textContent = "● Security Failed";
                statusBadge.classList.add("failed");
                statusMsg.textContent = lastError && lastError.type === "UNABLE_TO_DISABLE_EXTENSION"
                    ? `Could not disable extension "${lastError.extensionName}". Exam remains locked.`
                    : `Unauthorized extensions detected or verification failed. Exam locked.`;
                break;
            case "RESTORING":
                statusBadge.textContent = "● Restoring";
                statusMsg.textContent = `Restoring previously disabled browser extensions...`;
                break;
            case "IDLE":
            default:
                statusBadge.textContent = "● Idle";
                statusBadge.classList.add("idle");
                statusMsg.textContent = `All unauthorized browser extensions must be disabled before starting an exam.`;
                break;
        }
    }

    refreshBtn.addEventListener("click", () => {
        fetchAndRenderStatus();
    });

    fetchAndRenderStatus();
});
