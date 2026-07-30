const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const REQUIRED_OPTIONS = 4;

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// =========================================================================
// IN-MEMORY DATABASE (MCQ-only)
// =========================================================================

const db = {
  users: [
    { id: 'student-1', email: 'student@seep.platform', password: 'password123', role: 'STUDENT', name: 'Jane Doe', regNo: 'SEEP-2026-0091' },
    { id: 'teacher-1', email: 'teacher@seep.platform', password: 'password123', role: 'TEACHER', name: 'Dr. Robert Chen', dept: 'Biosciences' },
    { id: 'admin-1', email: 'admin@seep.platform', password: 'password123', role: 'ADMIN', name: 'System Administrator' }
  ],
  teachers: [
    { id: 'teacher-1', userId: 'teacher-1', name: 'Dr. Robert Chen', department: 'Biosciences', email: 'teacher@seep.platform' }
  ],
  exams: [],
  questions: {},
  answers: {},
  evaluations: {},
  proctorLogs: {},
  malpracticeReports: [],
  auditLogs: [
    { timestamp: new Date().toISOString(), user: 'System', action: 'PLATFORM_INITIALIZATION', details: 'MCQ examination platform loaded.' }
  ]
};

function logAction(userEmail, action, details) {
  const log = { timestamp: new Date().toISOString(), user: userEmail, action, details };
  db.auditLogs.unshift(log);
  console.log(`[AUDIT] ${userEmail} | ${action} | ${details}`);
}

function getTeacherByUserId(userId) {
  return db.teachers.find(t => t.userId === userId);
}

function getExamQuestionCount(examId) {
  return (db.questions[examId] || []).length;
}

function recalculateExamMarks(examId) {
  const exam = db.exams.find(e => e.id === examId);
  if (!exam) return;
  const questions = db.questions[examId] || [];
  exam.totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  exam.questionCount = questions.length;
}

function sanitizeQuestionForStudent(q) {
  return {
    id: q.id,
    type: 'MCQ',
    text: q.text,
    options: q.options,
    marks: q.marks
  };
}

function gradeMcqAnswer(question, studentAnswerIndex) {
  const isCorrect = studentAnswerIndex === question.correctIndex;
  return {
    score: isCorrect ? question.marks : 0,
    isCorrect,
    correctOption: OPTION_LABELS[question.correctIndex],
    correctText: question.options[question.correctIndex],
    selectedOption: studentAnswerIndex >= 0 ? OPTION_LABELS[studentAnswerIndex] : null,
    selectedText: studentAnswerIndex >= 0 ? question.options[studentAnswerIndex] : null,
    feedback: isCorrect
      ? 'Correct answer.'
      : `Incorrect. Selected: "${studentAnswerIndex >= 0 ? question.options[studentAnswerIndex] : 'None'}", Correct: "${question.options[question.correctIndex]}" (${OPTION_LABELS[question.correctIndex]})`
  };
}

// =========================================================================
// AUTH
// =========================================================================

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
  }

  logAction(email, 'USER_LOGIN', `Role: ${user.role}`);
  return res.json({
    status: 'success',
    token: `token-${user.id}`,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      regNo: user.regNo || null,
      dept: user.dept || null
    }
  });
});

// =========================================================================
// TEACHER — PROFILE
// =========================================================================

app.get('/api/v1/teacher/profile', (req, res) => {
  const teacherId = req.query.teacherId;
  const teacher = db.teachers.find(t => t.id === teacherId || t.userId === teacherId);
  if (!teacher) {
    return res.status(404).json({ status: 'error', message: 'Teacher profile not found.' });
  }
  res.json({ status: 'success', teacher });
});

app.put('/api/v1/teacher/profile', (req, res) => {
  const { userId, name, department, email } = req.body;
  let teacher = getTeacherByUserId(userId);

  if (!teacher) {
    teacher = {
      id: userId,
      userId,
      name: name || 'Teacher',
      department: department || '',
      email: email || ''
    };
    db.teachers.push(teacher);
  } else {
    if (name) teacher.name = name;
    if (department) teacher.department = department;
    if (email) teacher.email = email;
  }

  const user = db.users.find(u => u.id === userId);
  if (user) {
    if (name) user.name = name;
    if (department) user.dept = department;
  }

  logAction(email || userId, 'TEACHER_PROFILE_UPDATED', `${teacher.name} | ${teacher.department}`);
  res.json({ status: 'success', teacher });
});

// =========================================================================
// TEACHER — EXAMS & QUESTIONS
// =========================================================================

app.get('/api/v1/teacher/exams', (req, res) => {
  const teacherId = req.query.teacherId;
  const exams = db.exams.filter(e => e.teacherId === teacherId);
  res.json({ status: 'success', exams });
});

app.post('/api/v1/teacher/exams', (req, res) => {
  const { teacherId, title, subject, department, duration, passingPercentage, marksPerQuestion } = req.body;
  const teacher = db.teachers.find(t => t.id === teacherId || t.userId === teacherId);

  if (!teacher) {
    return res.status(404).json({ status: 'error', message: 'Teacher not found. Save profile first.' });
  }
  if (!title || !subject) {
    return res.status(400).json({ status: 'error', message: 'Title and subject are required.' });
  }

  const exam = {
    id: generateId('exam'),
    title,
    subject,
    department: department || teacher.department,
    teacherId: teacher.id,
    teacherName: teacher.name,
    duration: parseInt(duration, 10) || 30,
    marksPerQuestion: parseFloat(marksPerQuestion) || 1,
    totalMarks: 0,
    questionCount: 0,
    passingPercentage: parseFloat(passingPercentage) || 40,
    status: 'DRAFT',
    createdAt: new Date().toISOString()
  };

  db.exams.push(exam);
  db.questions[exam.id] = [];

  logAction(teacher.email, 'EXAM_CREATED', `${exam.title} (${exam.subject})`);
  res.status(201).json({ status: 'success', exam });
});

app.get('/api/v1/teacher/exams/:id/questions', (req, res) => {
  const questions = db.questions[req.params.id] || [];
  res.json({ status: 'success', questions });
});

app.post('/api/v1/teacher/exams/:id/questions', (req, res) => {
  const examId = req.params.id;
  const exam = db.exams.find(e => e.id === examId);
  if (!exam) {
    return res.status(404).json({ status: 'error', message: 'Exam not found.' });
  }

  const { text, options, correctIndex, marks } = req.body;

  if (!text || !Array.isArray(options) || options.length !== REQUIRED_OPTIONS) {
    return res.status(400).json({
      status: 'error',
      message: `Question must have exactly ${REQUIRED_OPTIONS} options (A–D).`
    });
  }

  const trimmedOptions = options.map(o => String(o).trim());
  if (trimmedOptions.some(o => !o)) {
    return res.status(400).json({ status: 'error', message: `All ${REQUIRED_OPTIONS} options must be filled.` });
  }

  const idx = parseInt(correctIndex, 10);
  if (Number.isNaN(idx) || idx < 0 || idx >= REQUIRED_OPTIONS) {
    return res.status(400).json({ status: 'error', message: `Correct answer must be option A–D (index 0–${REQUIRED_OPTIONS - 1}).` });
  }

  const question = {
    id: generateId('q'),
    examId,
    type: 'MCQ',
    text: text.trim(),
    options: trimmedOptions,
    correctIndex: idx,
    marks: parseFloat(marks) || exam.marksPerQuestion || 1
  };

  db.questions[examId].push(question);
  recalculateExamMarks(examId);

  logAction(exam.teacherName, 'QUESTION_ADDED', `Exam: ${exam.title} | Q: ${question.text.slice(0, 50)}...`);
  res.status(201).json({ status: 'success', question, exam });
});

app.delete('/api/v1/teacher/exams/:examId/questions/:questionId', (req, res) => {
  const { examId, questionId } = req.params;
  const list = db.questions[examId];
  if (!list) {
    return res.status(404).json({ status: 'error', message: 'Exam not found.' });
  }

  const before = list.length;
  db.questions[examId] = list.filter(q => q.id !== questionId);
  if (db.questions[examId].length === before) {
    return res.status(404).json({ status: 'error', message: 'Question not found.' });
  }

  recalculateExamMarks(examId);
  const exam = db.exams.find(e => e.id === examId);
  res.json({ status: 'success', exam });
});

app.put('/api/v1/teacher/exams/:id/publish', (req, res) => {
  const exam = db.exams.find(e => e.id === req.params.id);
  if (!exam) {
    return res.status(404).json({ status: 'error', message: 'Exam not found.' });
  }

  const questions = db.questions[exam.id] || [];
  if (questions.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Add at least one question before publishing.' });
  }

  exam.status = 'ACTIVE';
  logAction(exam.teacherName, 'EXAM_PUBLISHED', exam.title);
  res.json({ status: 'success', exam });
});

// =========================================================================
// STUDENT — EXAMS
// =========================================================================

app.get('/api/v1/exams', (req, res) => {
  const activeExams = db.exams
    .filter(e => e.status === 'ACTIVE')
    .map(e => ({
      ...e,
      questionCount: getExamQuestionCount(e.id)
    }));
  res.json({ status: 'success', exams: activeExams });
});

app.post('/api/v1/exams/:id/start', (req, res) => {
  const examId = req.params.id;
  const { studentId } = req.body;
  const exam = db.exams.find(e => e.id === examId && e.status === 'ACTIVE');
  if (!exam) {
    return res.status(404).json({ status: 'error', message: 'Exam not found or not active.' });
  }

  const questions = db.questions[examId] || [];
  if (questions.length === 0) {
    return res.status(400).json({ status: 'error', message: 'This exam has no questions.' });
  }

  const sessionKey = `${examId}:::${studentId}`;
  if (db.evaluations[sessionKey]) {
    const isMalpractice = db.evaluations[sessionKey].status === 'MALPRACTICE';
    return res.status(400).json({
      status: 'error',
      message: isMalpractice
        ? 'You have been eliminated from this exam due to malpractice.'
        : 'You have already submitted this exam.'
    });
  }

  if (!db.answers[sessionKey]) {
    db.answers[sessionKey] = {};
    db.proctorLogs[sessionKey] = [];
    logAction(studentId, 'EXAM_STARTED', exam.title);
  }

  res.json({
    status: 'success',
    session_id: sessionKey,
    exam,
    questions: questions.map(sanitizeQuestionForStudent),
    duration_remaining_seconds: exam.duration * 60
  });
});

app.put('/api/v1/exams/sync', (req, res) => {
  const { session_id, answers } = req.body;
  if (!db.answers[session_id]) {
    return res.status(404).json({ status: 'error', message: 'Session not found.' });
  }

  answers.forEach(ans => {
    db.answers[session_id][ans.question_id] = ans.answer_index;
  });

  res.json({ status: 'synchronized', server_timestamp: new Date().toISOString() });
});

app.post('/api/v1/proctor/warning', (req, res) => {
  const { session_id, type, reason } = req.body;
  if (!db.proctorLogs[session_id]) {
    return res.status(404).json({ status: 'error', message: 'Session not found.' });
  }

  db.proctorLogs[session_id].push({ timestamp: new Date().toISOString(), type, reason });
  logAction(session_id.split(':::')[1], 'PROCTOR_WARNING', `${type}: ${reason}`);

  res.json({
    status: 'warning_registered',
    warningCount: db.proctorLogs[session_id].length
  });
});

app.post('/api/v1/proctor/malpractice', (req, res) => {
  const { session_id, studentId, type, reason } = req.body;
  const [examId] = (session_id || '').split(':::');
  const exam = db.exams.find(e => e.id === examId);
  const student = db.users.find(u => u.id === studentId);

  if (!exam || !student) {
    return res.status(404).json({ status: 'error', message: 'Session not found.' });
  }

  if (!db.proctorLogs[session_id]) {
    db.proctorLogs[session_id] = [];
  }

  const incident = {
    timestamp: new Date().toISOString(),
    type: type || 'MALPRACTICE',
    reason: reason || 'Exam security violation'
  };

  db.proctorLogs[session_id].push(incident);

  const report = {
    id: generateId('mal'),
    sessionKey: session_id,
    examId,
    examTitle: exam.title,
    subject: exam.subject,
    teacherId: exam.teacherId,
    teacherName: exam.teacherName,
    studentId,
    studentName: student.name,
    type: incident.type,
    reason: incident.reason,
    reportedAt: incident.timestamp,
    status: 'REPORTED'
  };

  db.malpracticeReports.unshift(report);
  logAction(student.email || studentId, 'MALPRACTICE_REPORTED', `${exam.title}: ${incident.type} — ${incident.reason}`);
  logAction(exam.teacherName, 'MALPRACTICE_ALERT', `Student ${student.name} flagged for ${incident.type}`);

  res.json({ status: 'success', report });
});

app.get('/api/v1/teacher/malpractice', (req, res) => {
  const teacherId = req.query.teacherId;
  const teacher = getTeacherByUserId(teacherId) || db.teachers.find(t => t.id === teacherId);
  const resolvedTeacherId = teacher ? teacher.id : teacherId;

  const reports = db.malpracticeReports.filter(r => r.teacherId === resolvedTeacherId);
  res.json({ status: 'success', reports });
});

app.post('/api/v1/exams/:id/submit', (req, res) => {
  const examId = req.params.id;
  const { studentId, malpractice, malpracticeReason, malpracticeType } = req.body;
  const sessionKey = `${examId}:::${studentId}`;

  if (!db.answers[sessionKey]) {
    return res.status(404).json({ status: 'error', message: 'Exam session not found.' });
  }

  const exam = db.exams.find(e => e.id === examId);
  const questions = db.questions[examId] || [];
  const studentAnswers = db.answers[sessionKey];
  const proctorWarnings = db.proctorLogs[sessionKey] || [];

  let obtainedScore = 0;
  const gradingDetails = [];

  questions.forEach(q => {
    const answerIndex = studentAnswers[q.id] !== undefined ? parseInt(studentAnswers[q.id], 10) : -1;
    const result = gradeMcqAnswer(q, answerIndex);
    obtainedScore += result.score;

    gradingDetails.push({
      questionId: q.id,
      questionText: q.text,
      options: q.options,
      submittedAnswerIndex: answerIndex,
      submittedAnswer: result.selectedText || 'No response',
      submittedOption: result.selectedOption,
      correctOption: result.correctOption,
      correctAnswer: result.correctText,
      isCorrect: result.isCorrect,
      score: result.score,
      maxScore: q.marks,
      feedback: result.feedback
    });
  });

  const passingScore = exam.totalMarks * (exam.passingPercentage / 100);
  const percentage = exam.totalMarks > 0 ? (obtainedScore / exam.totalMarks) * 100 : 0;
  const isPass = obtainedScore >= passingScore;
  const grade = isPass ? (percentage >= 85 ? 'A' : percentage >= 70 ? 'B' : percentage >= 55 ? 'C' : 'D') : 'F';
  const isMalpractice = Boolean(malpractice) || proctorWarnings.length >= 3;
  const status = isMalpractice ? 'MALPRACTICE' : (isPass ? 'PASS' : 'FAIL');
  const malpracticeTypeResolved = malpracticeType || (proctorWarnings.length >= 3 ? 'EXCEEDED_WARNINGS' : null);
  const malpracticeReasonResolved = malpracticeReason || (proctorWarnings.length >= 3 ? 'Student exceeded maximum proctor warnings (3+ tab switches / violations).' : null);

  db.evaluations[sessionKey] = {
    status,
    score: parseFloat(obtainedScore.toFixed(2)),
    percentage: parseFloat(percentage.toFixed(2)),
    grade: isMalpractice ? 'F' : grade,
    correctCount: gradingDetails.filter(d => d.isCorrect).length,
    totalQuestions: questions.length,
    details: gradingDetails,
    warningCount: proctorWarnings.length,
    warnings: proctorWarnings,
    malpractice: isMalpractice,
    malpracticeReason: malpracticeReasonResolved,
    malpracticeType: malpracticeTypeResolved
  };

  const student = db.users.find(u => u.id === studentId);
  const studentName = student ? student.name : studentId;

  if (isMalpractice) {
    const alreadyReported = db.malpracticeReports.some(r => r.sessionKey === sessionKey);
    if (!alreadyReported) {
      const report = {
        id: generateId('mal'),
        sessionKey,
        examId,
        examTitle: exam.title,
        subject: exam.subject,
        teacherId: exam.teacherId,
        teacherName: exam.teacherName,
        studentId,
        studentName,
        type: malpracticeTypeResolved || 'EXCEEDED_WARNINGS',
        reason: malpracticeReasonResolved || 'Student exceeded maximum proctor warnings.',
        reportedAt: new Date().toISOString(),
        status: 'REPORTED'
      };
      db.malpracticeReports.unshift(report);
      logAction(student ? student.email : studentId, 'MALPRACTICE_REPORTED', `${exam.title}: ${report.type} — ${report.reason}`);
    }
  }

  logAction(studentId, isMalpractice ? 'EXAM_TERMINATED_MALPRACTICE' : 'EXAM_SUBMITTED',
    `${exam.title}: ${obtainedScore}/${exam.totalMarks}${isMalpractice ? ' [MALPRACTICE]' : ''}`);

  res.json({
    status: 'submitted',
    score: parseFloat(obtainedScore.toFixed(2)),
    totalMarks: exam.totalMarks,
    percentage: parseFloat(percentage.toFixed(2)),
    correctCount: gradingDetails.filter(d => d.correctCount).length,
    totalQuestions: questions.length,
    grade: isMalpractice ? 'F' : grade,
    proctorReviewStatus: status,
    malpractice: isMalpractice,
    malpracticeReason: malpracticeReason || null
  });
});

// =========================================================================
// RESULTS & TEACHER SUBMISSIONS
// =========================================================================

app.get('/api/v1/results/:student_id', (req, res) => {
  const studentId = req.params.student_id;
  const results = [];

  Object.keys(db.evaluations).forEach(key => {
    if (key.endsWith(`:::${studentId}`)) {
      const examId = key.split(':::')[0];
      const exam = db.exams.find(e => e.id === examId);
      const evalData = db.evaluations[key];
      if (!exam) return;

      results.push({
        examId,
        examTitle: exam.title,
        subject: exam.subject,
        totalMarks: exam.totalMarks,
        score: evalData.score,
        percentage: evalData.percentage,
        grade: evalData.grade,
        correctCount: evalData.correctCount,
        totalQuestions: evalData.totalQuestions,
        status: evalData.status,
        warningCount: evalData.warningCount,
        details: evalData.details
      });
    }
  });

  res.json({ status: 'success', results });
});

app.get('/api/v1/teacher/submissions', (req, res) => {
  const teacherId = req.query.teacherId;
  const submissions = [];

  Object.keys(db.evaluations).forEach(key => {
    const [examId, studentId] = key.split(':::');
    const exam = db.exams.find(e => e.id === examId);
    if (!exam) return;
    if (teacherId && exam.teacherId !== teacherId && exam.teacherId !== getTeacherByUserId(teacherId)?.id) return;

    const evalData = db.evaluations[key];
    const student = db.users.find(u => u.id === studentId);

    submissions.push({
      sessionKey: key,
      examId,
      examTitle: exam.title,
      subject: exam.subject,
      department: exam.department,
      teacherName: exam.teacherName,
      studentName: student ? student.name : studentId,
      studentId,
      score: evalData.score,
      totalMarks: exam.totalMarks,
      percentage: evalData.percentage,
      grade: evalData.grade,
      correctCount: evalData.correctCount,
      totalQuestions: evalData.totalQuestions,
      status: evalData.status,
      warningCount: evalData.warningCount,
      warnings: evalData.warnings || [],
      details: evalData.details
    });
  });

  res.json({ status: 'success', submissions });
});

app.post('/api/v1/teacher/exams/reattend', (req, res) => {
  const { examId, studentId } = req.body;
  const sessionKey = `${examId}:::${studentId}`;

  const exam = db.exams.find(e => e.id === examId);
  const student = db.users.find(u => u.id === studentId);

  // Clear answers, evaluations, and proctor logs
  delete db.evaluations[sessionKey];
  delete db.answers[sessionKey];
  delete db.proctorLogs[sessionKey];

  // Clean malpractice report if any exists
  db.malpracticeReports = db.malpracticeReports.filter(
    r => !(r.examId === examId && r.studentId === studentId)
  );

  logAction(
    exam ? exam.teacherName : 'Teacher',
    'STUDENT_REATTEND_ALLOWED',
    `Student: ${student ? student.name : studentId} for exam: ${exam ? exam.title : examId}`
  );

  res.json({ status: 'success', message: 'Student is allowed to reattend the exam.' });
});

// =========================================================================
// ADMIN
// =========================================================================

app.get('/api/v1/admin/logs', (req, res) => {
  res.json({ status: 'success', logs: db.auditLogs });
});

app.get('/api/v1/admin/stats', (req, res) => {
  res.json({
    status: 'healthy',
    cpu_usage: `${(15 + Math.random() * 10).toFixed(1)}%`,
    memory_usage: `${(45 + Math.random() * 5).toFixed(1)}%`,
    active_connections: Object.keys(db.answers).length * 2 + 5,
    active_sessions: Object.keys(db.answers).length,
    total_exams: db.exams.length,
    total_questions: Object.values(db.questions).flat().length
  });
});

app.get('/api/v1/admin/users', (req, res) => {
  const teachers = db.users.filter(u => u.role === 'TEACHER').map(u => {
    const t = db.teachers.find(teacher => teacher.userId === u.id || teacher.id === u.id) || {};
    return {
      id: u.id,
      name: u.name || t.name || 'N/A',
      email: u.email,
      department: u.dept || t.department || 'N/A'
    };
  });

  const students = db.users.filter(u => u.role === 'STUDENT').map(u => ({
    id: u.id,
    name: u.name || 'N/A',
    email: u.email,
    regNo: u.regNo || 'N/A'
  }));

  res.json({
    status: 'success',
    teachers,
    students
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  
  console.log(`SEEP MCQ Platform running on http://localhost:${PORT}`);
  
});
