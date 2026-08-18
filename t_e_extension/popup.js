document.addEventListener('DOMContentLoaded', () => {
    const statusBadge = document.getElementById('statusBadge');
    const statusMsg = document.getElementById('statusMsg');
    const toggleBtn = document.getElementById('toggleBtn');

    chrome.runtime.sendMessage({ action: "checkStatus" }, (response) => {
        if (response && response.active) {
            updateUI(true, response.disabledCount || 0);
        } else {
            updateUI(false, 0);
        }
    });

    toggleBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "checkStatus" }, (response) => {
            const isActive = response && response.active;
            if (isActive) {
                chrome.runtime.sendMessage({ action: "stopTEExam" }, () => updateUI(false, 0));
            } else {
                chrome.runtime.sendMessage({ action: "startTEExam" }, (res) => updateUI(true, res ? res.disabledCount : 0));
            }
        });
    });

    function updateUI(active, disabledCount) {
        if (active) {
            statusBadge.textContent = '🟢 t_e ON';
            statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
            statusBadge.style.color = '#34d399';
            statusMsg.textContent = `t_e Security Shield ACTIVE. ${disabledCount} other browser extensions turned OFF for test integrity.`;
            toggleBtn.textContent = 'Turn OFF Exam Shield';
            toggleBtn.className = 'off';
        } else {
            statusBadge.textContent = '⚪ t_e Ready';
            statusBadge.style.background = 'rgba(255, 255, 255, 0.1)';
            statusBadge.style.color = '#9ca3af';
            statusMsg.textContent = 'Click below to turn ON t_e before starting your test.';
            toggleBtn.textContent = 'Turn ON t_e Exam Shield';
            toggleBtn.className = '';
        }
    }
});
