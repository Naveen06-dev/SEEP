import { Router } from 'express';
import { getTeacherExams, publishExam, unpublishExam } from '../services/teacherService.js';
import {
  getDepartmentsOverview,
  getDepartmentTeachers,
  getDepartmentStudents,
  getStudentResultsWithMarks,
  rejectRetestByAdmin,
  getOverviewStats,
  getAuditLogs,
  getSystemConfig,
  updateSystemConfig
} from '../services/adminService.js';

const router = Router();

// Menu 1: Department Details
router.get('/departments', async (req, res) => {
  try {
    const depts = await getDepartmentsOverview();
    res.json(depts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Menu 2: Department-wise Teacher Details
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await getDepartmentTeachers(req.query.department);
    res.json(teachers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Menu 3: Department-wise Student Details
router.get('/students', async (req, res) => {
  try {
    const students = await getDepartmentStudents(req.query.department);
    res.json(students);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Menu 4: Test Approval Menu (Exams for Review & Publishing)
router.get('/exams', async (req, res) => {
  try {
    const exams = await getTeacherExams('admin-1');
    res.json(exams);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/exams/:id/publish', async (req, res) => {
  try {
    const published = await publishExam(req.params.id, 'ADMIN');
    res.json(published);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/exams/:id/unpublish', async (req, res) => {
  try {
    const unpublished = await unpublishExam(req.params.id, 'ADMIN');
    res.json(unpublished);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Menu 5: Test Results of Students with Marks
router.get('/results', async (req, res) => {
  try {
    const results = await getStudentResultsWithMarks();
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Menu 6: Reject Retest Request (Red Button Action)
router.post('/retest-requests/:id/reject', async (req, res) => {
  try {
    const rejected = await rejectRetestByAdmin(req.params.id);
    res.json(rejected);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Menu 7: System Overview KPIs (AD-01, SRS 8.3)
router.get('/overview', async (req, res) => {
  try {
    const stats = await getOverviewStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Menu 8: Audit Logs Viewer (AD-05)
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await getAuditLogs();
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Menu 9: System Config & Feature Flags (AD-03, AD-06)
router.get('/config', async (req, res) => {
  try {
    const config = await getSystemConfig();
    res.json(config);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/config', async (req, res) => {
  try {
    const updated = await updateSystemConfig(req.body);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
