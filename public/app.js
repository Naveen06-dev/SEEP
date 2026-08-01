// =========================================================================
// SEEP Frontend — MCQ Examination Platform
// =========================================================================

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const state = {
    currentUser: null,
    exams: [],
    results: [],
    teacherProfile: null,
    teacherExams: [],
    activeDraftExamId: null,
    activeExam: null,
    activeQuestions: [],
    answers: {},
    currentQuestionIdx: 0,
    flaggedQuestions: new Set(),
    warningsCount: 0,
    durationSecondsLeft: 0,
    timerInterval: null,
    adminStatsInterval: null,
    examViolationTracking: false,
    examViolationHandled: false
};

const BASE_URL = window.location.origin;

// =========================================================================
// TOAST & MODAL
// =========================================================================

window.showToast = function(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'fa-check-circle', warning: 'fa-exclamation-triangle', danger: 'fa-times-circle', info: 'fa-info-circle' };
    toast.innerHTML = `
        <i class="fa-solid ${icons[type] || icons.info} toast-icon"></i>
        <div class="toast-content">${message}</div>
        <button class="toast-close">&times;</button>
    `;
    toast.querySelector('.toast-close').onclick = () => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); };
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { if (toast.parentNode) { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); } }, duration);
};

window.showCustomModal = function(title, message, options = {}) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('custom-modal-overlay');
        document.getElementById('custom-modal-title').innerText = title;
        document.getElementById('custom-modal-message').innerText = message;
        const footerEl = document.getElementById('custom-modal-footer');
        footerEl.innerHTML = '';

        if (options.type === 'confirm') {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.innerText = options.cancelText || 'Cancel';
            cancelBtn.onclick = () => { window.closeCustomModal(); resolve(false); };
            footerEl.appendChild(cancelBtn);
        }

        const okBtn = document.createElement('button');
        okBtn.className = 'btn btn-primary';
        okBtn.innerText = options.okText || 'OK';
        okBtn.onclick = () => { window.closeCustomModal(); resolve(true); };
        footerEl.appendChild(okBtn);

        overlay.style.display = 'flex';
        setTimeout(() => overlay.classList.add('active'), 10);
    });
};

window.closeCustomModal = function() {
    const overlay = document.getElementById('custom-modal-overlay');
    overlay.classList.remove('active');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
};

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// =========================================================================
// ROUTER
// =========================================================================

function showView(viewId) {
    if (viewId !== 'view-admin-dashboard' && state.adminStatsInterval) {
        clearInterval(state.adminStatsInterval);
        state.adminStatsInterval = null;
    }

    if (viewId !== 'view-teacher-dashboard') {
        if (state.teacherDashboardInterval) {
            clearInterval(state.teacherDashboardInterval);
            state.teacherDashboardInterval = null;
        }
        state.lastViolationCount = null;
    }

    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    const activeView = document.getElementById(viewId);
    if (activeView) activeView.classList.add('active');

    const headerProfile = document.getElementById('header-user-profile');
    if (state.currentUser) {
        headerProfile.style.display = 'flex';
        document.getElementById('header-user-name').innerText = state.currentUser.name;
        document.getElementById('header-user-role').innerText = state.currentUser.role;
    } else {
        headerProfile.style.display = 'none';
    }
}

window.fillDemoCredentials = function(email) {
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = 'password123';
};

// =========================================================================
// AUTH
// =========================================================================

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorBanner = document.getElementById('login-error-msg');
    errorBanner.style.display = 'none';

    try {
        const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.status === 'error') {
            errorBanner.innerText = data.message;
            errorBanner.style.display = 'block';
            return;
        }

        state.currentUser = data.user;
        localStorage.setItem('seep_token', data.token);

        if (state.currentUser.role === 'STUDENT') loadStudentDashboard();
        else if (state.currentUser.role === 'TEACHER') loadTeacherDashboard();
        else if (state.currentUser.role === 'ADMIN') loadAdminDashboard();
    } catch (err) {
        errorBanner.innerText = 'Connection lost. Ensure the backend server is running.';
        errorBanner.style.display = 'block';
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    state.currentUser = null;
    state.activeDraftExamId = null;
    localStorage.removeItem('seep_token');
    clearInterval(state.timerInterval);
    clearInterval(state.adminStatsInterval);
    showView('view-login');
});

// =========================================================================
// STUDENT
// =========================================================================

state.retestRequests = [];

async function loadStudentDashboard() {
    showView('view-student-dashboard');
    await fetchStudentResults();
    await fetchStudentRetestRequests();
    await fetchStudentExams();
}

async function fetchStudentRetestRequests() {
    try {
        const res = await fetch(`${BASE_URL}/api/v1/student/retest-requests/${state.currentUser.id}`);
        const data = await res.json();
        state.retestRequests = data.requests || [];
    } catch (err) {
        console.error("Failed to fetch student retest requests:", err);
    }
}

async function fetchStudentExams() {
    try {
        const res = await fetch(`${BASE_URL}/api/v1/exams`);
        const data = await res.json();
        state.exams = data.exams || [];
        const container = document.getElementById('student-exams-list');
        container.innerHTML = '';

        if (state.exams.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No exams available yet. Ask your teacher to publish an exam.</p>';
            return;
        }

        state.exams.forEach(exam => {
            const result = state.results.find(r => r.examId === exam.id);
            const retestRequest = state.retestRequests.find(r => r.examId === exam.id && r.status === 'PENDING');
            const declinedRequest = state.retestRequests.find(r => r.examId === exam.id && r.status === 'DECLINED');

            let actionHtml = '';
            if (result) {
                const isMalpractice = result.status === 'MALPRACTICE';
                if (isMalpractice) {
                    if (retestRequest) {
                        actionHtml = `<span class="badge" style="padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight:600; background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid #f59e0b;"><i class="fa-solid fa-spinner fa-spin"></i> Request Pending</span>`;
                    } else if (declinedRequest) {
                        actionHtml = `
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                                <span class="badge" style="padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight:600; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid #ef4444;"><i class="fa-solid fa-circle-xmark"></i> Retest Declined</span>
                                <button class="btn btn-warning btn-sm" onclick="openRetestRequestModal('${exam.id}')"><i class="fa-solid fa-arrow-rotate-left"></i> Re-request Retest</button>
                            </div>
                        `;
                    } else {
                        actionHtml = `
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                                <span class="badge" style="padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight:600; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid #ef4444;">Malpractice Detected</span>
                                <button class="btn btn-warning btn-sm" onclick="openRetestRequestModal('${exam.id}')"><i class="fa-solid fa-arrow-rotate-left"></i> Request Retest</button>
                            </div>
                        `;
                    }
                } else {
                    actionHtml = `<span class="badge" style="padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight:600; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid #10b981;"><i class="fa-solid fa-circle-check"></i> Completed</span>`;
                }
            } else {
                actionHtml = `<button class="btn btn-primary" onclick="initiateExamSession('${exam.id}')">Start MCQ Exam</button>`;
            }

            container.innerHTML += `
                <div class="exam-card">
                    <div class="exam-card-info">
                        <h4>${escapeHtml(exam.title)}</h4>
                        <div class="exam-meta">
                            <span><i class="fa-solid fa-clock"></i> ${exam.duration} mins</span>
                            <span><i class="fa-solid fa-clipboard-question"></i> ${exam.questionCount || 0} MCQ</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(exam.subject)}</span>
                            <span><i class="fa-solid fa-building"></i> ${escapeHtml(exam.department || '')}</span>
                        </div>
                        <div class="exam-meta"><span><i class="fa-solid fa-chalkboard-user"></i> ${escapeHtml(exam.teacherName || '')}</span></div>
                    </div>
                    <div>${actionHtml}</div>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

async function fetchStudentResults() {
    try {
        const res = await fetch(`${BASE_URL}/api/v1/results/${state.currentUser.id}`);
        const data = await res.json();
        state.results = data.results || [];
        const container = document.getElementById('student-results-list');
        container.innerHTML = '';

        if (state.results.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No exams completed yet.</p>';
            return;
        }

        state.results.forEach(result => {
            const isMalpractice = result.status === 'MALPRACTICE';
            const gradeDisplay = isMalpractice ? 'Malpractice' : result.grade;
            const gradeClass = isMalpractice ? 'grade-f' : (result.grade === 'F' ? 'grade-f' : 'grade-p');
            const scoreDisplay = isMalpractice ? 'Disqualified' : `${result.score}/${result.totalMarks}`;
            const percentDisplay = isMalpractice ? 'Malpractice Detected' : `${result.percentage}%`;
            container.innerHTML += `
                <div class="result-row">
                    <div class="result-info">
                        <h5>${escapeHtml(result.examTitle)}</h5>
                        <div class="result-score">
                            Score: <strong>${scoreDisplay}</strong> |
                            Correct: <strong>${result.correctCount}/${result.totalQuestions}</strong> |
                            ${percentDisplay}
                        </div>
                    </div>
                    <div class="result-grade ${gradeClass}" style="${isMalpractice ? 'font-size: 0.8rem; padding: 0.25rem 0.5rem; width: auto; border-radius: 4px; text-align: center;' : ''}">${gradeDisplay}</div>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

function detectBrowserExtensions() {
    const simCheckbox = document.getElementById('simulate-extension-check');
    if (simCheckbox && simCheckbox.checked) {
        console.warn("Detected simulated browser extension via simulation control panel");
        return true;
    }

    // 1. Check for non-standard custom element tag names (often injected by extensions)
    const allElements = document.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
        const tagName = allElements[i].tagName.toLowerCase();
        if (tagName.includes('-')) {
            console.warn("Detected potential browser extension custom tag:", tagName);
            return true;
        }
    }

    // 2. Check for chrome-extension / moz-extension URLs in DOM script/link/iframe sources
    const extensionSchemes = ['chrome-extension://', 'moz-extension://', 'resource://'];
    const nodes = document.querySelectorAll('script, link, iframe, img');
    for (const node of nodes) {
        const src = node.src || node.href || '';
        if (extensionSchemes.some(scheme => src.startsWith(scheme))) {
            console.warn("Detected browser extension resource URL:", src);
            return true;
        }
    }

    // 3. Scan attributes on <html> and <body> elements for typical extension markers
    const bodyAndHtml = [document.documentElement, document.body];
    const extensionAttrPatterns = ['extension', 'ext-', 'addon', 'grammarly', 'dashlane', 'lastpass', '1password', 'adblock', 'captcha'];
    for (const el of bodyAndHtml) {
        if (!el) continue;
        const attrs = el.attributes;
        for (let i = 0; i < attrs.length; i++) {
            const attrName = attrs[i].name.toLowerCase();
            if (extensionAttrPatterns.some(pattern => attrName.includes(pattern))) {
                console.warn("Detected browser extension attribute:", attrName);
                return true;
            }
        }
    }

    // 4. Check for known extension global variables in window object
    const extensionGlobals = [
        '__chromeExtensionActive',
        '__adblockDetected',
        'grammarly',
        'googleTranslateElementInit',
        'chrome',
        'browser'
    ];
    for (const glob of extensionGlobals) {
        if (glob === 'chrome' || glob === 'browser') {
            if (window[glob] && (window[glob].runtime || window[glob].extension)) {
                console.warn("Detected browser extension global API:", glob);
                return true;
            }
        } else if (window[glob] !== undefined) {
            console.warn("Detected browser extension global variable:", glob);
            return true;
        }
    }

    // 5. Look for any styles injected by extensions referring to extension resources
    try {
        for (let i = 0; i < document.styleSheets.length; i++) {
            const sheet = document.styleSheets[i];
            const rules = sheet.cssRules || sheet.rules;
            if (rules) {
                for (let j = 0; j < rules.length; j++) {
                    const cssText = rules[j].cssText || '';
                    if (cssText.includes('chrome-extension://') || cssText.includes('moz-extension://')) {
                        console.warn("Detected browser extension resource in stylesheet rules");
                        return true;
                    }
                }
            }
        }
    } catch (e) {
        // Cross-origin reading errors are normal and ignored
    }

    return false;
}

window.initiateExamSession = async function(examId) {
    // 1. Check if the proctor extension is installed
    const extensionInstalled = document.documentElement.hasAttribute('data-seep-proctor-installed');
    if (!extensionInstalled) {
        await showCustomModal(
            'Security Extension Required',
            'Please install and enable the SEEP Exam Proctor Security extension to proceed with this exam.'
        );
        return;
    }

    // 2. Request the extension to secure the environment (disable other extensions)
    showToast('Securing test environment... Disabling other extensions.', 'info', 3000);
    
    const secureEnvironment = () => {
        return new Promise((resolve) => {
            const handleExtensionResponse = (event) => {
                if (event.source !== window) return;
                const data = event.data;
                if (data && data.source === "seep-extension" && data.type === "START_SECURE_EXAM_RESPONSE") {
                    window.removeEventListener("message", handleExtensionResponse);
                    clearTimeout(timeoutId);
                    resolve(data.success);
                }
            };

            window.addEventListener("message", handleExtensionResponse);
            
            // Timeout after 4 seconds
            const timeoutId = setTimeout(() => {
                window.removeEventListener("message", handleExtensionResponse);
                resolve(false);
            }, 4000);

            // Send request to extension
            window.postMessage({ source: "seep-webpage", type: "START_SECURE_EXAM" }, "*");
        });
    };

    const isSecured = await secureEnvironment();
    if (!isSecured) {
        await showCustomModal(
            'Security Protocol Failed',
            'Could not disable other browser extensions. Please reload the page and try again.'
        );
        return;
    }

    // 3. Double-check for any remaining active/undetected extensions (where technically possible)
    if (detectBrowserExtensions()) {
        // Stop secure proctoring to restore extensions if check fails
        window.postMessage({ source: "seep-webpage", type: "STOP_SECURE_EXAM" }, "*");
        await showCustomModal(
            'Security Alert: Browser Extensions Detected',
            'Please disable all restricted browser extensions before starting the exam.'
        );
        return;
    }

    // 4. Synchronously request fullscreen mode inside the user gesture handler
    try {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            await document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            await document.documentElement.msRequestFullscreen();
        }
    } catch (err) {
        console.error('Initial fullscreen request failed or was rejected:', err);
    }

    state.activeExam = state.exams.find(e => e.id === examId);
    state.examViolationTracking = false;
    state.examViolationHandled = false;
    startExamWorkspace();
};

async function startExamWorkspace() {
    showView('view-exam-console');
    try {
        const res = await fetch(`${BASE_URL}/api/v1/exams/${state.activeExam.id}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: state.currentUser.id })
        });
        const data = await res.json();
        if (data.status === 'error') {
            await showCustomModal('Error', data.message);
            if (document.fullscreenElement) {
                await document.exitFullscreen().catch(() => {});
            }
            loadStudentDashboard();
            return;
        }

        state.activeQuestions = data.questions;
        state.answers = {};
        state.currentQuestionIdx = 0;
        state.flaggedQuestions.clear();
        state.warningsCount = 0;
        state.durationSecondsLeft = data.duration_remaining_seconds;

        document.getElementById('exam-subject-tag').innerText = state.activeExam.subject;
        document.getElementById('exam-title-display').innerText = state.activeExam.title;
        document.getElementById('proctor-warning-count').innerText = '0 / 3';
        document.getElementById('proctor-warning-count').classList.remove('text-danger');

        renderQuestion();
        renderPalette();
        startExamTimers();
        startLocalAntiCheatingTracking();
    } catch (err) {
        if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => {});
        }
        await showCustomModal('Error', 'Failed to start exam.');
        loadStudentDashboard();
    }
}

function renderQuestion() {
    const q = state.activeQuestions[state.currentQuestionIdx];
    document.getElementById('current-question-index').innerText = state.currentQuestionIdx + 1;
    document.getElementById('question-text-display').innerText = q.text;

    const workspace = document.getElementById('answer-workspace-area');
    const savedIndex = state.answers[q.id];
    let html = '<div class="mcq-options-list">';

    q.options.forEach((opt, idx) => {
        const label = OPTION_LABELS[idx];
        const isSelected = savedIndex === idx;
        html += `
            <div class="mcq-option-item ${isSelected ? 'selected' : ''}" onclick="selectMcqOption('${q.id}', ${idx})">
                <input type="radio" name="mcq-${q.id}" ${isSelected ? 'checked' : ''}>
                <span class="option-label">${label}.</span>
                <span>${escapeHtml(opt)}</span>
            </div>
        `;
    });

    html += '</div>';
    workspace.innerHTML = html;
    renderPalette();
}

window.selectMcqOption = function(questionId, optionIndex) {
    state.answers[questionId] = optionIndex;
    renderQuestion();
    syncAnswersWithServer();
};

async function syncAnswersWithServer() {
    const payload = {
        session_id: `${state.activeExam.id}:::${state.currentUser.id}`,
        answers: Object.keys(state.answers).map(qId => ({
            question_id: qId,
            answer_index: state.answers[qId]
        }))
    };
    const syncIndicator = document.getElementById('websocket-sync-indicator');
    try {
        const res = await fetch(`${BASE_URL}/api/v1/exams/sync`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'synchronized') {
            syncIndicator.innerHTML = '<i class="fa-solid fa-circle-check"></i> Autosaved';
            syncIndicator.className = 'text-success';
        }
    } catch (err) {
        syncIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Sync Error';
        syncIndicator.className = 'text-warning';
    }
}

function renderPalette() {
    const palette = document.getElementById('exam-question-palette');
    palette.innerHTML = '';
    state.activeQuestions.forEach((q, idx) => {
        let statusClass = 'unread';
        if (idx === state.currentQuestionIdx) statusClass = 'current';
        else if (state.flaggedQuestions.has(q.id)) statusClass = 'flagged';
        else if (state.answers[q.id] !== undefined) statusClass = 'answered';
        palette.innerHTML += `<button class="palette-btn ${statusClass}" onclick="navigateQuestion(${idx})">${idx + 1}</button>`;
    });
}

window.navigateQuestion = function(idx) {
    if (idx >= 0 && idx < state.activeQuestions.length) {
        state.currentQuestionIdx = idx;
        renderQuestion();
    }
};

document.getElementById('btn-prev-question').addEventListener('click', () => {
    if (state.currentQuestionIdx > 0) navigateQuestion(state.currentQuestionIdx - 1);
});
document.getElementById('btn-next-question').addEventListener('click', () => {
    if (state.currentQuestionIdx < state.activeQuestions.length - 1) navigateQuestion(state.currentQuestionIdx + 1);
});
document.getElementById('btn-flag-question').addEventListener('click', () => {
    const q = state.activeQuestions[state.currentQuestionIdx];
    if (state.flaggedQuestions.has(q.id)) state.flaggedQuestions.delete(q.id);
    else state.flaggedQuestions.add(q.id);
    renderPalette();
});

function startExamTimers() {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.durationSecondsLeft--;
        if (state.durationSecondsLeft <= 0) {
            clearInterval(state.timerInterval);
            showCustomModal('Time Expired', 'Time has expired! Submitting your exam automatically.').then(() => submitExamResults());
            return;
        }
        const h = Math.floor(state.durationSecondsLeft / 3600);
        const m = Math.floor((state.durationSecondsLeft % 3600) / 60);
        const s = state.durationSecondsLeft % 60;
        const pad = n => String(n).padStart(2, '0');
        document.getElementById('exam-timer-display').innerText = `${pad(h)}:${pad(m)}:${pad(s)}`;
    }, 1000);
}

function startLocalAntiCheatingTracking() {
    state.examViolationTracking = true;
    state.examViolationHandled = false;

    // Verify student entered fullscreen successfully
    if (!document.fullscreenElement) {
        console.warn("Fullscreen was not active when anti-cheating tracking started");
        triggerImmediateMalpractice('FULLSCREEN_NOT_ACTIVE', 'Exam was started but fullscreen mode was not active or was exited.');
        return;
    }

    document.addEventListener('visibilitychange', handleVisibilityChangeExam);
    document.addEventListener('fullscreenchange', handleFullscreenExitChange);
    document.addEventListener('mouseleave', handleMouseLeaveExam);
    window.addEventListener('blur', handleWindowBlurExam);
    window.addEventListener('keydown', handleKeydownExam);
    window.addEventListener('beforeunload', handleBeforeUnloadExam);
    document.addEventListener('contextmenu', handleContextMenuExam);
}

function handleFullscreenExitChange() {
    if (state.activeExam && state.examViolationTracking && !state.examViolationHandled && !document.fullscreenElement) {
        triggerImmediateMalpractice('FULLSCREEN_EXIT', 'Student exited fullscreen mode (Esc key / minimize)');
    }
}

function handleVisibilityChangeExam() {
    if (state.activeExam && state.examViolationTracking && !state.examViolationHandled && document.visibilityState !== 'visible') {
        triggerImmediateMalpractice('VISIBILITY_CHANGE', 'Student left the exam tab or window');
    }
}

function handleMouseLeaveExam(e) {
    if (state.activeExam && state.examViolationTracking && !state.examViolationHandled) {
        if (e.clientY < 0 || e.clientX < 0 || e.clientX > window.innerWidth || e.clientY > window.innerHeight) {
            triggerImmediateMalpractice('MOUSE_LEAVE', 'Student cursor moved outside the test window');
        }
    }
}

function handleWindowBlurExam() {
    if (state.activeExam && state.examViolationTracking && !state.examViolationHandled) {
        triggerImmediateMalpractice('WINDOW_BLUR', 'Student left the test window (focused another app or clicked Windows button)');
    }
}

function handleKeydownExam(e) {
    if (state.activeExam && state.examViolationTracking && !state.examViolationHandled) {
        // Block Escape, Meta, Alt, Tab
        if (e.key === 'Escape' || e.key === 'Meta' || e.metaKey || e.altKey || e.key === 'Tab') {
            e.preventDefault();
            triggerImmediateMalpractice('KEY_MUTATION', `Student pressed prohibited key or shortcut: ${e.key}`);
            return;
        }
        // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
            triggerImmediateMalpractice('DEV_TOOLS_OPEN', 'Student attempted to open browser Developer Tools');
        }
    }
}

function handleContextMenuExam(e) {
    if (state.activeExam && state.examViolationTracking && !state.examViolationHandled) {
        e.preventDefault();
        triggerImmediateMalpractice('CONTEXT_MENU', 'Student attempted to open context menu (Right Click)');
    }
}

function handleBeforeUnloadExam() {
    if (state.activeExam && state.examViolationTracking && !state.examViolationHandled) {
        triggerImmediateMalpractice('BROWSER_CLOSE', 'Student closed or reloaded the exam window');
    }
}

async function triggerImmediateMalpractice(type, reason) {
    if (!state.activeExam || state.examViolationHandled) return;

    state.examViolationHandled = true;
    state.examViolationTracking = false;

    document.removeEventListener('visibilitychange', handleVisibilityChangeExam);
    document.removeEventListener('fullscreenchange', handleFullscreenExitChange);
    document.removeEventListener('mouseleave', handleMouseLeaveExam);
    window.removeEventListener('blur', handleWindowBlurExam);
    window.removeEventListener('keydown', handleKeydownExam);
    window.removeEventListener('beforeunload', handleBeforeUnloadExam);
    document.removeEventListener('contextmenu', handleContextMenuExam);
    clearInterval(state.timerInterval);

    // Stop secure proctoring to restore extensions
    window.postMessage({ source: "seep-webpage", type: "STOP_SECURE_EXAM" }, "*");

    const examId = state.activeExam.id;

    try {
        await fetch(`${BASE_URL}/api/v1/exams/${examId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: state.currentUser.id,
                malpractice: true,
                malpracticeType: type,
                malpracticeReason: reason
            })
        });

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }

        await showCustomModal(
            'Exam Terminated - Malpractice Detected',
            `Your exam session has been terminated immediately.\n\nReason: ${reason}\n\nA malpractice incident report has been sent to your teacher. You can request a retest after the teacher reviews your case.`
        );

        state.activeExam = null;
        await loadStudentDashboard();
    } catch (err) {
        console.error("Failed to submit malpractice termination:", err);
        state.activeExam = null;
        loadStudentDashboard();
    }
}

async function triggerProctorWarning(type, reason) {
    const sessionKey = `${state.activeExam.id}:::${state.currentUser.id}`;
    try {
        const res = await fetch(`${BASE_URL}/api/v1/proctor/warning`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionKey, type, reason })
        });
        const data = await res.json();
        state.warningsCount = data.warningCount;
        const countDisplay = document.getElementById('proctor-warning-count');
        countDisplay.innerText = `${state.warningsCount} / 3`;
        if (state.warningsCount >= 3) {
            countDisplay.classList.add('text-danger');
            clearInterval(state.timerInterval);
            showCustomModal('Exam Terminated', 'Maximum security warnings reached. Submitting exam.').then(() => submitExamResults());
        }
    } catch (err) {
        console.error(err);
    }
}

document.getElementById('btn-finish-exam').addEventListener('click', () => {
    showCustomModal('Submit Exam', 'Submit your exam for automatic MCQ evaluation?', { type: 'confirm' }).then(confirmed => {
        if (confirmed) submitExamResults();
    });
});

async function submitExamResults() {
    window.onblur = null;
    clearInterval(state.timerInterval);

    state.examViolationTracking = false;
    document.removeEventListener('visibilitychange', handleVisibilityChangeExam);
    document.removeEventListener('fullscreenchange', handleFullscreenExitChange);
    document.removeEventListener('mouseleave', handleMouseLeaveExam);
    window.removeEventListener('blur', handleWindowBlurExam);
    window.removeEventListener('keydown', handleKeydownExam);
    window.removeEventListener('beforeunload', handleBeforeUnloadExam);
    document.removeEventListener('contextmenu', handleContextMenuExam);

    // Stop secure proctoring to restore extensions
    window.postMessage({ source: "seep-webpage", type: "STOP_SECURE_EXAM" }, "*");

    if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
    }

    try {
        const res = await fetch(`${BASE_URL}/api/v1/exams/${state.activeExam.id}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: state.currentUser.id })
        });
        const data = await res.json();
        await showCustomModal('Exam Submitted',
            `Score: ${data.score}/${data.totalMarks}\nCorrect: ${data.correctCount}/${data.totalQuestions}\nPercentage: ${data.percentage}%\nGrade: ${data.grade}`);
        state.activeExam = null;
        await loadStudentDashboard();
    } catch (err) {
        await showCustomModal('Error', 'Failed to submit exam.');
        loadStudentDashboard();
    }
}

window.openRetestRequestModal = function(examId) {
    document.getElementById('retest-exam-id').value = examId;
    document.getElementById('retest-reason-input').value = '';
    document.getElementById('retest-modal-overlay').style.display = 'flex';
};

document.getElementById('retest-request-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const examId = document.getElementById('retest-exam-id').value;
    const reason = document.getElementById('retest-reason-input').value.trim();

    try {
        const res = await fetch(`${BASE_URL}/api/v1/exams/${examId}/retest-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: state.currentUser.id,
                reason
            })
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast('Retest request submitted successfully.', 'success');
            document.getElementById('retest-modal-overlay').style.display = 'none';
            await loadStudentDashboard();
        } else {
            showToast(data.message || 'Failed to submit request.', 'danger');
        }
    } catch (err) {
        showToast('Network error occurred.', 'danger');
    }
});

// =========================================================================
// TEACHER
// =========================================================================

window.switchTeacherTab = function(tabId) {
    document.querySelectorAll('.teacher-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    document.querySelectorAll('.teacher-tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`teacher-tab-${tabId}`).classList.add('active');

    if (tabId === 'exams') fetchTeacherExamsList();
    if (tabId === 'results') fetchTeacherSubmissions();
};

function playAlertSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc1 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        osc1.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.15); // C#6 note

        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

        osc1.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.45);
    } catch (e) {
        console.warn('Audio alert play failed:', e);
    }
}

async function loadTeacherDashboard() {
    showView('view-teacher-dashboard');
    switchTeacherTab('profile');
    await loadTeacherProfile();
    await fetchTeacherSecurityDashboard();

    // Start polling the security dashboard every 3 seconds for instant notifications
    clearInterval(state.teacherDashboardInterval);
    state.teacherDashboardInterval = setInterval(fetchTeacherSecurityDashboard, 3000);
}

async function loadTeacherProfile() {
    try {
        const res = await fetch(`${BASE_URL}/api/v1/teacher/profile?teacherId=${state.currentUser.id}`);
        const data = await res.json();
        state.teacherProfile = data.teacher || null;

        document.getElementById('teacher-name').value = state.teacherProfile?.name || state.currentUser.name || '';
        document.getElementById('teacher-email').value = state.currentUser.email;
        document.getElementById('teacher-department').value = state.teacherProfile?.department || state.currentUser.dept || '';
        document.getElementById('exam-dept-input').placeholder = state.teacherProfile?.department || 'Department name';
    } catch (err) {
        console.error(err);
    }
}

async function fetchTeacherSecurityDashboard() {
    try {
        const res = await fetch(`${BASE_URL}/api/v1/teacher/security-dashboard?teacherId=${state.currentUser.id}`);
        const data = await res.json();
        const badge = document.getElementById('retest-badge');
        const pendingCount = (data.pendingRequests || []).length;
        badge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
        badge.innerText = pendingCount;

        // Check for new malpractice events to trigger sound & toast alerts
        if (state.lastViolationCount !== undefined && state.lastViolationCount !== null && data.violations.length > state.lastViolationCount) {
            const newCount = data.violations.length - state.lastViolationCount;
            for (let i = 0; i < newCount; i++) {
                const item = data.violations[i];
                if (item) {
                    showToast(`
                        <div class="malpractice-alert-toast" style="display: flex; flex-direction: column; gap: 0.25rem; text-align: left;">
                            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.5rem;"><i class="fa-solid fa-triangle-exclamation"></i> MALPRACTICE DETECTED</div>
                            <div style="font-size: 0.85rem;"><strong>Student Name:</strong> ${escapeHtml(item.studentName)}</div>
                            <div style="font-size: 0.85rem;"><strong>Student ID:</strong> ${escapeHtml(item.studentId || 'N/A')}</div>
                            <div style="font-size: 0.85rem;"><strong>Exam Name:</strong> ${escapeHtml(item.examTitle)}</div>
                            <div style="font-size: 0.85rem;"><strong>Violation Type:</strong> ${escapeHtml(item.type)}</div>
                            <div style="font-size: 0.85rem;"><strong>Time:</strong> ${new Date(item.reportedAt || item.timestamp).toLocaleString()}</div>
                        </div>
                    `, 'danger', 10000);
                }
            }
            playAlertSound();
        }
        state.lastViolationCount = data.violations.length;

        const violationContainer = document.getElementById('teacher-security-violations');
        if (violationContainer) {
            violationContainer.innerHTML = '';
            if (!data.violations || data.violations.length === 0) {
                violationContainer.innerHTML = '<p class="text-muted">No malpractice events recorded.</p>';
            } else {
                violationContainer.innerHTML = data.violations.map(item => `
                    <div class="added-question-card alert-card" style="border-left: 4px solid var(--danger); background: rgba(239, 68, 68, 0.03); padding: 1rem; margin-bottom: 0.75rem; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(item.studentName)}</h4>
                            <span class="exam-status-pill status-draft" style="background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid var(--danger); font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight:600;">${escapeHtml(item.type)}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem; display: flex; flex-direction: column; gap: 0.15rem;">
                            <span><strong>Student ID:</strong> ${escapeHtml(item.studentId || 'N/A')}</span>
                            <span><strong>Exam:</strong> ${escapeHtml(item.examTitle)}</span>
                            <span><strong>Time:</strong> ${new Date(item.reportedAt || item.timestamp).toLocaleString()}</span>
                        </div>
                        <div style="margin-top: 0.5rem; font-size: 0.85rem; padding: 0.5rem; background: rgba(0, 0, 0, 0.2); border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.05); color: var(--text-primary);">
                            <strong>Details:</strong> ${escapeHtml(item.reason)}
                        </div>
                    </div>
                `).join('');
            }
        }

        const requestContainer = document.getElementById('teacher-security-requests');
        if (requestContainer) {
            requestContainer.innerHTML = '';
            if (!data.pendingRequests || data.pendingRequests.length === 0) {
                requestContainer.innerHTML = '<p class="text-muted">No pending retest requests.</p>';
            } else {
                requestContainer.innerHTML = data.pendingRequests.map(item => `
                    <div class="added-question-card request-card" style="border-left: 4px solid var(--warning); background: rgba(245, 158, 11, 0.03); padding: 1rem; margin-bottom: 0.75rem; border-radius: 8px;">
                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(item.studentName)}</h4>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem; display: flex; flex-direction: column; gap: 0.15rem;">
                            <span><strong>Student ID:</strong> ${escapeHtml(item.studentId || 'N/A')}</span>
                            <span><strong>Exam:</strong> ${escapeHtml(item.examTitle)}</span>
                            <span><strong>Requested At:</strong> ${new Date(item.requestedAt).toLocaleString()}</span>
                        </div>
                        <div style="margin-top: 0.5rem; font-size: 0.85rem; padding: 0.5rem; background: rgba(0, 0, 0, 0.2); border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.05); color: var(--text-primary);">
                            <strong>Reason:</strong> ${escapeHtml(item.reason)}
                        </div>
                        <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                            <button class="btn btn-primary btn-sm" onclick="handleRetestAction('${item.id}', 'APPROVE')" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background-color: var(--success);"><i class="fa-solid fa-check"></i> Approve Retest</button>
                            <button class="btn btn-secondary btn-sm" onclick="handleRetestAction('${item.id}', 'DECLINE')" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background-color: var(--danger);"><i class="fa-solid fa-xmark"></i> Decline</button>
                        </div>
                    </div>
                `).join('');
            }
        }

        const historyContainer = document.getElementById('teacher-security-history');
        if (historyContainer) {
            historyContainer.innerHTML = '';
            if (!data.historyRequests || data.historyRequests.length === 0) {
                historyContainer.innerHTML = '<p class="text-muted">No retest history yet.</p>';
            } else {
                historyContainer.innerHTML = data.historyRequests.map(item => {
                    const isApproved = item.status === 'APPROVED';
                    const statusColor = isApproved ? 'var(--success)' : 'var(--danger)';
                    const statusIcon = isApproved ? 'fa-circle-check' : 'fa-circle-xmark';

                    return `
                        <div class="added-question-card history-card" style="border-left: 4px solid ${statusColor}; padding: 1rem; margin-bottom: 0.75rem; border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(item.studentName)}</h4>
                                <span style="font-size: 0.8rem; font-weight: 600; color: ${statusColor}; display: flex; align-items: center; gap: 0.25rem;">
                                    <i class="fa-solid ${statusIcon}"></i> ${escapeHtml(item.status)}
                                </span>
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem; display: flex; flex-direction: column; gap: 0.15rem;">
                                <span><strong>Student ID:</strong> ${escapeHtml(item.studentId || 'N/A')}</span>
                                <span><strong>Exam:</strong> ${escapeHtml(item.examTitle)}</span>
                                <span><strong>Requested At:</strong> ${new Date(item.requestedAt).toLocaleString()}</span>
                            </div>
                            <div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
                                <strong>Reason:</strong> ${escapeHtml(item.reason)}
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (err) {
        console.error(err);
    }
}

window.handleRetestAction = async function(requestId, action) {
    try {
        const res = await fetch(`${BASE_URL}/api/v1/teacher/retest-requests/${requestId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast(action === 'APPROVE' ? 'Retest approved.' : 'Retest rejected.', 'success');
            await fetchTeacherSecurityDashboard();
        } else {
            showToast(data.message || 'Unable to process request.', 'danger');
        }
    } catch (err) {
        showToast('Unable to complete retest action.', 'danger');
    }
};

document.getElementById('teacher-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        userId: state.currentUser.id,
        name: document.getElementById('teacher-name').value.trim(),
        department: document.getElementById('teacher-department').value.trim(),
        email: state.currentUser.email
    };

    try {
        const res = await fetch(`${BASE_URL}/api/v1/teacher/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'success') {
            state.teacherProfile = data.teacher;
            state.currentUser.name = data.teacher.name;
            document.getElementById('header-user-name').innerText = data.teacher.name;
            showToast('Profile saved successfully.', 'success');
        }
    } catch (err) {
        showToast('Failed to save profile.', 'danger');
    }
});

document.getElementById('teacher-create-exam-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        teacherId: state.currentUser.id,
        title: document.getElementById('exam-title-input').value.trim(),
        subject: document.getElementById('exam-subject-input').value.trim(),
        department: document.getElementById('exam-dept-input').value.trim(),
        duration: document.getElementById('exam-duration-input').value,
        marksPerQuestion: document.getElementById('exam-marks-input').value,
        passingPercentage: 40
    };

    try {
        const res = await fetch(`${BASE_URL}/api/v1/teacher/exams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'error') {
            showToast(data.message, 'danger');
            return;
        }

        state.activeDraftExamId = data.exam.id;
        document.getElementById('question-builder-section').style.display = 'block';
        document.getElementById('active-exam-label').innerText = `${data.exam.title} — ${data.exam.subject}`;
        document.getElementById('question-marks-input').value = data.exam.marksPerQuestion;
        showToast('Exam created. Now add MCQ questions.', 'success');
        await loadDraftQuestions();
    } catch (err) {
        showToast('Failed to create exam.', 'danger');
    }
});

document.getElementById('teacher-add-question-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.activeDraftExamId) {
        showToast('Create an exam first.', 'warning');
        return;
    }

    const options = ['a', 'b', 'c', 'd'].map(l => document.getElementById(`option-${l}`).value.trim());
    const payload = {
        text: document.getElementById('question-text-input').value.trim(),
        options,
        correctIndex: parseInt(document.getElementById('correct-answer-select').value, 10),
        marks: parseFloat(document.getElementById('question-marks-input').value)
    };

    try {
        const res = await fetch(`${BASE_URL}/api/v1/teacher/exams/${state.activeDraftExamId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'error') {
            showToast(data.message, 'danger');
            return;
        }

        document.getElementById('teacher-add-question-form').reset();
        document.getElementById('question-marks-input').value = data.exam.marksPerQuestion;
        showToast('Question added.', 'success');
        await loadDraftQuestions();
    } catch (err) {
        showToast('Failed to add question.', 'danger');
    }
});

async function loadDraftQuestions() {
    if (!state.activeDraftExamId) return;
    try {
        const res = await fetch(`${BASE_URL}/api/v1/teacher/exams/${state.activeDraftExamId}/questions`);
        const data = await res.json();
        const questions = data.questions || [];
        document.getElementById('added-question-count').innerText = questions.length;

        const list = document.getElementById('added-questions-list');
        list.innerHTML = '';
        if (questions.length === 0) {
            list.innerHTML = '<p class="text-muted">No questions added yet.</p>';
            return;
        }

        questions.forEach((q, i) => {
            const optionsHtml = q.options.map((opt, idx) =>
                `<li class="${idx === q.correctIndex ? 'correct-option' : ''}">${OPTION_LABELS[idx]}. ${escapeHtml(opt)}${idx === q.correctIndex ? ' ✓' : ''}</li>`
            ).join('');

            list.innerHTML += `
                <div class="added-question-card">
                    <div class="added-question-header">
                        <strong>Q${i + 1}.</strong> ${escapeHtml(q.text)}
                        <button class="btn btn-danger btn-sm" onclick="deleteQuestion('${q.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                    <ul class="options-preview-list">${optionsHtml}</ul>
                    <span class="marks-badge">${q.marks} mark(s) | Answer: ${OPTION_LABELS[q.correctIndex]}</span>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

window.deleteQuestion = async function(questionId) {
    if (!state.activeDraftExamId) return;
    const confirmed = await showCustomModal('Delete Question', 'Remove this question?', { type: 'confirm' });
    if (!confirmed) return;

    try {
        await fetch(`${BASE_URL}/api/v1/teacher/exams/${state.activeDraftExamId}/questions/${questionId}`, { method: 'DELETE' });
        showToast('Question deleted.', 'success');
        await loadDraftQuestions();
    } catch (err) {
        showToast('Failed to delete question.', 'danger');
    }
};

document.getElementById('btn-publish-exam').addEventListener('click', async () => {
    if (!state.activeDraftExamId) {
        showToast('Create an exam and add questions first.', 'warning');
        return;
    }

    const confirmed = await showCustomModal('Publish Exam', 'Students will be able to take this exam. Continue?', { type: 'confirm' });
    if (!confirmed) return;

    try {
        const res = await fetch(`${BASE_URL}/api/v1/teacher/exams/${state.activeDraftExamId}/publish`, { method: 'PUT' });
        const data = await res.json();
        if (data.status === 'error') {
            showToast(data.message, 'danger');
            return;
        }
        showToast('Exam published! Students can now take it.', 'success');
        state.activeDraftExamId = null;
        document.getElementById('question-builder-section').style.display = 'none';
        switchTeacherTab('exams');
    } catch (err) {
        showToast('Failed to publish exam.', 'danger');
    }
});

async function fetchTeacherExamsList() {
    try {
        const res = await fetch(`${BASE_URL}/api/v1/teacher/exams?teacherId=${state.currentUser.id}`);
        const data = await res.json();
        state.teacherExams = data.exams || [];
        const container = document.getElementById('teacher-exams-list');
        container.innerHTML = '';

        if (state.teacherExams.length === 0) {
            container.innerHTML = '<p class="text-muted">No exams created yet.</p>';
            return;
        }

        state.teacherExams.forEach(exam => {
            const statusClass = exam.status === 'ACTIVE' ? 'status-active' : 'status-draft';
            container.innerHTML += `
                <div class="exam-card">
                    <div class="exam-card-info">
                        <h4>${escapeHtml(exam.title)} <span class="exam-status-pill ${statusClass}">${exam.status}</span></h4>
                        <div class="exam-meta">
                            <span><i class="fa-solid fa-book"></i> ${escapeHtml(exam.subject)}</span>
                            <span><i class="fa-solid fa-building"></i> ${escapeHtml(exam.department)}</span>
                            <span><i class="fa-solid fa-clipboard-question"></i> ${exam.questionCount} questions</span>
                            <span><i class="fa-solid fa-star"></i> ${exam.totalMarks} marks</span>
                        </div>
                    </div>
                    ${exam.status === 'DRAFT' ? `<button class="btn btn-secondary" onclick="continueDraftExam('${exam.id}')">Continue Adding Questions</button>` : ''}
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

window.continueDraftExam = function(examId) {
    const exam = state.teacherExams.find(e => e.id === examId);
    if (!exam) return;
    state.activeDraftExamId = examId;
    document.getElementById('question-builder-section').style.display = 'block';
    document.getElementById('active-exam-label').innerText = `${exam.title} — ${exam.subject}`;
    document.getElementById('question-marks-input').value = exam.marksPerQuestion || 1;
    switchTeacherTab('questions');
    loadDraftQuestions();
};

async function fetchTeacherSubmissions() {
    try {
        const res = await fetch(`${BASE_URL}/api/v1/teacher/submissions?teacherId=${state.currentUser.id}`);
        const data = await res.json();
        const submissions = data.submissions || [];
        const tbody = document.getElementById('teacher-submissions-tbody');
        tbody.innerHTML = '';

        if (submissions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No student submissions yet.</td></tr>';
            return;
        }

        submissions.forEach(sub => {
            const isEliminated = sub.status === 'MALPRACTICE';
            const statusBadge = isEliminated 
                ? `<span class="exam-status-pill" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid #ef4444; margin-left: 0; padding: 0.15rem 0.5rem; font-size: 0.75rem; border-radius: 4px; font-weight: 600;">MALPRACTICE DETECTED</span>`
                : `<span class="role-pill">${sub.grade}</span> <br><small class="${sub.status === 'PASS' ? 'text-success' : 'text-danger'}" style="font-weight:600;">${sub.status}</small>`;

            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapeHtml(sub.studentName)}</strong></td>
                    <td>${escapeHtml(sub.examTitle)}<br><small class="text-muted">${escapeHtml(sub.subject)}</small></td>
                    <td><strong class="text-accent">${sub.score}/${sub.totalMarks}</strong></td>
                    <td>${sub.correctCount}/${sub.totalQuestions}</td>
                    <td>${statusBadge}</td>
                    <td style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="viewSubmissionDetail('${sub.sessionKey}')"><i class="fa-solid fa-eye"></i> Review</button>
                        <button class="btn btn-danger btn-sm" onclick="allowReattend('${sub.examId}', '${sub.studentId}')"><i class="fa-solid fa-rotate-left"></i> Allow Reattend</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

window.allowReattend = async function(examId, studentId) {
    const confirmed = await showCustomModal(
        'Allow Reattend', 
        'This will reset the student\'s previous attempts, answers, and proctoring logs for this exam. Are you sure you want to allow this student to reattend the exam?',
        { type: 'confirm' }
    );
    if (!confirmed) return;

    try {
        const res = await fetch(`${BASE_URL}/api/v1/teacher/exams/reattend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ examId, studentId })
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast('Student attempt reset. They can now reattend the exam.', 'success');
            await fetchTeacherSubmissions();
            document.getElementById('teacher-result-detail-panel').style.display = 'none';
        } else {
            showToast(data.message || 'Failed to authorize reattendance.', 'danger');
        }
    } catch (err) {
        showToast('Network error occurred.', 'danger');
    }
};

window.viewSubmissionDetail = async function(sessionKey) {
    try {
        const res = await fetch(`${BASE_URL}/api/v1/teacher/submissions?teacherId=${state.currentUser.id}`);
        const data = await res.json();
        const sub = (data.submissions || []).find(s => s.sessionKey === sessionKey);
        if (!sub) return;

        document.getElementById('teacher-result-detail-panel').style.display = 'block';
        document.getElementById('result-detail-student').innerText = `Student: ${sub.studentName}`;
        
        const isEliminated = sub.status === 'MALPRACTICE';
        const statusText = isEliminated 
            ? '<span class="text-danger font-bold">[MALPRACTICE DETECTED]</span>' 
            : `<span class="${sub.status === 'PASS' ? 'text-success' : 'text-danger'} font-bold">[${sub.status}]</span>`;

        document.getElementById('result-detail-exam').innerHTML = `
            Exam: <strong>${escapeHtml(sub.examTitle)}</strong> (${escapeHtml(sub.subject)}) — 
            Score: <strong>${sub.score}/${sub.totalMarks}</strong> ${statusText}
        `;

        // Proctoring Warnings display
        let proctorHtml = '';
        if (sub.warningCount > 0) {
            const logItems = (sub.warnings || []).map(w => `
                <li style="font-size: 0.85rem; padding: 0.35rem 0; border-bottom: 1px dotted rgba(255,255,255,0.08);">
                    <span class="text-muted">[${new Date(w.timestamp).toLocaleTimeString()}]</span> 
                    <strong class="text-warning">${escapeHtml(w.type)}</strong>: ${escapeHtml(w.reason)}
                </li>
            `).join('');
            
            proctorHtml = `
                <div style="margin-top: 1rem; margin-bottom: 1.5rem; padding: 1.25rem; border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; background: rgba(239, 68, 68, 0.05);">
                    <h5 class="text-danger" style="margin-bottom: 0.75rem;"><i class="fa-solid fa-triangle-exclamation"></i> Proctor Logs (${sub.warningCount} Warnings)</h5>
                    <ul style="list-style: none; padding-left: 0; margin-bottom: 0;">
                        ${logItems}
                    </ul>
                </div>
            `;
        } else {
            proctorHtml = `
                <div style="margin-top: 1rem; margin-bottom: 1.5rem; padding: 1rem; border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; background: rgba(16,185,129,0.05); color: var(--success); font-size: 0.9rem;">
                    <i class="fa-solid fa-circle-check"></i> No proctoring warnings recorded.
                </div>
            `;
        }

        const container = document.getElementById('result-detail-questions');
        const questionsHtml = sub.details.map((d, i) => `
            <div class="result-question-card ${d.isCorrect ? 'correct' : 'incorrect'}">
                <h5>Q${i + 1}. ${escapeHtml(d.questionText)}</h5>
                <p><strong>Student selected:</strong> ${d.submittedOption ? d.submittedOption + '. ' + escapeHtml(d.submittedAnswer) : 'No answer'}</p>
                <p><strong>Correct answer:</strong> ${d.correctOption}. ${escapeHtml(d.correctAnswer)}</p>
                <p class="eval-feedback">${d.isCorrect ? '✓ Correct' : '✗ Incorrect'} — ${d.score}/${d.maxScore} marks</p>
            </div>
        `).join('');

        container.innerHTML = proctorHtml + questionsHtml + `
            <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem;">
                <button class="btn btn-danger" onclick="allowReattend('${sub.examId}', '${sub.studentId}')"><i class="fa-solid fa-rotate-left"></i> Allow Reattend</button>
            </div>
        `;
    } catch (err) {
        console.error(err);
    }
};

// =========================================================================
// ADMIN
// =========================================================================

function loadAdminDashboard() {
    showView('view-admin-dashboard');
    fetchAdminLogs();
    fetchAdminUsers();
    clearInterval(state.adminStatsInterval);
    state.adminStatsInterval = setInterval(pollAdminStats, 3000);
}

async function fetchAdminUsers() {
    try {
        const res = await fetch(`${BASE_URL}/api/v1/admin/users`);
        const data = await res.json();
        
        const teachersTbody = document.getElementById('admin-teachers-tbody');
        teachersTbody.innerHTML = '';
        if ((data.teachers || []).length === 0) {
            teachersTbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No teachers registered.</td></tr>';
        } else {
            data.teachers.forEach(t => {
                teachersTbody.innerHTML += `
                    <tr>
                        <td><strong>${escapeHtml(t.name)}</strong></td>
                        <td>${escapeHtml(t.email)}</td>
                        <td><span class="role-pill">${escapeHtml(t.department)}</span></td>
                    </tr>
                `;
            });
        }

        const studentsTbody = document.getElementById('admin-students-tbody');
        studentsTbody.innerHTML = '';
        if ((data.students || []).length === 0) {
            studentsTbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No students registered.</td></tr>';
        } else {
            data.students.forEach(s => {
                studentsTbody.innerHTML += `
                    <tr>
                        <td><strong>${escapeHtml(s.name)}</strong></td>
                        <td>${escapeHtml(s.email)}</td>
                        <td><span class="role-pill" style="background: rgba(99, 102, 241, 0.15); color: var(--accent); border: 1px solid var(--accent);">${escapeHtml(s.regNo)}</span></td>
                    </tr>
                `;
            });
        }
    } catch (err) {
        console.error(err);
    }
}

async function fetchAdminLogs() {
    try {
        const res = await fetch(`${BASE_URL}/api/v1/admin/logs`);
        const data = await res.json();
        const container = document.getElementById('admin-audit-log-container');
        container.innerHTML = (data.logs || []).map(log => `
            <div class="log-row">
                <span class="log-time">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span class="log-user">${escapeHtml(log.user)}</span>
                <span class="log-action">${escapeHtml(log.action)}</span>
                <span class="log-details">${escapeHtml(log.details)}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function pollAdminStats() {
    try {
        const res = await fetch(`${BASE_URL}/api/v1/admin/stats`);
        const data = await res.json();
        document.getElementById('admin-stat-health').innerText = data.status === 'healthy' ? 'Active' : 'Unstable';
        document.getElementById('admin-stat-cpu').innerText = data.cpu_usage;
        document.getElementById('admin-stat-ram').innerText = data.memory_usage;
        document.getElementById('admin-stat-connections').innerText = data.active_connections;
    } catch (err) {
        console.error(err);
    }
}
