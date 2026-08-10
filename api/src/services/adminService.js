import { prisma } from '../lib/prisma.js';
import { retestRequests } from './retestService.js';

const MOCK_DEPARTMENTS = [
  { id: 'dept-1', name: 'Computer Science & Engineering', code: 'CSE', teacherCount: 8, studentCount: 120, activeExams: 4, totalAttempts: 95 },
  { id: 'dept-2', name: 'Information Technology', code: 'IT', teacherCount: 6, studentCount: 90, activeExams: 3, totalAttempts: 70 },
  { id: 'dept-3', name: 'Electronics & Communication', code: 'ECE', teacherCount: 5, studentCount: 85, activeExams: 2, totalAttempts: 50 },
  { id: 'dept-4', name: 'Electrical & Electronics', code: 'EEE', teacherCount: 4, studentCount: 60, activeExams: 2, totalAttempts: 40 }
];

const MOCK_TEACHERS = [
  { id: 'tch-1', name: 'Dr. John Doe', email: 'teacher@seep.com', department: 'Computer Science & Engineering', employeeId: 'FAC-CS101', subject: 'Data Structures & Algorithms', examCount: 3 },
  { id: 'tch-2', name: 'Prof. Sarah Jenkins', email: 'sarah.j@seep.com', department: 'Computer Science & Engineering', employeeId: 'FAC-CS102', subject: 'Database Management Systems', examCount: 2 },
  { id: 'tch-3', name: 'Dr. Robert Miller', email: 'robert.m@seep.com', department: 'Information Technology', employeeId: 'FAC-IT201', subject: 'Web Technologies & Cloud', examCount: 2 },
  { id: 'tch-4', name: 'Prof. Anita Sharma', email: 'anita.s@seep.com', department: 'Electronics & Communication', employeeId: 'FAC-EC301', subject: 'Digital Signal Processing', examCount: 1 },
  { id: 'tch-5', name: 'Dr. Alan Turing', email: 'alan.t@seep.com', department: 'Electrical & Electronics', employeeId: 'FAC-EE401', subject: 'Control Systems', examCount: 1 }
];

const MOCK_STUDENTS = [
  { id: 'std-1', name: 'Alice Smith', email: 'student@seep.com', regNo: 'CS2026001', department: 'Computer Science & Engineering', attemptsCount: 3, avgScore: 85 },
  { id: 'std-2', name: 'Bob Johnson', email: 'bob.j@seep.com', regNo: 'CS2026002', department: 'Computer Science & Engineering', attemptsCount: 2, avgScore: 78 },
  { id: 'std-3', name: 'Charlie Brown', email: 'charlie.b@seep.com', regNo: 'IT2026010', department: 'Information Technology', attemptsCount: 2, avgScore: 92 },
  { id: 'std-4', name: 'Diana Prince', email: 'diana.p@seep.com', regNo: 'EC2026020', department: 'Electronics & Communication', attemptsCount: 1, avgScore: 70 },
  { id: 'std-5', name: 'Ethan Hunt', email: 'ethan.h@seep.com', regNo: 'EE2026030', department: 'Electrical & Electronics', attemptsCount: 1, avgScore: 88 }
];

const MOCK_STUDENT_RESULTS = [
  {
    id: 'res-1',
    studentName: 'Alice Smith',
    regNo: 'CS2026001',
    department: 'Computer Science & Engineering',
    examTitle: 'Data Structures & Algorithms Final',
    mcqScore: 10,
    codingScore: 15,
    totalScore: 25,
    status: 'SUBMITTED',
    resultVisible: true,
    submittedAt: new Date(Date.now() - 3600000)
  },
  {
    id: 'res-2',
    studentName: 'Bob Johnson',
    regNo: 'CS2026002',
    department: 'Computer Science & Engineering',
    examTitle: 'Database Systems Midterm',
    mcqScore: 8,
    codingScore: 12,
    totalScore: 20,
    status: 'SUBMITTED',
    resultVisible: true,
    submittedAt: new Date(Date.now() - 7200000)
  },
  {
    id: 'res-3',
    studentName: 'Charlie Brown',
    regNo: 'IT2026010',
    department: 'Information Technology',
    examTitle: 'Web Technologies Lab Exam',
    mcqScore: 5,
    codingScore: 0,
    totalScore: 5,
    status: 'MALPRACTICE',
    resultVisible: false,
    submittedAt: new Date(Date.now() - 14400000)
  }
];

export async function getDepartmentsOverview() {
  try {
    const users = await prisma.user.findMany();
    const exams = await prisma.exam.findMany();
    if (users.length > 0) {
      // Calculate live counts
      return MOCK_DEPARTMENTS.map(dept => {
        const teachers = users.filter(u => u.role === 'TEACHER' && u.department === dept.name).length;
        const students = users.filter(u => u.role === 'STUDENT' && u.department === dept.name).length;
        const active = exams.filter(e => e.department === dept.name && (e.status === 'ACTIVE' || e.status === 'PUBLISHED')).length;
        return {
          ...dept,
          teacherCount: teachers || dept.teacherCount,
          studentCount: students || dept.studentCount,
          activeExams: active || dept.activeExams
        };
      });
    }
  } catch (err) {
    console.warn('DB connect error in getDepartmentsOverview, returning mock departments');
  }
  return MOCK_DEPARTMENTS;
}

export async function getDepartmentTeachers(department) {
  try {
    const users = await prisma.user.findMany({
      where: department && department !== 'ALL' ? { role: 'TEACHER', department } : { role: 'TEACHER' }
    });
    if (users.length > 0) {
      return users.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName || ''}`.trim(),
        email: u.email,
        department: u.department || 'Computer Science & Engineering',
        employeeId: u.regNo || `FAC-${u.id.slice(0, 6).toUpperCase()}`,
        subject: 'Computer Science',
        examCount: 2
      }));
    }
  } catch (err) {
    console.warn('DB error in getDepartmentTeachers, returning mock teachers');
  }

  if (department && department !== 'ALL') {
    return MOCK_TEACHERS.filter(t => t.department === department);
  }
  return MOCK_TEACHERS;
}

export async function getDepartmentStudents(department) {
  try {
    const users = await prisma.user.findMany({
      where: department && department !== 'ALL' ? { role: 'STUDENT', department } : { role: 'STUDENT' }
    });
    if (users.length > 0) {
      return users.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName || ''}`.trim(),
        email: u.email,
        regNo: u.regNo || `CS2026${u.id.slice(0, 3)}`,
        department: u.department || 'Computer Science & Engineering',
        attemptsCount: 2,
        avgScore: 82
      }));
    }
  } catch (err) {
    console.warn('DB error in getDepartmentStudents, returning mock students');
  }

  if (department && department !== 'ALL') {
    return MOCK_STUDENTS.filter(s => s.department === department);
  }
  return MOCK_STUDENTS;
}

export async function getStudentResultsWithMarks() {
  try {
    const attempts = await prisma.examAttempt.findMany({
      include: { student: true, exam: true },
      orderBy: { startedAt: 'desc' }
    });
    if (attempts.length > 0) {
      return attempts.map(att => ({
        id: att.id,
        studentName: att.student ? `${att.student.firstName} ${att.student.lastName || ''}`.trim() : 'Student',
        regNo: att.student?.regNo || 'N/A',
        department: att.student?.department || att.exam?.department || 'Computer Science',
        examTitle: att.exam?.title || 'Exam',
        mcqScore: att.mcqScore ?? 0,
        codingScore: att.codingScore ?? 0,
        totalScore: att.totalScore ?? 0,
        status: att.status,
        resultVisible: att.resultVisible,
        submittedAt: att.submittedAt || att.startedAt
      }));
    }
  } catch (err) {
    console.warn('DB error in getStudentResultsWithMarks, returning mock results');
  }
  return MOCK_STUDENT_RESULTS;
}

export async function rejectRetestByAdmin(requestId) {
  // Update mock retestRequests if present in retestService
  const req = (await import('./retestService.js')).retestRequests.find(r => r.id === requestId);
  if (req) {
    req.status = 'REJECTED_BY_ADMIN';
    req.adminProcessedAt = new Date();
  }
  try {
    await prisma.retestRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', processedAt: new Date() }
    });
  } catch (err) {
    console.warn('DB error in rejectRetestByAdmin');
  }
  return req || { id: requestId, status: 'REJECTED_BY_ADMIN' };
}

let mockSystemConfig = {
  maintenanceMode: false,
  allowStudentRegistration: true,
  aiQuestionGenerator: true,
  aiProctoringEnabled: true,
  liveStreamingEnabled: true,
  subjectiveDualEvaluation: true,
  maxExamDurationMinutes: 180,
  institutionName: 'SEEP Platform Institution'
};

const MOCK_AUDIT_LOGS = [
  { id: 'log-1', timestamp: new Date(Date.now() - 600000).toISOString(), actor: 'admin@seep.platform', role: 'ADMIN', action: 'SYSTEM_CONFIG_UPDATE', details: 'Updated feature flag: aiProctoringEnabled set to true', ipAddress: '192.168.1.1', severity: 'INFO' },
  { id: 'log-2', timestamp: new Date(Date.now() - 1800000).toISOString(), actor: 'teacher@seep.com', role: 'TEACHER', action: 'EXAM_CREATE', details: 'Created exam: Data Structures & Algorithms Final', ipAddress: '192.168.1.42', severity: 'INFO' },
  { id: 'log-3', timestamp: new Date(Date.now() - 3600000).toISOString(), actor: 'admin@seep.platform', role: 'ADMIN', action: 'EXAM_PUBLISH', details: 'Approved and Published Exam ID: exam-101', ipAddress: '192.168.1.1', severity: 'HIGH' },
  { id: 'log-4', timestamp: new Date(Date.now() - 7200000).toISOString(), actor: 'system@seep.platform', role: 'SYSTEM', action: 'MALPRACTICE_FLAG', details: 'Proctoring engine flagged student std-3 for tab switching during exam', ipAddress: '10.0.0.5', severity: 'WARN' },
  { id: 'log-5', timestamp: new Date(Date.now() - 14400000).toISOString(), actor: 'student@seep.com', role: 'STUDENT', action: 'LOGIN_SUCCESS', details: 'Successful authentication token issued', ipAddress: '172.16.0.8', severity: 'INFO' }
];

export async function getOverviewStats() {
  let userCount = 12540;
  let activeExamsCount = 45;
  let activeUsersCount = 2340;

  try {
    const totalUsers = await prisma.user.count();
    const activeExams = await prisma.exam.count({ where: { status: 'ACTIVE' } });
    if (totalUsers > 0) userCount = totalUsers;
    if (activeExams > 0) activeExamsCount = activeExams;
  } catch (err) {
    console.warn('DB error in getOverviewStats, using metrics fallback');
  }

  return {
    totalUsers: userCount,
    activeUsers: activeUsersCount,
    activeExams: activeExamsCount,
    featureFlagsCount: Object.values(mockSystemConfig).filter(v => v === true).length,
    systemUptime: '99.9%',
    systemHealth: 'HEALTHY',
    tenantUsage: [
      { month: 'Jan', activeExams: 28, storageGB: 120, cpuLoad: 35 },
      { month: 'Feb', activeExams: 34, storageGB: 145, cpuLoad: 42 },
      { month: 'Mar', activeExams: 45, storageGB: 190, cpuLoad: 58 },
      { month: 'Apr', activeExams: 52, storageGB: 220, cpuLoad: 64 },
      { month: 'May', activeExams: 40, storageGB: 240, cpuLoad: 48 },
      { month: 'Jun', activeExams: 60, storageGB: 280, cpuLoad: 72 }
    ]
  };
}

export async function getAuditLogs() {
  return MOCK_AUDIT_LOGS;
}

export async function getSystemConfig() {
  return mockSystemConfig;
}

export async function updateSystemConfig(newConfig) {
  mockSystemConfig = { ...mockSystemConfig, ...newConfig };
  return mockSystemConfig;
}

