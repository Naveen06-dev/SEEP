# 🛡️ t_e (Test Environment Shield) Manifest V3 Security Extension

`t_e` is a high-security Chrome Extension (Manifest V3) for online examination platforms. It enforces strict anti-cheating guarantees by scanning the browser, disabling all unauthorized extensions, re-verifying disabled states, maintaining alarm-driven heartbeats, and logging suspicious security events.

---

## 🔒 CORE SECURITY RULE

> **"START EXAM" remains disabled until `t_e` has scanned the browser, disabled every unauthorized enabled extension, re-scanned the browser, and verified zero unauthorized extensions remain enabled. If even one unauthorized extension remains enabled or cannot be disabled, `secure: false` is returned and the exam remains locked.**

---

## 📁 PROJECT STRUCTURE

```text
t_e_extension/
├── manifest.json   # Manifest V3 permissions & service worker entry
├── background.js   # State machine, scanning, verification, alarms & startup recovery
├── content.js      # DOM handshake, postMessage bridge, capture-phase key monitor
├── popup.html      # Security status dashboard popup UI
├── popup.js        # Status renderer script for popup.html
├── popup.css       # Visual styles for security dashboard
└── README.md       # Integration guide, API specs, and developer testing instructions
```

---

## ⚙️ SECURITY STATE MACHINE

The extension maintains local state in `chrome.storage.local`:

- `IDLE`: Initial idle state prior to exam request.
- `CHECKING`: Scanning installed extensions via `chrome.management.getAll()`.
- `DISABLING`: Attempting `chrome.management.setEnabled(id, false)` for unauthorized extensions.
- `VERIFYING`: Re-scanning `chrome.management.getAll()` to confirm zero unauthorized extensions remain enabled.
- `SECURE`: Environment verified secure. Eligible to start exam.
- `EXAM_ACTIVE`: Active exam mode. Alarm heartbeat (every ~3s) and shortcut capture active.
- `FAILED`: Security verification failed or extension could not be disabled. Exam remains locked.
- `RESTORING`: Re-enabling extensions disabled by `t_e` after exam completes.

---

## 🔌 REACT INTEGRATION CODE (Client-side)

In your React Exam Player component (`StudentExamPlayer.tsx`):

```tsx
import { useEffect, useState } from 'react';

export function ExamPlayer({ examId, studentId }) {
  const [isTeSecure, setIsTeSecure] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);

  useEffect(() => {
    // 1. Listen for responses from t_e extension content script
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.source === 'te-extension') {
        if (event.data.type === 'START_TE_EXAM_RESPONSE') {
          if (event.data.secure && event.data.securityState === 'EXAM_ACTIVE') {
            setIsTeSecure(true);
            setSessionToken(event.data.sessionToken);
          } else {
            alert(`⛔ Exam Locked! Reason: ${event.data.reason || 'Unauthorized extension active'}`);
            setIsTeSecure(false);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // 2. Trigger Scan -> Disable -> Verify -> Secure workflow
    window.postMessage({
      source: 'te-portal',
      type: 'START_TE_EXAM',
      examId,
      studentId
    }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, [examId, studentId]);

  return (
    <div>
      {isTeSecure ? (
        <button onClick={() => startExam()}>Start Exam →</button>
      ) : (
        <div>⛔ Security Check Pending / Extension Required</div>
      )}
    </div>
  );
}
```

---

## 🚀 EXPRESS BACKEND INTEGRATION (Server-side)

### 1. Start Attempt Endpoint (`POST /api/attempts/:id/start`)
```javascript
app.post('/api/attempts/:id/start', async (req, res) => {
  const { studentId } = req.body;
  const sessionToken = `ext-session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  
  // Register session state in database
  res.json({
    attemptId: `attempt-${Date.now()}`,
    examId: req.params.id,
    sessionToken,
    status: 'IN_PROGRESS'
  });
});
```

### 2. Extension Heartbeat Endpoint (`POST /api/extension/heartbeat`)
```javascript
app.post('/api/extension/heartbeat', async (req, res) => {
  const { sessionToken, examId, studentId, timestamp } = req.body;
  
  // Verify token and update last active timestamp
  res.json({ ok: true, status: 'ACTIVE' });
});
```

### 3. Log Security Event Endpoint (`POST /api/extension/log-event`)
```javascript
app.post('/api/extension/log-event', async (req, res) => {
  const { eventType, sessionToken, metadata } = req.body;
  console.log(`[SECURITY LOG] Event: ${eventType} | Token: ${sessionToken}`, metadata);
  res.json({ ok: true });
});
```

---

## 🧪 DEVELOPER TESTING INSTRUCTIONS (Chrome Developer Mode)

### Test 1: Load Unpacked Extension
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** toggle in top-right corner.
3. Click **Load unpacked** and select the `t_e_extension` directory.

### Test 2: Verify Extension Isolation & Fail-Closed Logic
1. Enable a secondary extension in Chrome (e.g., Grammarly, React DevTools, or Monica AI).
2. Open the SEEP Exam Portal at `http://localhost:5173`.
3. Launch an exam. Observe `t_e` scanning, disabling the unauthorized extension, re-scanning, and returning `secure: true`.
4. Check the `t_e` popup UI to verify state shows `● Exam Active` with `1` disabled extension.

### Test 3: Test Shortcut Capture
1. During an active exam, press `Ctrl+M` / `Cmd+M` or `F12`.
2. Inspect the Developer Console to see: `🛡️ t_e Extension: Suspicious shortcut Ctrl+M / Cmd+M intercepted.`
3. Verify `LOG_EVENT` with `SUSPICIOUS_AI_SHORTCUT_BLOCKED` was sent to backend.

---

## ⚠️ SECURITY LIMITATIONS & ENTERPRISE KIOSK POLICIES

While `t_e` provides strict runtime extension management via Manifest V3 `chrome.management` APIs:
- System extensions enforced by Chrome Enterprise Policy or OS-level policies may not be programmatic disallowable.
- `t_e` uses a **fail-closed model**: If `chrome.management.setEnabled()` fails or if re-scan detects any unauthorized extension remains active, the extension sets security state to `FAILED` and blocks exam initialization.
- For high-stakes institutional environments, deploy `t_e` alongside **Chrome Enterprise Managed Browser / Kiosk Mode** policies for absolute hardware-level policy enforcement.
