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
  retestRequests: [],
  auditLogs: [
    { timestamp: new Date().toISOString(), user: 'System', action: 'PLATFORM_INITIALIZATION', details: 'MCQ examination platform loaded.' }
  ]
};

const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

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

app.post('/api/exams', (req, res) => {
  const { title, subject, department, durationMinutes, mcqCount, codingCount, creatorId } = req.body;
  const exam = {
    id: generateId('exam'),
    title: title || 'New Exam',
    subject: subject || 'General',
    department: department || 'General',
    durationMinutes: durationMinutes || 60,
    mcqCount: mcqCount || 0,
    codingCount: codingCount || 0,
    creatorId: creatorId || 'teacher-1',
    status: 'DRAFT',
    createdAt: new Date().toISOString()
  };
  db.exams.push(exam);
  db.questions[exam.id] = [];
  res.status(201).json(exam);
});

app.post('/api/exams/:id/mcq', (req, res) => {
  const examId = req.params.id;
  const questions = req.body.questions || [];
  if (!db.questions[examId]) {
    db.questions[examId] = [];
  }
  db.questions[examId].push(...questions);
  res.status(200).json({ status: 'success', questions: db.questions[examId] });
});

app.post('/api/exams/:id/publish', (req, res) => {
  const examId = req.params.id;
  const exam = db.exams.find(e => e.id === examId);
  if (exam) {
    exam.status = 'ACTIVE';
  }
  res.status(200).json({ status: 'success', message: 'Exam published' });
});

app.post('/api/coding/questions', (req, res) => {
  const { examId, title, description, marks } = req.body;
  const question = {
    id: generateId('qcode'),
    examId,
    type: 'CODING',
    title: title || 'Coding Problem',
    description: description || '',
    marks: marks || 10
  };
  if (!db.questions[examId]) db.questions[examId] = [];
  db.questions[examId].push(question);
  res.status(201).json(question);
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

  if (req.body.type === 'CODING') {
    const { title, description, inputFormat, outputFormat, marks, sampleInput, sampleOutput, hiddenInput, hiddenOutput } = req.body;
    if (!title || !description) {
      return res.status(400).json({ status: 'error', message: 'Title and description are required for coding questions.' });
    }
    const question = {
      id: generateId('qcode'),
      examId,
      type: 'CODING',
      title: title.trim(),
      description: description.trim(),
      inputFormat: (inputFormat || '').trim(),
      outputFormat: (outputFormat || '').trim(),
      marks: parseFloat(marks) || 10,
      sampleInput: (sampleInput || '').trim(),
      sampleOutput: (sampleOutput || '').trim(),
      hiddenInput: (hiddenInput || '').trim(),
      hiddenOutput: (hiddenOutput || '').trim(),
      starterCode: 'print(input())\n'
    };
    db.questions[examId].push(question);
    recalculateExamMarks(examId);
    logAction(exam.teacherName, 'CODING_QUESTION_ADDED', `Exam: ${exam.title} | ${question.title}`);
    return res.status(201).json({ status: 'success', question, exam });
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
        ? 'Malpractice detected. You have been disqualified from this exam.'
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

app.post('/api/v1/exams/:id/submit', async (req, res) => {
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

  for (const q of questions) {
    if (q.type === 'CODING') {
      const code = studentAnswers[q.id] || '';
      const testCases = [];
      if (q.sampleInput) testCases.push({ input: q.sampleInput, expectedOutput: q.sampleOutput, weight: 1 });
      if (q.hiddenInput) testCases.push({ input: q.hiddenInput, expectedOutput: q.hiddenOutput, weight: 2 });

      let passedCount = 0;
      let totalWeight = 0;
      let passedWeight = 0;

      for (const tc of testCases) {
        totalWeight += tc.weight;
        const exec = await executeCodeSandbox('python', code, tc.input);
        if (!exec.compileError && !exec.runtimeError && compareOutputs(exec.stdout, tc.expectedOutput)) {
          passedCount++;
          passedWeight += tc.weight;
        }
      }

      const qScore = totalWeight > 0 ? (passedWeight / totalWeight) * q.marks : 0;
      obtainedScore += qScore;
      gradingDetails.push({
        questionId: q.id,
        questionText: q.title || 'Coding Problem',
        isCorrect: passedCount === testCases.length,
        score: Math.round(qScore * 100) / 100,
        maxScore: q.marks,
        feedback: `Passed ${passedCount}/${testCases.length} test cases.`
      });
    } else {
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
    }
  }

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

app.post('/api/v1/exams/:id/retest-request', (req, res) => {
  const examId = req.params.id;
  const { studentId, reason } = req.body;

  if (!reason) {
    return res.status(400).json({ status: 'error', message: 'Reason is required.' });
  }

  const exam = db.exams.find(e => e.id === examId);
  const student = db.users.find(u => u.id === studentId);
  if (!exam || !student) {
    return res.status(404).json({ status: 'error', message: 'Exam or student not found.' });
  }

  const existingRequest = db.retestRequests.find(r => r.examId === examId && r.studentId === studentId && r.status === 'PENDING');
  if (existingRequest) {
    return res.status(400).json({ status: 'error', message: 'A retest request is already pending for this exam.' });
  }

  const newRequest = {
    id: generateId('req'),
    examId,
    examTitle: exam.title,
    studentId,
    studentName: student.name,
    reason: reason.trim(),
    status: 'PENDING',
    requestedAt: new Date().toISOString()
  };

  db.retestRequests.push(newRequest);
  logAction(student.email, 'RETEST_REQUESTED', `Exam: ${exam.title} | Reason: ${newRequest.reason}`);

  res.status(201).json({ status: 'success', request: newRequest });
});

app.get('/api/v1/teacher/security-dashboard', (req, res) => {
  const teacherId = req.query.teacherId;
  const teacher = getTeacherByUserId(teacherId) || db.teachers.find(t => t.id === teacherId);
  const resolvedTeacherId = teacher ? teacher.id : teacherId;

  const teacherExams = db.exams.filter(e => e.teacherId === resolvedTeacherId).map(e => e.id);

  const violations = db.malpracticeReports.filter(r => r.teacherId === resolvedTeacherId || teacherExams.includes(r.examId));
  const pendingRequests = db.retestRequests.filter(r => r.status === 'PENDING' && teacherExams.includes(r.examId));
  const historyRequests = db.retestRequests.filter(r => r.status !== 'PENDING' && teacherExams.includes(r.examId));

  res.json({
    status: 'success',
    violations,
    pendingRequests,
    historyRequests
  });
});

app.get('/api/v1/teacher/retest-requests', (req, res) => {
  const teacherId = req.query.teacherId;
  const teacherExams = db.exams.filter(e => e.teacherId === teacherId).map(e => e.id);
  const requests = db.retestRequests.filter(r => teacherExams.includes(r.examId));
  res.json({ status: 'success', requests });
});

app.post('/api/v1/teacher/retest-requests/:requestId/action', (req, res) => {
  const requestId = req.params.requestId;
  const { action } = req.body;

  const request = db.retestRequests.find(r => r.id === requestId);
  if (!request) {
    return res.status(404).json({ status: 'error', message: 'Retest request not found.' });
  }

  if (request.status !== 'PENDING') {
    return res.status(400).json({ status: 'error', message: 'Request has already been processed.' });
  }

  if (action === 'APPROVE') {
    request.status = 'APPROVED';
    const sessionKey = `${request.examId}:::${request.studentId}`;
    
    delete db.evaluations[sessionKey];
    delete db.answers[sessionKey];
    delete db.proctorLogs[sessionKey];

    db.malpracticeReports = db.malpracticeReports.filter(
      r => !(r.examId === request.examId && r.studentId === request.studentId)
    );

    logAction(request.studentName, 'RETEST_APPROVED', `Retest approved by teacher for exam: ${request.examTitle}`);
    res.json({ status: 'success', message: 'Retest request approved. Student exam attempt reset.', request });
  } else if (action === 'DECLINE') {
    request.status = 'DECLINED';
    logAction(request.studentName, 'RETEST_DECLINED', `Retest declined by teacher for exam: ${request.examTitle}`);
    res.json({ status: 'success', message: 'Retest request declined.', request });
  } else {
    res.status(400).json({ status: 'error', message: 'Invalid action.' });
  }
});

app.get('/api/v1/student/retest-requests/:studentId', (req, res) => {
  const studentId = req.params.studentId;
  const requests = db.retestRequests.filter(r => r.studentId === studentId);
  res.json({ status: 'success', requests });
});

// =========================================================================
// CODING COMPILER & EXECUTION ENGINE
// =========================================================================

function normalizeText(str) {
  if (str == null) return '';
  return String(str).replace(/\r\n/g, '\n').split('\n').map(l => l.trimEnd()).join('\n').trim();
}

function compareOutputs(actual, expected) {
  const a = normalizeText(actual);
  const e = normalizeText(expected);
  if (a === e) return true;
  const aLines = a.split('\n');
  const eLines = e.split('\n');
  if (aLines.length !== eLines.length) return false;
  return aLines.every((line, i) => {
    const al = line.trim();
    const el = eLines[i].trim();
    if (al === el) return true;
    const an = Number(al);
    const en = Number(el);
    if (!Number.isNaN(an) && !Number.isNaN(en)) {
      return Math.abs(an - en) <= 1e-6;
    }
    return false;
  });
}

async function executeCodeSandbox(language, sourceCode, stdin = '') {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seep-code-'));
  const filenames = { c: 'main.c', java: 'Main.java', python: 'main.py' };
  const filename = filenames[language] || 'main.txt';
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, sourceCode);

  const start = Date.now();
  try {
    if (language === 'python') {
      const res = await execFileAsync('python3', [filePath], { input: stdin, timeout: 5000 });
      return { stdout: res.stdout || '', stderr: res.stderr || '', compileError: null, runtimeError: null, executionTimeMs: Date.now() - start, memoryKb: 4096 };
    } else if (language === 'c') {
      const binPath = path.join(tempDir, 'main');
      await execFileAsync('gcc', [filePath, '-O2', '-o', binPath]);
      const res = await execFileAsync(binPath, [], { input: stdin, timeout: 5000 });
      return { stdout: res.stdout || '', stderr: res.stderr || '', compileError: null, runtimeError: null, executionTimeMs: Date.now() - start, memoryKb: 2048 };
    } else if (language === 'java') {
      await execFileAsync('javac', [filePath], { cwd: tempDir });
      const res = await execFileAsync('java', ['-cp', tempDir, 'Main'], { input: stdin, timeout: 5000 });
      return { stdout: res.stdout || '', stderr: res.stderr || '', compileError: null, runtimeError: null, executionTimeMs: Date.now() - start, memoryKb: 16384 };
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }
  } catch (err) {
    const isCompile = err.cmd && (err.cmd.includes('gcc') || err.cmd.includes('javac'));
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      compileError: isCompile ? (err.stderr || err.message) : null,
      runtimeError: !isCompile ? (err.stderr || err.message) : null,
      executionTimeMs: Date.now() - start,
      memoryKb: 0
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

app.post('/api/v1/compiler/run', async (req, res) => {
  try {
    const { language, sourceCode, stdin } = req.body;
    if (!language || !sourceCode) return res.status(400).json({ status: 'error', message: 'Language and source code required' });
    const result = await executeCodeSandbox(language, sourceCode, stdin || '');
    res.json({ status: 'success', ...result });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

app.post('/api/v1/compiler/submit', async (req, res) => {
  try {
    const { language, sourceCode, testCases, maxMarks = 10 } = req.body;
    if (!language || !sourceCode || !Array.isArray(testCases)) {
      return res.status(400).json({ status: 'error', message: 'Missing parameters' });
    }

    let passedCount = 0;
    let totalWeight = 0;
    let passedWeight = 0;

    for (const tc of testCases) {
      const weight = tc.weight || 1;
      totalWeight += weight;
      const exec = await executeCodeSandbox(language, sourceCode, tc.input || '');
      const matched = compareOutputs(exec.stdout, tc.expectedOutput);
      if (matched && !exec.compileError && !exec.runtimeError) {
        passedCount++;
        passedWeight += weight;
      }
    }

    const score = totalWeight > 0 ? (passedWeight / totalWeight) * maxMarks : 0;
    res.json({
      status: 'success',
      score: Math.round(score * 100) / 100,
      maxScore: maxMarks,
      passedCases: passedCount,
      totalCases: testCases.length
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SEEP MCQ Platform running on http://localhost:${PORT}`);
  });
}

module.exports = { app };
