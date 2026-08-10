import { prisma } from '../lib/prisma.js';

// In-memory fallback store for retest requests & proctoring alerts
export const retestRequests = [];
export const proctorAlerts = [];

export async function createRetestRequest({ examId, studentId, studentName, regNo, reason }) {
  const reqItem = {
    id: `retest-${Date.now()}`,
    examId,
    studentId: studentId || 'student-1',
    studentName: studentName || 'Student User',
    regNo: regNo || 'CS2026001',
    reason: reason || 'Accidental fullscreen exit / browser tab switch',
    status: 'PENDING_ADMIN', // PENDING_ADMIN -> APPROVED_BY_ADMIN -> RESET_BY_TEACHER
    requestedAt: new Date(),
    adminApprovedAt: null,
    teacherResetAt: null
  };

  try {
    const existingReq = await prisma.retestRequest.create({
      data: {
        examId,
        studentId: studentId || 'user-student-1',
        reason,
        status: 'PENDING'
      }
    });
    reqItem.id = existingReq.id;
  } catch (err) {
    console.warn('DB error in createRetestRequest, storing in mock store');
  }

  // Remove previous requests for same student & exam if any
  const idx = retestRequests.findIndex(r => r.examId === examId && r.studentId === studentId);
  if (idx !== -1) retestRequests.splice(idx, 1);

  retestRequests.unshift(reqItem);
  return reqItem;
}

export async function getRetestRequests() {
  try {
    const dbReqs = await prisma.retestRequest.findMany({
      include: { student: true, exam: true },
      orderBy: { requestedAt: 'desc' }
    });
    if (dbReqs.length > 0) {
      return dbReqs.map(r => ({
        id: r.id,
        examId: r.examId,
        examTitle: r.exam?.title || 'Exam',
        studentId: r.studentId,
        studentName: r.student ? `${r.student.firstName} ${r.student.lastName || ''}`.trim() : 'Student',
        regNo: r.student?.regNo || 'N/A',
        reason: r.reason,
        status: r.status === 'APPROVED' ? 'APPROVED_BY_ADMIN' : 'PENDING_ADMIN',
        requestedAt: r.requestedAt
      }));
    }
  } catch (err) {
    console.warn('DB error in getRetestRequests, using mock store');
  }
  return retestRequests;
}

export async function approveRetestByAdmin(requestId) {
  const item = retestRequests.find(r => r.id === requestId);
  if (item) {
    item.status = 'APPROVED_BY_ADMIN';
    item.adminApprovedAt = new Date();
  }

  try {
    await prisma.retestRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', processedAt: new Date() }
    });
  } catch (err) {
    console.warn('DB error in approveRetestByAdmin');
  }

  return item || { id: requestId, status: 'APPROVED_BY_ADMIN' };
}

export async function resetAttemptByTeacher(requestId) {
  const item = retestRequests.find(r => r.id === requestId);
  if (item) {
    item.status = 'RESET_BY_TEACHER';
    item.teacherResetAt = new Date();

    // Reset student attempt in mock/DB
    try {
      await prisma.examAttempt.deleteMany({
        where: { examId: item.examId, studentId: item.studentId }
      });
    } catch (err) {
      console.warn('DB delete error in resetAttemptByTeacher');
    }
  }

  return item || { id: requestId, status: 'RESET_BY_TEACHER' };
}

export function recordProctorAlert(alert) {
  const newAlert = {
    id: `alert-${Date.now()}`,
    ...alert,
    createdAt: new Date()
  };
  proctorAlerts.unshift(newAlert);
  return newAlert;
}

export function getProctorAlerts() {
  return proctorAlerts;
}
