import test from 'node:test';
import assert from 'node:assert/strict';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  try {
    const res = await fetch(`http://localhost:4000${path}`, { ...options, headers });
    return { res, data: await res.json().catch(() => ({})) };
  } catch (e) {
    const res = await fetch(`http://localhost:3000${path}`, { ...options, headers });
    return { res, data: await res.json().catch(() => ({})) };
  }
}

test('SEEP Exam Portal - API Health Check', async () => {
  const { res, data } = await request('/health');
  assert.equal(res.status, 200);
  assert.equal(data.status, 'ok');
});

test('SEEP Exam Portal - Authentication Flow (Student, Teacher, Admin)', async () => {
  // Student Login
  const { res: studentRes, data: studentData } = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'student@seep.platform', password: 'password123' })
  });
  assert.equal(studentRes.status, 200);
  assert.equal(studentData.status, 'success');
  assert.ok(studentData.token);
  assert.equal(studentData.user.role, 'STUDENT');

  // Admin Login
  const { res: adminRes, data: adminData } = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@seep.platform', password: 'password123' })
  });
  assert.equal(adminRes.status, 200);
  assert.equal(adminData.status, 'success');
  assert.equal(adminData.user.role, 'ADMIN');
});

test('SEEP Exam Portal - Exams List & Question Fetching', async () => {
  const { res, data: exams } = await request('/api/exams');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(exams));
  assert.ok(exams.length > 0, 'Expected default published exam to exist');

  const defaultExam = exams[0];
  assert.ok(defaultExam.id);
  assert.ok(defaultExam.title);
});

test('SEEP Exam Portal - Attempt Lifecycle & Retest Flow', async () => {
  const { data: exams } = await request('/api/exams');
  const examId = exams[0].id;
  const studentId = 'test-student-auto';

  // 1. Start Attempt
  const { res: startRes, data: startData } = await request(`/api/attempts/${examId}/start`, {
    method: 'POST',
    body: JSON.stringify({ studentId })
  });
  assert.equal(startRes.status, 200);
  assert.equal(startData.status, 'IN_PROGRESS');
  assert.ok(startData.attemptId);

  // 2. Submit Attempt with Malpractice
  const { res: submitRes, data: submitData } = await request(`/api/attempts/${startData.attemptId}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      answers: {},
      malpractice: true,
      malpracticeReason: 'Auto-test Malpractice Trigger',
      malpracticeType: 'WINDOWS_G_KEY'
    })
  });
  assert.equal(submitRes.status, 200);
  assert.equal(submitData.status, 'MALPRACTICE');

  // 3. Direct Retake Check (Starting again clears previous malpractice state)
  const { res: restartRes, data: restartData } = await request(`/api/attempts/${examId}/start`, {
    method: 'POST',
    body: JSON.stringify({ studentId })
  });
  assert.equal(restartRes.status, 200);
  assert.equal(restartData.status, 'IN_PROGRESS');
});

test('SEEP Exam Portal - t_e / NeoExamShield Security Telemetry APIs', async () => {
  // 1. Verify Extension Init
  const { res: verifyRes, data: verifyData } = await request('/api/extension/verify-init', {
    method: 'POST',
    body: JSON.stringify({ examId: 'exam-1', studentId: 'student-1', studentName: 'Test Student' })
  });
  assert.equal(verifyRes.status, 200);
  assert.equal(verifyData.success, true);
  assert.ok(verifyData.sessionToken);

  // 2. Heartbeat Ping
  const { res: heartbeatRes, data: heartbeatData } = await request('/api/extension/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ sessionToken: verifyData.sessionToken, examId: 'exam-1', studentId: 'student-1' })
  });
  assert.equal(heartbeatRes.status, 200);
  assert.equal(heartbeatData.ok, true);

  // 3. Log Security Event
  const { res: logRes, data: logData } = await request('/api/extension/log-event', {
    method: 'POST',
    body: JSON.stringify({
      eventType: 'SUSPICIOUS_AI_SHORTCUT_BLOCKED',
      sessionToken: verifyData.sessionToken,
      metadata: { shortcut: 'Ctrl+M' }
    })
  });
  assert.equal(logRes.status, 200);
  assert.equal(logData.success, true);

  // 4. Fetch Audit Logs
  const { res: auditRes, data: auditData } = await request('/api/extension/audit-logs');
  assert.equal(auditRes.status, 200);
  assert.ok(Array.isArray(auditData.logs));
  assert.ok(auditData.logs.some(l => l.type === 'SUSPICIOUS_AI_SHORTCUT_BLOCKED'));
});
