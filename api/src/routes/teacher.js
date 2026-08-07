import { Router } from 'express';
import {
  getTeacherProfile,
  getTeacherExams,
  getTeacherExamById,
  createExam,
  saveExamMcqs,
  saveExamCoding,
  updateTeacherExam,
  updateQuestion,
  deleteQuestion,
  publishExam,
  getTeacherResults,
  getAttemptDetails,
  setResultVisibility
} from '../services/teacherService.js';

const router = Router();

const getTeacherId = (req) => req.headers['x-teacher-id'] || req.user?.id || 'teacher-1';

router.get('/profile', async (req, res) => {
  try {
    const profile = await getTeacherProfile(getTeacherId(req));
    res.json(profile);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/exams', async (req, res) => {
  try {
    const exams = await getTeacherExams(getTeacherId(req));
    res.json(exams);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/exams/:id', async (req, res) => {
  try {
    const exam = await getTeacherExamById(req.params.id);
    res.json(exam);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

router.post('/exams', async (req, res) => {
  try {
    const exam = await createExam(getTeacherId(req), req.body);
    res.status(201).json(exam);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/exams/:examId/mcq', async (req, res) => {
  try {
    const questions = req.body.questions || [req.body];
    const saved = await saveExamMcqs(req.params.examId, questions);
    res.status(201).json(saved);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/exams/:examId/coding', async (req, res) => {
  try {
    const saved = await saveExamCoding(req.params.examId, req.body);
    res.status(201).json(saved);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/exams/:id', async (req, res) => {
  try {
    const updated = await updateTeacherExam(req.params.id, req.body);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/questions/:id', async (req, res) => {
  try {
    const type = req.query.type || (req.body.options ? 'mcq' : 'coding');
    const updated = await updateQuestion(req.params.id, type, req.body);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/questions/:id', async (req, res) => {
  try {
    const type = req.query.type || 'mcq';
    const result = await deleteQuestion(req.params.id, type);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/exams/:id/publish', async (req, res) => {
  try {
    const published = await publishExam(req.params.id);
    res.json(published);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/results', async (req, res) => {
  try {
    const results = await getTeacherResults(getTeacherId(req));
    res.json(results);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/results/:attemptId', async (req, res) => {
  try {
    const details = await getAttemptDetails(req.params.attemptId);
    res.json(details);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

router.put('/results/:attemptId/publish', async (req, res) => {
  try {
    const updated = await setResultVisibility(req.params.attemptId, true);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/results/:attemptId/hide', async (req, res) => {
  try {
    const updated = await setResultVisibility(req.params.attemptId, false);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
