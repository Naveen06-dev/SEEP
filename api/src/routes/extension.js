import { Router } from 'express';

const router = Router();

// In-memory extension security state & audit logs
const activeExtensionSessions = new Map();
const extensionAuditLogs = [];

let securitySettings = {
  requireExtension: true,
  lockOnDisconnect: true,
  disconnectToleranceSeconds: 5,
  allowExamResume: true,
  suspiciousActivityLogging: true
};

// Seed initial demo audit logs
extensionAuditLogs.push(
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: 'EXTENSION_VERIFIED',
    studentId: 'student-1',
    studentName: 'Alice Smith (CS2026001)',
    examTitle: 'Data Structures & Algorithms Final',
    details: 'E-Extension verified and authenticated. 4 browser extensions disabled.'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    type: 'DISCONNECT_WARNING',
    studentId: 'std-2',
    studentName: 'Bob Johnson (CS2026002)',
    examTitle: 'Database Systems Midterm',
    details: 'Extension heartbeat temporarily lost (2s latency). Re-verified successfully.'
  }
);

// 1. Verify Extension & Issue Session Token
router.post('/verify-init', (req, res) => {
  const { examId, studentId, studentName } = req.body || {};
  const sessionToken = `ext-sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  const session = {
    sessionToken,
    examId: examId || 'exam-1',
    studentId: studentId || 'student-1',
    studentName: studentName || 'Student',
    startedAt: new Date().toISOString(),
    lastHeartbeat: Date.now(),
    status: 'ACTIVE',
    disconnectCount: 0
  };

  activeExtensionSessions.set(sessionToken, session);

  extensionAuditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'EXTENSION_VERIFIED',
    studentId: session.studentId,
    studentName: session.studentName,
    examTitle: examId,
    details: `Official E-Extension session authenticated (${sessionToken}).`
  });

  res.json({
    success: true,
    sessionToken,
    requireExtension: securitySettings.requireExtension,
    heartbeatIntervalMs: 3000
  });
});

// 2. Receive Heartbeat from Extension / Web App
router.post('/heartbeat', (req, res) => {
  const { sessionToken, examId, studentId } = req.body || {};
  const session = activeExtensionSessions.get(sessionToken);

  if (session) {
    session.lastHeartbeat = Date.now();
    session.status = 'ACTIVE';
    return res.json({
      ok: true,
      status: 'ACTIVE',
      requireExtension: securitySettings.requireExtension,
      lockOnDisconnect: securitySettings.lockOnDisconnect
    });
  }

  // Fallback if new session
  res.json({
    ok: true,
    status: 'ACTIVE',
    requireExtension: securitySettings.requireExtension
  });
});

// 3. Log Security & Disconnect Events
router.post('/log-event', (req, res) => {
  const { type, sessionToken, examId, studentId, studentName, details } = req.body || {};

  const session = sessionToken ? activeExtensionSessions.get(sessionToken) : null;
  if (session && type === 'EXTENSION_DISCONNECTED') {
    session.disconnectCount += 1;
    session.status = 'LOCKED';
  }

  const logEntry = {
    id: `log-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    timestamp: new Date().toISOString(),
    type: type || 'SECURITY_ALERT',
    studentId: studentId || (session ? session.studentId : 'student-1'),
    studentName: studentName || (session ? session.studentName : 'Student'),
    examTitle: examId || 'Examination',
    details: typeof details === 'object' ? JSON.stringify(details) : (details || `Event ${type} logged.`)
  };

  extensionAuditLogs.unshift(logEntry);
  res.json({ success: true, logged: logEntry });
});

// 4. Get Security Settings
router.get('/security-settings', (_req, res) => {
  res.json(securitySettings);
});

// 5. Update Security Settings (Admin / Teacher)
router.post('/security-settings', (req, res) => {
  securitySettings = {
    ...securitySettings,
    ...req.body
  };
  res.json({ success: true, settings: securitySettings });
});

// 6. Get Audit Logs (Admin / Teacher Monitoring)
router.get('/audit-logs', (_req, res) => {
  res.json({
    logs: extensionAuditLogs.slice(0, 100),
    activeSessionsCount: activeExtensionSessions.size,
    securitySettings
  });
});

export default router;
