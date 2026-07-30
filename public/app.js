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
    adminStatsInterval: null
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

async function loadStudentDashboard() {
    showView('view-student-dashboard');
    await fetchStudentExams();
    await fetchStudentResults();
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
                    <div><button class="btn btn-primary" onclick="initiateExamSession('${exam.id}')">Start MCQ Exam</button></div>
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
            const gradeClass = result.grade === 'F' ? 'grade-f' : 'grade-p';
            container.innerHTML += `
                <div class="result-row">
                    <div class="result-info">
                        <h5>${escapeHtml(result.examTitle)}</h5>
                        <div class="result-score">
                            Score: <strong>${result.score}/${result.totalMarks}</strong> |
                            Correct: <strong>${result.correctCount}/${result.totalQuestions}</strong> |
                            ${result.percentage}%
                        </div>
                    </div>
                    <div class="result-grade ${gradeClass}">${result.grade}</div>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

window.initiateExamSession = function(examId) {
    state.activeExam = state.exams.find(e => e.id === examId);
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
    window.onblur = () => {
        if (state.activeExam) {
            triggerProctorWarning('TAB_SWITCH', 'Student switched browser tab');
            showToast('WARNING: Tab switching is not allowed during the exam.', 'danger');
        }
    };
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
        loadStudentDashboard();
    } catch (err) {
        await showCustomModal('Error', 'Failed to submit exam.');
        loadStudentDashboard();
    }
}

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

async function loadTeacherDashboard() {
    showView('view-teacher-dashboard');
    switchTeacherTab('profile');
    await loadTeacherProfile();
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
                ? `<span class="exam-status-pill" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid #ef4444; margin-left: 0; padding: 0.15rem 0.5rem; font-size: 0.75rem; border-radius: 4px; font-weight: 600;">ELIMINATED</span>`
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
            ? '<span class="text-danger font-bold">[ELIMINATED - MALPRACTICE]</span>' 
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
