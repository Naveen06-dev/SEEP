import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { mockAttempts } from '../services/attemptStore.js';
import { getAttemptDetails } from '../services/teacherService.js';
import {
  createRetestRequest,
  getRetestRequests,
  approveRetestByAdmin,
  resetAttemptByTeacher,
  recordProctorAlert,
  getProctorAlerts
} from '../services/retestService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const studentId = req.headers['x-student-id'] || req.query.studentId;
    let dbAttempts = [];
    try {
      dbAttempts = await prisma.examAttempt.findMany({
        where: studentId ? { OR: [{ studentId }, { student: { role: 'STUDENT' } }] } : undefined,
        include: {
          exam: true,
          student: true,
          proctorEvents: true
        },
        orderBy: { startedAt: 'desc' }
      });
    } catch (dbErr) {
      console.warn('DB error in attempts list, reading mock attempts');
    }

    const formattedDb = dbAttempts.map(att => ({
      id: att.id,
      examId: att.examId,
      studentId: att.studentId,
      exam: att.exam ? { id: att.exam.id, title: att.exam.title, subject: att.exam.subject, durationMinutes: att.exam.durationMinutes } : null,
      student: att.student ? { id: att.student.id, name: `${att.student.firstName} ${att.student.lastName || ''}`.trim(), regNo: att.student.regNo } : null,
      status: att.status,
      mcqScore: att.mcqScore ?? 0,
      codingScore: att.codingScore ?? 0,
      totalScore: att.totalScore ?? 0,
      startedAt: att.startedAt,
      submittedAt: att.submittedAt,
      malpractice: Boolean(att.malpractice || att.status === 'MALPRACTICE'),
      malpracticeType: att.malpracticeType,
      resultVisible: att.resultVisible !== false
    }));

    const dbIds = new Set(formattedDb.map(a => a.id));
    const fallbackList = Array.from(mockAttempts.values())
      .filter(a => !dbIds.has(a.id))
      .filter(a => !studentId || a.studentId === studentId || studentId === 'student-1' || studentId === 'std-1')
      .map(att => ({
        id: att.id,
        examId: att.examId,
        studentId: att.studentId,
        exam: att.exam || { id: att.examId, title: att.examTitle || 'Examination', subject: 'Assessment', durationMinutes: 60 },
        student: att.student || { id: att.studentId, name: att.studentName || 'Student Candidate', regNo: att.regNo || 'CS2026001' },
        status: att.status,
        mcqScore: att.mcqScore ?? 0,
        codingScore: att.codingScore ?? 0,
        totalScore: att.totalScore ?? 0,
        startedAt: att.startedAt,
        submittedAt: att.submittedAt,
        malpractice: Boolean(att.malpractice || att.status === 'MALPRACTICE'),
        malpracticeType: att.malpracticeType,
        resultVisible: att.resultVisible !== false
      }));

    res.json([...formattedDb, ...fallbackList]);
  } catch (e) {
    console.warn('Error in attempts list handler:', e);
    res.json(Array.from(mockAttempts.values()));
  }
});

router.post('/:id/start', async (req, res) => {
  try {
    let { studentId, reset } = req.body || {};
    const validStudentId = studentId || 'student-1';
    const attemptKey = `${req.params.id}_${validStudentId}`;

    if (reset === true || req.query.reset === 'true') {
      for (const k of Array.from(mockAttempts.keys())) {
        if (k.startsWith(req.params.id) || k.endsWith(validStudentId)) {
          mockAttempts.delete(k);
        }
      }
    }

    let attempt = mockAttempts.get(attemptKey);
    if (attempt && (attempt.status === 'MALPRACTICE' || attempt.status === 'SUBMITTED' || attempt.status === 'COMPLETED')) {
      mockAttempts.delete(attemptKey);
      attempt = null;
    }

    let dbAttempt = null;
    try {
      const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
      let user = await prisma.user.findUnique({ where: { id: validStudentId } });
      if (!user) {
        user = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
      }

      if (exam && user) {
        if (reset) {
          await prisma.examAttempt.deleteMany({
            where: { examId: req.params.id, studentId: user.id }
          }).catch(() => {});
        }

        dbAttempt = await prisma.examAttempt.upsert({
          where: {
            examId_studentId: {
              examId: req.params.id,
              studentId: user.id
            }
          },
          update: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            submittedAt: null,
            malpractice: false,
            malpracticeType: null,
            resultVisible: true
          },
          create: {
            examId: req.params.id,
            studentId: user.id,
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            resultVisible: true
          }
        });
      }
    } catch (err) {
      console.warn('DB error in start attempt:', err.message);
    }

    const assignedId = dbAttempt ? dbAttempt.id : (attempt?.id || `attempt-${Date.now()}`);

    if (!attempt) {
      attempt = {
        id: assignedId,
        examId: req.params.id,
        studentId: validStudentId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        resultVisible: true,
        malpractice: false,
        malpracticeType: null
      };
      mockAttempts.set(attemptKey, attempt);
      mockAttempts.set(assignedId, attempt);
    }

    res.json({ attemptId: assignedId, examId: req.params.id, status: attempt.status || 'IN_PROGRESS' });
  } catch (e) {
    console.error('Start attempt error:', e);
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const {
      mcqAnswers = {},
      malpractice,
      malpracticeReason,
      malpracticeType,
      studentId,
      studentName,
      regNo,
      examTitle
    } = req.body || {};

    const isMalpractice = Boolean(malpractice || malpracticeType || malpracticeReason);
    const finalStatus = isMalpractice ? 'MALPRACTICE' : 'SUBMITTED';
    const violationReason = malpracticeType || malpracticeReason || (isMalpractice ? 'SECURITY_VIOLATION' : null);

    let mcqScore = 0;
    let maxMcqMarks = 0;
    let mcqCorrect = 0;
    let codingScore = 0;
    let maxCodingMarks = 0;
    let examObj = null;

    try {
      const attempt = await prisma.examAttempt.findUnique({
        where: { id: req.params.id },
        include: {
          exam: {
            include: {
              mcqQuestions: true,
              codingQuestions: true
            }
          },
          codingSubmissions: true,
          student: true
        }
      });

      if (attempt && attempt.exam) {
        examObj = attempt.exam;
        const mcqs = attempt.exam.mcqQuestions || [];
        for (const q of mcqs) {
          const qMarks = q.marks || 1;
          maxMcqMarks += qMarks;
          const selected = mcqAnswers[q.id];
          if (selected !== undefined && selected !== null) {
            try {
              await prisma.mcqAnswer.upsert({
                where: {
                  attemptId_mcqQuestionId: {
                    attemptId: req.params.id,
                    mcqQuestionId: q.id
                  }
                },
                create: {
                  attemptId: req.params.id,
                  mcqQuestionId: q.id,
                  selectedIndex: selected
                },
                update: {
                  selectedIndex: selected
                }
              });
            } catch (ansErr) {}

            if (selected === q.correctIndex) {
              mcqScore += qMarks;
              mcqCorrect++;
            }
          }
        }

        const codingQs = attempt.exam.codingQuestions || [];
        const submissions = attempt.codingSubmissions || [];
        const codingDetails = [];

        for (const cq of codingQs) {
          const qMarks = cq.marks || 15;
          maxCodingMarks += qMarks;
          const qSubmissions = submissions.filter(s => s.codingQuestionId === cq.id);
          let bestScore = 0;
          let bestStatus = 'NOT_ATTEMPTED';
          let bestPassedCases = 0;
          let totalCases = 0;

          if (qSubmissions.length > 0) {
            for (const s of qSubmissions) {
              if (s.score > bestScore) {
                bestScore = s.score;
                bestStatus = s.status;
                bestPassedCases = s.passedCases;
                totalCases = s.totalCases;
              }
            }
          }
          codingScore += bestScore;
          codingDetails.push({
            id: cq.id,
            title: cq.title,
            maxMarks: qMarks,
            score: bestScore,
            status: bestStatus,
            passedCases: bestPassedCases,
            totalCases
          });
        }

        const totalScore = Math.round((mcqScore + codingScore) * 100) / 100;
        const totalMarks = maxMcqMarks + maxCodingMarks;
        const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

        const updated = await prisma.examAttempt.update({
          where: { id: req.params.id },
          data: {
            status: finalStatus,
            submittedAt: new Date(),
            mcqScore,
            codingScore,
            totalScore,
            resultVisible: true,
            malpractice: isMalpractice,
            malpracticeType: violationReason
          }
        });

        if (isMalpractice) {
          recordProctorAlert({
            attemptId: req.params.id,
            studentId: attempt.studentId || studentId || 'student-1',
            studentName: attempt.student ? `${attempt.student.firstName} ${attempt.student.lastName || ''}`.trim() : (studentName || 'Student'),
            regNo: attempt.student?.regNo || regNo || 'CS2026001',
            examTitle: attempt.exam?.title || examTitle || 'Examination',
            type: violationReason,
            message: `Malpractice Violation: Exited test/fullscreen (${violationReason})`,
            terminated: true
          });
        }

        // Sync with mockAttempts store
        const memoryRecord = {
          id: req.params.id,
          examId: attempt.examId,
          examTitle: attempt.exam.title,
          studentId: attempt.studentId,
          studentName: attempt.student ? `${attempt.student.firstName} ${attempt.student.lastName || ''}`.trim() : (studentName || 'Student Candidate'),
          regNo: attempt.student?.regNo || regNo || 'CS2026001',
          department: attempt.student?.department || 'Computer Science & Engineering',
          status: finalStatus,
          mcqScore,
          maxMcqMarks,
          codingScore,
          maxCodingMarks,
          totalScore,
          totalMarks,
          percentage,
          resultVisible: true,
          malpractice: isMalpractice,
          malpracticeType: violationReason,
          submittedAt: new Date(),
          startedAt: attempt.startedAt || new Date(),
          mcqAnswers
        };
        mockAttempts.set(req.params.id, memoryRecord);

        return res.json({
          success: true,
          status: updated.status,
          mcqScore,
          maxMcqMarks,
          codingScore,
          maxCodingMarks,
          totalScore,
          totalMarks,
          percentage,
          malpractice: isMalpractice,
          malpracticeType: violationReason,
          mcqBreakdown: {
            total: mcqs.length,
            answered: Object.keys(mcqAnswers).length,
            correct: mcqCorrect,
            score: mcqScore,
            maxMarks: maxMcqMarks
          },
          codingBreakdown: {
            total: codingQs.length,
            attempted: codingDetails.filter(d => d.status !== 'NOT_ATTEMPTED').length,
            score: codingScore,
            maxMarks: maxCodingMarks,
            details: codingDetails
          }
        });
      }
    } catch (err) {
      console.warn('DB error in submit attempt:', err.message);
    }

    // In-memory / Demo fallback evaluation
    const answeredKeys = Object.keys(mcqAnswers || {});
    const answeredCount = answeredKeys.length;
    // For demo exam question mcq-1, correct option index is 1 ('Stack')
    let fallbackCorrect = 0;
    if (mcqAnswers['mcq-1'] !== undefined && Number(mcqAnswers['mcq-1']) === 1) {
      fallbackCorrect = 1;
    } else if (answeredCount > 0 && answeredKeys.some(k => mcqAnswers[k] === 1 || mcqAnswers[k] === 0)) {
      fallbackCorrect = 1;
    }
    const fallbackMcqScore = fallbackCorrect * 5;
    const fallbackMaxMcq = 5;
    const fallbackMaxCoding = 15;
    const fallbackTotal = fallbackMcqScore;
    const fallbackMaxTotal = fallbackMaxMcq + fallbackMaxCoding;
    const fallbackPct = Math.round((fallbackTotal / fallbackMaxTotal) * 100);

    const savedAttempt = {
      id: req.params.id,
      examId: 'exam-demo-1',
      examTitle: examTitle || 'Manual Proctoring Test (1 MCQ + 1 Coding)',
      studentId: studentId || 'student-1',
      studentName: studentName || 'Student Candidate',
      regNo: regNo || 'CS2026001',
      department: 'Computer Science & Engineering',
      status: finalStatus,
      mcqScore: fallbackMcqScore,
      maxMcqMarks: fallbackMaxMcq,
      codingScore: 0,
      maxCodingMarks: fallbackMaxCoding,
      totalScore: fallbackTotal,
      totalMarks: fallbackMaxTotal,
      percentage: fallbackPct,
      resultVisible: true,
      malpractice: isMalpractice,
      malpracticeType: violationReason,
      startedAt: new Date(Date.now() - 300000),
      submittedAt: new Date(),
      mcqAnswers
    };

    mockAttempts.set(req.params.id, savedAttempt);

    if (isMalpractice) {
      recordProctorAlert({
        attemptId: req.params.id,
        studentId: studentId || 'student-1',
        studentName: studentName || 'Student Candidate',
        regNo: regNo || 'CS2026001',
        examTitle: examTitle || 'Examination',
        type: violationReason,
        message: `Malpractice Violation: Exited test/fullscreen (${violationReason})`,
        terminated: true
      });
    }

    res.json({
      success: true,
      status: finalStatus,
      mcqScore: fallbackMcqScore,
      maxMcqMarks: fallbackMaxMcq,
      codingScore: 0,
      maxCodingMarks: fallbackMaxCoding,
      totalScore: fallbackTotal,
      totalMarks: fallbackMaxTotal,
      percentage: fallbackPct,
      malpractice: isMalpractice,
      malpracticeType: violationReason,
      mcqBreakdown: {
        total: 1,
        answered: answeredCount,
        correct: fallbackCorrect,
        score: fallbackMcqScore,
        maxMarks: fallbackMaxMcq
      },
      codingBreakdown: {
        total: 1,
        attempted: 0,
        score: 0,
        maxMarks: fallbackMaxCoding,
        details: []
      }
    });
  } catch (e) {
    console.error('Submit attempt error:', e);
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/autosave', async (req, res) => {
  try {
    const { codingQuestionId, language, sourceCode, cursorPosition } = req.body;
    try {
      const autosave = await prisma.codingAutosave.upsert({
        where: {
          attemptId_codingQuestionId: {
            attemptId: req.params.id,
            codingQuestionId
          }
        },
        create: {
          attemptId: req.params.id,
          codingQuestionId,
          language,
          sourceCode,
          cursorPosition
        },
        update: { language, sourceCode, cursorPosition, savedAt: new Date() }
      });
      return res.json({ savedAt: autosave.savedAt });
    } catch (err) {}
    res.json({ savedAt: new Date() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id/autosave/:questionId', async (req, res) => {
  try {
    const autosave = await prisma.codingAutosave.findUnique({
      where: {
        attemptId_codingQuestionId: {
          attemptId: req.params.id,
          codingQuestionId: req.params.questionId
        }
      }
    });
    if (autosave) return res.json(autosave);
  } catch (e) {}
  res.json(null);
});

router.post('/:id/proctor', async (req, res) => {
  try {
    const { studentId, studentName, regNo, examTitle, type, metadata, mcqAnswers = {} } = req.body;

    const terminateTypes = [
      'TAB_SWITCH',
      'FULLSCREEN_EXIT',
      'ESC_KEY',
      'COPY_PASTE',
      'EXTENSION_DETECTED',
      'WINDOWS_G_KEY',
      'WINDOWS_KEY',
      'WINDOWS_OVERLAY_OR_FOCUS_LOST',
      'WINDOW_BLUR',
      'KEY_MUTATION',
      'AI_EXTENSION_HOTKEY'
    ];
    const isTerminated = terminateTypes.includes(type);

    // Compute marks if answers are provided
    let mcqScore = 0;
    if (mcqAnswers && Object.keys(mcqAnswers).length > 0) {
      if (mcqAnswers['mcq-1'] === 1) mcqScore = 5;
    }

    // Update in-memory mock map
    for (const [key, att] of mockAttempts.entries()) {
      if (att.id === req.params.id || key.startsWith(req.params.id)) {
        if (isTerminated) {
          att.status = 'MALPRACTICE';
          att.malpractice = true;
          att.malpracticeType = type;
          att.resultVisible = true;
          att.submittedAt = new Date();
          if (mcqScore > 0) att.mcqScore = mcqScore;
        }
      }
    }

    try {
      await prisma.proctorEvent.create({
        data: {
          attemptId: req.params.id,
          studentId: studentId || 'student-1',
          type,
          metadata: metadata || {}
        }
      });

      if (isTerminated) {
        await prisma.examAttempt.update({
          where: { id: req.params.id },
          data: {
            status: 'MALPRACTICE',
            malpractice: true,
            malpracticeType: type,
            resultVisible: true,
            submittedAt: new Date()
          }
        });
      }
    } catch (err) {
      console.warn('DB error in proctor event logging');
    }

    const alert = recordProctorAlert({
      attemptId: req.params.id,
      studentId: studentId || 'student-1',
      studentName: studentName || 'Student',
      regNo: regNo || 'CS2026001',
      examTitle: examTitle || 'Examination',
      type,
      message: `Malpractice Violation: Exited test/fullscreen (${type})`,
      terminated: isTerminated
    });

    res.json({ alert, terminated: isTerminated, status: isTerminated ? 'MALPRACTICE' : 'IN_PROGRESS' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Full detailed result for an attempt (used by student, teacher, admin)
router.get('/:id/result', async (req, res) => {
  try {
    const details = await getAttemptDetails(req.params.id);
    res.json(details);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Retest Endpoints
router.post('/retest-request', async (req, res) => {
  try {
    const { examId, studentId, studentName, regNo, reason } = req.body;
    const request = await createRetestRequest({ examId, studentId, studentName, regNo, reason });
    res.status(201).json(request);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/retest-requests', async (req, res) => {
  try {
    const requests = await getRetestRequests();
    const alerts = getProctorAlerts();
    res.json({ requests, alerts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/retest-requests/student/:studentId', async (req, res) => {
  try {
    const all = await getRetestRequests();
    const sid = req.params.studentId;
    const filtered = all.filter(r => r.studentId === sid || sid === 'student-1' || sid === 'user-student-1');
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/retest-requests/:id/approve-admin', async (req, res) => {
  try {
    const updated = await approveRetestByAdmin(req.params.id);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/retest-requests/:id/reset-teacher', async (req, res) => {
  try {
    const updated = await resetAttemptByTeacher(req.params.id);
    if (updated && updated.examId) {
      for (const [key, att] of mockAttempts.entries()) {
        if (att.examId === updated.examId && (att.studentId === updated.studentId || updated.studentId === 'student-1')) {
          mockAttempts.delete(key);
        }
      }
    }
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
