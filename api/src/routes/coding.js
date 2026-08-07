import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { runVisibleTestCases, submitCodingAnswer, getCodingQuestionForStudent } from '../services/codingService.js';
import { saveCodingQuestion } from '../services/examService.js';

const router = Router();

router.post('/questions', async (req, res) => {
  try {
    const { examId, ...payload } = req.body;
    const question = await saveCodingQuestion(examId, payload);
    res.status(201).json(question);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/questions/:id', async (req, res) => {
  const question = await prisma.codingQuestion.findUnique({
    where: { id: req.params.id },
    include: { testCases: true }
  });
  if (!question) return res.status(404).json({ error: 'Not found' });
  res.json(question);
});

router.get('/questions/:id/student', async (req, res) => {
  const question = await getCodingQuestionForStudent(req.params.id);
  if (!question) return res.status(404).json({ error: 'Not found' });
  res.json(question);
});

router.put('/questions/:id', async (req, res) => {
  try {
    const question = await prisma.codingQuestion.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title,
        description: req.body.description,
        inputFormat: req.body.inputFormat,
        outputFormat: req.body.outputFormat,
        constraints: req.body.constraints,
        marks: req.body.marks,
        timeLimitMs: req.body.timeLimitMs,
        memoryLimitMB: req.body.memoryLimitMB,
        allowedLanguages: req.body.allowedLanguages,
        starterCode: req.body.starterCode
      }
    });
    res.json(question);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/questions/:id', async (req, res) => {
  await prisma.codingQuestion.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

router.post('/questions/:id/testcases', async (req, res) => {
  try {
    const tc = await prisma.codingTestCase.create({
      data: {
        codingQuestionId: req.params.id,
        input: req.body.input,
        expectedOutput: req.body.expectedOutput,
        isHidden: req.body.isHidden ?? false,
        weight: req.body.weight ?? 1
      }
    });
    res.status(201).json(tc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/testcases/:id', async (req, res) => {
  const tc = await prisma.codingTestCase.update({
    where: { id: req.params.id },
    data: {
      input: req.body.input,
      expectedOutput: req.body.expectedOutput,
      isHidden: req.body.isHidden,
      weight: req.body.weight
    }
  });
  res.json(tc);
});

router.delete('/testcases/:id', async (req, res) => {
  await prisma.codingTestCase.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

router.post('/run', async (req, res) => {
  try {
    const result = await runVisibleTestCases(req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const result = await submitCodingAnswer(req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
