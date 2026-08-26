import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const API_BASE = 'http://localhost:4000';

test('1. Extension Backend API: verify-init generates session token', async () => {
  const res = await fetch(`${API_BASE}/api/extension/verify-init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examId: 'test-exam-1',
      studentId: 'student-test-1',
      studentName: 'Test Student'
    })
  });

  assert.equal(res.status, 200, 'verify-init HTTP status should be 200');
  const data = await res.json();
  assert.equal(data.success, true, 'verify-init response success should be true');
  assert.ok(data.sessionToken, 'sessionToken should be present');
  assert.ok(data.sessionToken.startsWith('ext-sess-'), 'sessionToken should follow naming format');
});

test('2. Extension Backend API: heartbeat returns ACTIVE status', async () => {
  const initRes = await fetch(`${API_BASE}/api/extension/verify-init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examId: 'test-exam-2', studentId: 'student-test-2' })
  });
  const { sessionToken } = await initRes.json();

  const res = await fetch(`${API_BASE}/api/extension/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionToken,
      examId: 'test-exam-2',
      studentId: 'student-test-2'
    })
  });

  assert.equal(res.status, 200, 'heartbeat status should be 200');
  const data = await res.json();
  assert.equal(data.ok, true, 'heartbeat ok should be true');
  assert.equal(data.status, 'ACTIVE', 'session status should be ACTIVE');
});

test('3. Extension Backend API: log-event records security logs', async () => {
  const res = await fetch(`${API_BASE}/api/extension/log-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'UNAUTHORIZED_EXTENSION_DETECTED',
      studentId: 'student-test-3',
      examId: 'test-exam-3',
      metadata: { extensionName: 'TestExtension', extensionId: 'abc123xyz' }
    })
  });

  assert.equal(res.status, 200, 'log-event status should be 200');
  const data = await res.json();
  assert.equal(data.success, true, 'log-event success should be true');
  assert.ok(data.logged, 'logged record should be returned');
  assert.equal(data.logged.type, 'UNAUTHORIZED_EXTENSION_DETECTED');

  const auditRes = await fetch(`${API_BASE}/api/extension/audit-logs`);
  const auditData = await auditRes.json();
  assert.ok(Array.isArray(auditData.logs), 'audit logs should be an array');
  const found = auditData.logs.some(l => l.type === 'UNAUTHORIZED_EXTENSION_DETECTED');
  assert.ok(found, 'logged event should appear in audit logs');
});

test('4. Chrome Extension Manifest V3 structure validation', () => {
  const manifestPath = path.resolve(process.cwd(), 't_e_extension', 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert.equal(manifest.manifest_version, 3, 'manifest_version must be 3');
  assert.equal(manifest.name, 'NeoExamShield', 'extension name must be NeoExamShield');
  assert.ok(manifest.permissions.includes('management'), 'permissions must include management API');
  assert.ok(manifest.permissions.includes('storage'), 'permissions must include storage API');
  assert.ok(manifest.permissions.includes('alarms'), 'permissions must include alarms API');
  assert.equal(manifest.background.service_worker, 'background.js', 'service worker must be background.js');
  assert.ok(Array.isArray(manifest.content_scripts), 'content_scripts must be defined');
  assert.equal(manifest.content_scripts[0].js[0], 'content.js', 'content_script must load content.js');
});

test('5. Extension Files Syntax & Action Map Validation', () => {
  const bgPath = path.resolve(process.cwd(), 't_e_extension', 'background.js');
  const contentPath = path.resolve(process.cwd(), 't_e_extension', 'content.js');

  assert.ok(fs.existsSync(bgPath), 'background.js must exist');
  assert.ok(fs.existsSync(contentPath), 'content.js must exist');

  const bgCode = fs.readFileSync(bgPath, 'utf-8');
  const contentCode = fs.readFileSync(contentPath, 'utf-8');

  // Verify management API usage in background.js
  assert.ok(bgCode.includes('chrome.management.getAll()'), 'background.js must call chrome.management.getAll()');
  assert.ok(bgCode.includes('chrome.management.setEnabled'), 'background.js must call chrome.management.setEnabled()');
  assert.ok(bgCode.includes('GET_EXTENSIONS_LIST'), 'background.js must support GET_EXTENSIONS_LIST action');
  assert.ok(bgCode.includes('DISABLE_ALL_OTHER_EXTENSIONS'), 'background.js must support DISABLE_ALL_OTHER_EXTENSIONS action');
  assert.ok(bgCode.includes('TOGGLE_EXTENSION'), 'background.js must support TOGGLE_EXTENSION action');

  // Verify postMessage bridge in content.js
  assert.ok(contentCode.includes('FETCH_LIVE_EXTENSIONS'), 'content.js must handle FETCH_LIVE_EXTENSIONS');
  assert.ok(contentCode.includes('DISABLE_ALL_LIVE_EXTENSIONS'), 'content.js must handle DISABLE_ALL_LIVE_EXTENSIONS');
  assert.ok(contentCode.includes('TOGGLE_LIVE_EXTENSION'), 'content.js must handle TOGGLE_LIVE_EXTENSION');
});
