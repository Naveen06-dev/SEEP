import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { StudentCodingQuestion } from './StudentCodingQuestion';

type ExamDetails = {
  id: string;
  title: string;
  subject: string;
  department?: string;
  durationMinutes: number;
  mcqQuestions: any[];
  codingQuestions: any[];
};

type Phase = 'loading' | 'countdown' | 'exam' | 'error';
type VerificationStep = 'step2_warning1' | 'step3_chrome_store' | 'step4_warning2' | 'step4_extensions_page' | 'step5_countdown' | 'exam_ready';

const COUNTDOWN_SECONDS = 5;

export function StudentExamPlayer() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('loading');
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('step2_warning1');
  const [showChromeAddDialog, setShowChromeAddDialog] = useState(false);
  const [installedNeoExamShield, setInstalledNeoExamShield] = useState(false);
  const [otherExtensionsState, setOtherExtensionsState] = useState({
    automatedBooking: true,
    googleDocs: true,
    monica: true,
  });
  const [liveChromeExtensions, setLiveChromeExtensions] = useState<Array<{ id: string; name: string; description: string; version: string; enabled: boolean; isSelf?: boolean }>>([]);

  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(3600);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proctoring Tab Switch State
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [warningModalOpen, setWarningModalOpen] = useState(false);

  // t_e Extension Security Shield State
  const [isTeExtensionActive, setIsTeExtensionActive] = useState(false);
  const [teMessage, setTeMessage] = useState<string>('Verifying t_e extension integrity...');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isExamLocked, setIsExamLocked] = useState<boolean>(false);
  const [lockReason, setLockReason] = useState<string>('E-Extension connection lost or disabled');
  const [disconnectCount, setDisconnectCount] = useState<number>(0);

  useEffect(() => {
    const activateTe = () => {
      document.documentElement.setAttribute('data-neoexamshield-installed', 'true');
      document.documentElement.setAttribute('data-neoexamshield-active', 'true');
      document.documentElement.setAttribute('data-te-extension-installed', 'true');
      document.documentElement.setAttribute('data-te-extension-active', 'true');
      window.postMessage({ source: 'neoexamshield-portal', type: 'START_NEOEXAMSHIELD' }, '*');
      setIsTeExtensionActive(true);
      setTeMessage('🟢 NeoExamShield ACTIVE: All third-party browser extensions restricted.');
    };

    const checkTe = () => {
      const isInstalled = document.documentElement.getAttribute('data-neoexamshield-installed') === 'true' ||
                          document.documentElement.getAttribute('data-neoexamshield-active') === 'true' ||
                          document.documentElement.getAttribute('data-te-extension-installed') === 'true' || 
                          document.documentElement.getAttribute('data-seep-proctor-installed') === 'true';
      if (isInstalled) {
        setIsTeExtensionActive(true);
        setTeMessage('🟢 NeoExamShield ACTIVE: All third-party browser extensions restricted.');
      } else {
        activateTe();
      }
    };

    checkTe();

    const handleMessage = (event: MessageEvent) => {
      if (event.data && (event.data.source === 'te-extension' || event.data.source === 'neoexamshield-extension' || event.data.source === 'seep-extension')) {
        if (event.data.type === 'LIVE_EXTENSIONS_RESPONSE') {
          if (event.data.ok && Array.isArray(event.data.extensions)) {
            setLiveChromeExtensions(event.data.extensions);
          }
          return;
        }
        if (event.data.type === 'TOGGLE_LIVE_EXTENSION_RESPONSE') {
          if (event.data.ok && event.data.id) {
            setLiveChromeExtensions(prev => prev.map(ext => ext.id === event.data.id ? { ...ext, enabled: event.data.enabled } : ext));
          }
          return;
        }
        if (event.data.type === 'DISABLE_ALL_LIVE_EXTENSIONS_RESPONSE') {
          if (event.data.ok) {
            setLiveChromeExtensions(prev => prev.map(ext => (ext.isSelf || ext.name.toLowerCase().includes('neoexamshield')) ? ext : { ...ext, enabled: false }));
            setOtherExtensionsState({ automatedBooking: false, googleDocs: false, monica: false });
          }
          return;
        }
        if (event.data.type === 'START_TE_EXAM_RESPONSE' || event.data.type === 'TE_STATUS_RESPONSE') {
          if (event.data.secure === false || event.data.securityState === 'FAILED') {
            setIsTeExtensionActive(false);
            setTeMessage('⛔ Security Verification Failed: Unauthorized extension active or could not be disabled.');
            alert(`⛔ EXAM LOCKED: SECURITY VERIFICATION FAILED!\nReason: ${event.data.reason || 'Unauthorized extension remains active'}.\nAll unauthorized browser extensions must be disabled before starting the exam.`);
            return;
          }
        }
        setIsTeExtensionActive(true);
        setTeMessage('🟢 NeoExamShield Extension ACTIVE: All unauthorized browser extensions disabled & verified.');
      }
    };

    window.addEventListener('message', handleMessage);

    const interval = setInterval(() => {
      const isInstalled = document.documentElement.getAttribute('data-neoexamshield-installed') === 'true' ||
                          document.documentElement.getAttribute('data-neoexamshield-active') === 'true' ||
                          document.documentElement.getAttribute('data-te-extension-installed') === 'true';
      if (isInstalled && !isTeExtensionActive) {
        setIsTeExtensionActive(true);
        setTeMessage('🟢 NeoExamShield ACTIVE: All third-party browser extensions restricted.');
      }
    }, 400);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, [isTeExtensionActive]);

  useEffect(() => {
    if (verificationStep === 'step4_extensions_page' || verificationStep === 'step4_warning2') {
      window.postMessage({ source: 'neoexamshield-portal', type: 'FETCH_LIVE_EXTENSIONS' }, '*');
    }
  }, [verificationStep]);

  /* ── 1. Load exam & create attempt ── */
  useEffect(() => {
    if (!examId) return;
    (async () => {
      try {
        const examData = await api<ExamDetails>(`/api/exams/${examId}`);
        setExam(examData);
        setTimeLeftSeconds((examData.durationMinutes || 60) * 60);

        const userStr = localStorage.getItem('seep_user');
        const userObj = userStr ? JSON.parse(userStr) : { id: 'student-1', firstName: 'Student' };
        const userId = userObj.id || 'student-1';

        // 1a. Verify & authenticate extension session with backend
        const verifyRes = await api<{ sessionToken: string }>(`/api/extension/verify-init`, {
          method: 'POST',
          body: JSON.stringify({
            examId,
            studentId: userId,
            studentName: `${userObj.firstName || 'Student'} ${userObj.lastName || ''}`.trim()
          })
        }).catch(() => ({ sessionToken: `ext-session-${Date.now()}` }));

        setSessionToken(verifyRes.sessionToken);

        // 1b. Start attempt
        const startRes = await api<{ attemptId: string }>(`/api/attempts/${examId}/start`, {
          method: 'POST',
          body: JSON.stringify({ studentId: userId })
        });

        setAttemptId(startRes.attemptId);
        setPhase('countdown');
      } catch (err: any) {
        setError(err.message || 'Could not load exam');
        setPhase('error');
      }
    })();
  }, [examId]);

  /* ── Continuous E-Extension Heartbeat & Disconnect Detection ── */
  useEffect(() => {
    if (phase !== 'exam') return;

    const checkHeartbeat = async () => {
      const isInstalled = document.documentElement.getAttribute('data-te-extension-installed') === 'true' ||
                          document.documentElement.getAttribute('data-te-extension-active') === 'true';

      if (!isInstalled || !isTeExtensionActive) {
        triggerExamLock('E-Extension connection lost or disabled');
        return;
      }

      try {
        const res = await api<{ ok: boolean; status?: string }>(`/api/extension/heartbeat`, {
          method: 'POST',
          body: JSON.stringify({
            sessionToken: sessionToken || `ext-session-${attemptId}`,
            examId,
            studentId: localStorage.getItem('seep_user') ? JSON.parse(localStorage.getItem('seep_user')!).id : 'student-1'
          })
        }).catch(() => ({ ok: true, status: undefined }));

        if (res && res.status === 'LOCKED') {
          triggerExamLock('Backend security locked exam session due to extension disconnect');
        }
      } catch (err) {
        console.warn('Heartbeat check error:', err);
      }
    };

    const interval = setInterval(checkHeartbeat, 3000);
    return () => clearInterval(interval);
  }, [phase, isTeExtensionActive, sessionToken, attemptId]);

  const triggerExamLock = async (reason: string) => {
    if (isExamLocked) return;
    setIsExamLocked(true);
    setLockReason(reason);
    setDisconnectCount((c) => c + 1);

    const userStr = localStorage.getItem('seep_user');
    const u = userStr ? JSON.parse(userStr) : {};

    await api('/api/extension/log-event', {
      method: 'POST',
      body: JSON.stringify({
        type: 'EXTENSION_DISCONNECTED',
        sessionToken,
        examId,
        studentId: u.id || 'student-1',
        studentName: `${u.firstName || 'Student'} ${u.lastName || ''}`.trim(),
        details: reason
      })
    }).catch(() => {});
  };

  const handleReverifyAndResume = async () => {
    try {
      document.documentElement.setAttribute('data-te-extension-installed', 'true');
      document.documentElement.setAttribute('data-te-extension-active', 'true');
      window.postMessage({ source: 'te-portal', type: 'START_TE_EXAM' }, '*');
      setIsTeExtensionActive(true);

      const userStr = localStorage.getItem('seep_user');
      const u = userStr ? JSON.parse(userStr) : {};

      await api('/api/extension/log-event', {
        method: 'POST',
        body: JSON.stringify({
          type: 'EXTENSION_RESTORED',
          sessionToken,
          examId,
          studentId: u.id || 'student-1',
          studentName: `${u.firstName || 'Student'} ${u.lastName || ''}`.trim(),
          details: 'E-Extension re-verified and exam session resumed.'
        })
      }).catch(() => {});

      setIsExamLocked(false);
      enterFullscreenSafely();
    } catch (e) {
      alert('Could not re-verify extension. Please ensure E-Extension is turned ON.');
    }
  };

  /* ── 2. 5-second automatic countdown (Triggered during Step 5 Environment Check) ── */
  useEffect(() => {
    if (phase !== 'countdown' || verificationStep !== 'step5_countdown') return;
    if (countdown <= 0) {
      enterFullscreenSafely();
      setPhase('exam');
      setVerificationStep('exam_ready');
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown, verificationStep]);

  const enterFullscreenSafely = async () => {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      // Ignored if user gesture policy is active
    }
  };

  /* ── 3. Fullscreen & Proctoring Protection + Copy/Paste Prevention ── */
  useEffect(() => {
    if (phase !== 'exam') return;

    // Force Fullscreen safely
    enterFullscreenSafely();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleMalpracticeTermination('TAB_SWITCH');
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleMalpracticeTermination('FULLSCREEN_EXIT');
      }
    };

    const handleWindowBlur = () => {
      setTimeout(() => {
        if (!document.hasFocus()) {
          handleMalpracticeTermination('WINDOWS_OVERLAY_OR_FOCUS_LOST');
        }
      }, 250);
    };

    const preventCopyPaste = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const preventClipboardKeys = (e: KeyboardEvent) => {
      const key = e.key ? e.key.toLowerCase() : '';
      const code = e.code ? e.code.toLowerCase() : '';

      // Intercept Windows Key / Meta Key / Windows+G (Xbox Game Bar / Edge overlay trigger)
      if (
        key === 'meta' ||
        key === 'os' ||
        key === 'win' ||
        code.includes('meta') ||
        e.metaKey ||
        (e.metaKey && (key === 'g' || code === 'keyg'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleMalpracticeTermination('WINDOWS_G_KEY');
        return false;
      }

      if (key === 'escape' || key === 'esc') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleMalpracticeTermination('ESC_KEY');
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Intercept Ctrl+M / Cmd+M (Monica AI), Ctrl+C/V/X/A, Alt shortcuts, F-keys
      if (isCtrlOrCmd || e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (key === 'm') {
          console.warn('🛡️ Blocked Ctrl+M / Cmd+M shortcut attempt (Monica AI / External AI Extension)');
          const uStr = localStorage.getItem('seep_user');
          const u = uStr ? JSON.parse(uStr) : {};
          api('/api/extension/log-event', {
            method: 'POST',
            body: JSON.stringify({
              type: 'SUSPICIOUS_AI_SHORTCUT_BLOCKED',
              sessionToken,
              examId,
              studentId: u.id || 'student-1',
              studentName: `${u.firstName || 'Student'} ${u.lastName || ''}`.trim(),
              details: 'Blocked Ctrl+M / Cmd+M hotkey trigger (Monica AI / AI Assistant Extension).'
            })
          }).catch(() => {});
        }
        return false;
      }

      if (['f12', 'f11', 'f5', 'f1'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    document.addEventListener('copy', preventCopyPaste, true);
    document.addEventListener('paste', preventCopyPaste, true);
    document.addEventListener('cut', preventCopyPaste, true);
    document.addEventListener('contextmenu', preventCopyPaste, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', preventClipboardKeys, true);
    window.addEventListener('keyup', preventClipboardKeys, true);
    window.addEventListener('blur', handleWindowBlur, true);

    return () => {
      document.removeEventListener('copy', preventCopyPaste, true);
      document.removeEventListener('paste', preventCopyPaste, true);
      document.removeEventListener('cut', preventCopyPaste, true);
      document.removeEventListener('contextmenu', preventCopyPaste, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', preventClipboardKeys, true);
      window.removeEventListener('keyup', preventClipboardKeys, true);
      window.removeEventListener('blur', handleWindowBlur, true);
    };
  }, [phase, attemptId, exam]);

  const handleMalpracticeTermination = async (reason: string = 'FULLSCREEN_EXIT') => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    const userStr = localStorage.getItem('seep_user');
    const u = userStr ? JSON.parse(userStr) : {};

    // Notify backend proctoring service (which alerts both Admin & Teacher)
    if (attemptId) {
      await api(`/api/attempts/${attemptId}/proctor`, {
        method: 'POST',
        body: JSON.stringify({
          studentId: u.id || 'student-1',
          studentName: `${u.firstName || 'Student'} ${u.lastName || ''}`.trim(),
          regNo: u.regNo || 'CS2026001',
          examTitle: exam?.title || 'Examination',
          type: reason
        })
      }).catch(() => {});
    }

    const violationMessageMap: Record<string, string> = {
      WINDOWS_G_KEY: 'Windows key / Windows+G pressed (Malpractice)',
      WINDOWS_KEY: 'Windows key pressed (Malpractice)',
      WINDOWS_OVERLAY_OR_FOCUS_LOST: 'Window focus lost / External app or Edge overlay opened (Malpractice)',
      ESC_KEY: 'Esc key pressed',
      FULLSCREEN_EXIT: 'Exited fullscreen mode',
      TAB_SWITCH: 'Tab switch detected',
      AI_EXTENSION_HOTKEY: 'Unauthorized AI Assistant shortcut triggered (Ctrl+M / Cmd+M)'
    };

    const violationText = violationMessageMap[reason] || 'Proctoring violation detected';

    alert(`⛔ EXAM TERMINATED DUE TO PROCTORING VIOLATION!\nViolation: ${violationText}.\nYour session is locked. A malpractice report has been sent to the Admin & Teacher.`);
    navigate('/student/dashboard');
  };

  /* ── 4. Exam Timer ── */
  useEffect(() => {
    if (phase !== 'exam') return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) { clearInterval(timer); handleSubmitExam(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const handleSubmitExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      if (attemptId && !attemptId.startsWith('demo-')) {
        await api(`/api/attempts/${attemptId}/submit`, {
          method: 'POST',
          body: JSON.stringify({ mcqAnswers })
        }).catch(() => {});
      }
    } finally {
      alert('✅ Examination submitted successfully!');
      navigate('/student/dashboard');
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /* ────────────────── PHASES ────────────────── */

  if (phase === 'loading') {
    return (
      <div style={styles.fullCenter}>
        <div style={styles.loadCard}>
          <div style={styles.spinner} />
          <h2 style={{ margin: '1.5rem 0 0.5rem', color: '#1e293b', fontWeight: 700 }}>Preparing Your Exam</h2>
          <p style={{ color: '#64748b', margin: 0 }}>Setting up a secure proctored environment…</p>
        </div>
        <style>{spinnerCss}</style>
      </div>
    );
  }

  const handleResetAttempt = async () => {
    if (!examId) return;
    setPhase('loading');
    setError(null);
    try {
      const userStr = localStorage.getItem('seep_user');
      const userId = userStr ? JSON.parse(userStr).id : 'student-1';
      const startRes = await api<{ attemptId: string }>(`/api/attempts/${examId}/start?reset=true`, {
        method: 'POST',
        body: JSON.stringify({ studentId: userId, reset: true })
      });
      setAttemptId(startRes.attemptId);
      setPhase('countdown');
    } catch (err: any) {
      setError(err.message || 'Could not reset exam attempt');
      setPhase('error');
    }
  };

  if (phase === 'error') {
    return (
      <div style={styles.fullCenter}>
        <div style={{ ...styles.loadCard, borderTop: '4px solid #ef4444' }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={{ margin: '1rem 0 0.5rem', color: '#1e293b' }}>Exam Unavailable</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error || 'Could not load exam. Please try again.'}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={handleResetAttempt} style={{ ...styles.primaryBtn, background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.35)' }}>
              🔄 Reset & Retry Attempt
            </button>
            <button onClick={() => navigate('/student/dashboard')} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

function AssessmentEnvironmentBackground({ examTitle }: { examTitle?: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#e2e8f0', color: '#1e293b', fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", display: 'flex' }}>
      {/* Left Navy Sidebar */}
      <div style={{ width: '220px', background: '#161b33', color: '#94a3b8', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#161b33' }}>BIT</div>
          <div style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>BANNARI AMMAN<br/><span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>INSTITUTE OF TECH</span></div>
        </div>
        <div style={{ padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {[
            { label: 'Courses', icon: '📚', active: false },
            { label: 'Contest', icon: '🏆', active: false },
            { label: 'Drives', icon: '💼', active: false },
            { label: 'Assessments', icon: '📝', active: true },
            { label: 'Company Specific Test', icon: '🎖️', active: false },
            { label: 'Open IDE', icon: '💻', active: false }
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.7rem 1rem', borderRadius: '8px', background: item.active ? '#22294e' : 'transparent', color: item.active ? '#3b82f6' : '#94a3b8', fontWeight: item.active ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer', borderLeft: item.active ? '4px solid #3b82f6' : '4px solid transparent' }}>
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Portal View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Navigation Bar */}
        <div style={{ background: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '0.45rem 1rem', width: '320px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0' }}>
            <span style={{ color: '#94a3b8' }}>🔍</span>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Search</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span style={{ color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>🔔</span>
            <span style={{ color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>🛒</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>N</div>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Naveen v</span>
            </div>
          </div>
        </div>

        {/* Assessment Body Page */}
        <div style={{ padding: '1.5rem 2rem', flex: 1 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.5rem 2rem', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#1e293b' }}>{examTitle || 'BIT_Nerdx_Weekly Assessment 1'}</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>View Instructions</span>
                <button style={{ background: '#1e2a5a', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>Retake Test</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <span style={{ color: '#64748b', paddingBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Overview</span>
              <span style={{ color: '#3b82f6', borderBottom: '3px solid #3b82f6', paddingBottom: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>Attempt</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
              <div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>^ Weekly Assessments</span>
                  <span style={{ background: '#22c55e', color: '#fff', borderRadius: '12px', padding: '0.15rem 0.6rem', fontSize: '0.72rem', fontWeight: 800 }}>100%</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1rem' }}>
                  {['1. BIT_Nerdx_Weekly Assessment 1', '2. BIT_Nerdx_Weekly Assessment 2', '3. BIT_Nerdx_Weekly Assessment 3', '4. BIT_Nerdx_Weekly Assessment 4'].map((title) => (
                    <div key={title} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#22c55e' }}>✔</span>
                      <span>{title}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>Attempt : 01 of 03</div>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🕴️</div>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Test analysis is locked</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

  if (phase === 'countdown') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        
        {/* ── STEP 2: WARNING MODAL 1 (Matching Image 1) ── */}
        {verificationStep === 'step2_warning1' && (
          <div style={{ position: 'relative' }}>
            <AssessmentEnvironmentBackground examTitle={exam?.title} />

            <div style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(3px)',
              display: 'grid', placeItems: 'center',
              zIndex: 99999,
              padding: '1rem'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '2.25rem 2.5rem',
                maxWidth: '560px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                color: '#1e293b'
              }}>
                <button
                  onClick={() => window.close()}
                  style={{
                    position: 'absolute', top: '1.25rem', right: '1.25rem',
                    border: 'none', background: 'transparent',
                    fontSize: '1.25rem', cursor: 'pointer', color: '#64748b'
                  }}
                >
                  ✕
                </button>

                <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                  Warning!
                </h2>

                <p style={{ margin: '0 0 2.25rem', fontSize: '0.96rem', color: '#334155', lineHeight: 1.65 }}>
                  Please refrain from using Incognito Window. Kindly install / enable 'NeoExamShield' to take the test. Click 'OK' to install the extension from the Chrome Web Store.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setVerificationStep('step3_chrome_store')}
                    style={{
                      background: '#3b82f6',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.65rem 1.85rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: CHROME WEB STORE PAGE & EXTENSION INSTALLATION (Matching Images 2 & 3) ── */}
        {verificationStep === 'step3_chrome_store' && (
          <div style={{ minHeight: '100vh', background: '#202124', color: '#e8eaed', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
            {/* Chrome Web Store Navigation Header */}
            <div style={{ background: '#292a2d', borderBottom: '1px solid #3c4043', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #ea4335, #fbbc05, #34a853, #4285f4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>C</div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e8eaed' }}>chrome web store</span>
                </div>
                <div style={{ background: '#202124', border: '1px solid #3c4043', borderRadius: '24px', padding: '0.5rem 1.25rem', width: '380px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: '#9aa0a6' }}>🔍</span>
                  <input readOnly value="Search extensions and themes" style={{ background: 'transparent', border: 'none', color: '#9aa0a6', width: '100%', outline: 'none', fontSize: '0.9rem' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <span style={{ color: '#9aa0a6', cursor: 'pointer' }}>⚙️</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1a73e8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>School</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ background: '#292a2d', borderBottom: '1px solid #3c4043', padding: '0 2rem', display: 'flex', gap: '2rem' }}>
              {['Discover', 'Extensions', 'Themes'].map((t) => (
                <span key={t} style={{ padding: '0.85rem 0', color: t === 'Extensions' ? '#8ab4f8' : '#9aa0a6', borderBottom: t === 'Extensions' ? '3px solid #8ab4f8' : '3px solid transparent', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>{t}</span>
              ))}
            </div>

            {/* Main Store View */}
            <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', boxShadow: '0 8px 20px rgba(0,0,0,0.3)', flexShrink: 0 }}>
                    💻
                  </div>
                  <div>
                    <h1 style={{ margin: '0 0 0.5rem', fontSize: '2.2rem', fontWeight: 700, color: '#f1f5f9' }}>NeoExamShield</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      <span>1.1 ⭐ <span style={{ color: '#8ab4f8' }}>(700 ratings)</span> ⓘ</span>
                      <span>🔗 Share</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ background: '#303134', color: '#e8eaed', padding: '0.25rem 0.85rem', borderRadius: '16px', fontSize: '0.8rem' }}>Extension</span>
                      <span style={{ background: '#303134', color: '#e8eaed', padding: '0.25rem 0.85rem', borderRadius: '16px', fontSize: '0.8rem' }}>Education</span>
                      <span style={{ color: '#9aa0a6', fontSize: '0.85rem', alignSelf: 'center', marginLeft: '0.5rem' }}>100,000 users</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowChromeAddDialog(true)}
                  disabled={installedNeoExamShield}
                  style={{
                    background: installedNeoExamShield ? '#3c4043' : '#1a73e8',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.75rem 2.2rem',
                    borderRadius: '24px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: installedNeoExamShield ? 'default' : 'pointer',
                    boxShadow: installedNeoExamShield ? 'none' : '0 4px 14px rgba(26, 115, 232, 0.4)',
                    transition: 'all 0.2s'
                  }}
                >
                  {installedNeoExamShield ? '✓ Added to Chrome' : 'Add to Chrome'}
                </button>
              </div>

              {/* Extension Showcase Banner (Matching Image 2) */}
              <div style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius: '16px', padding: '3.5rem 2.5rem', color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 30px rgba(0,0,0,0.4)', minHeight: '260px', display: 'flex', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 1rem', lineHeight: 1.2 }}>Neo Exam Shield</h2>
                  <p style={{ fontSize: '1.25rem', color: '#bfdbfe', maxWidth: '500px', margin: 0, lineHeight: 1.5 }}>
                    Identify other extensions and prevent students from engaging in malpractices.
                  </p>
                </div>
                <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.2, fontSize: '14rem' }}>
                  🛡️
                </div>
              </div>

              {/* Status Notification Toast at Bottom Left (Matching Image 2) */}
              <div style={{ position: 'fixed', bottom: '1.5rem', left: '1.5rem', background: '#202124', border: '1px solid #3c4043', borderRadius: '8px', padding: '0.85rem 1.25rem', color: '#e8eaed', fontSize: '0.85rem', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: installedNeoExamShield ? '#34a853' : '#ea4335' }} />
                {installedNeoExamShield ? 'NeoExamShield has been added to Chrome.' : 'NeoExamShield has been removed from Chrome.'}
              </div>
            </div>

            {/* Chrome Add Extension Confirmation Dialog Modal (Matching Image 3) */}
            {showChromeAddDialog && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 99999 }}>
                <div style={{ background: '#282a2c', border: '1px solid #3c4043', borderRadius: '16px', width: '420px', padding: '1.75rem', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', color: '#e8eaed', fontFamily: "'Segoe UI', sans-serif" }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                      💻
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#f1f5f9' }}>Add "NeoExamShield"?</h3>
                    </div>
                  </div>

                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#9aa0a6', fontWeight: 600 }}>It can:</p>
                  <ul style={{ margin: '0 0 1.75rem', paddingLeft: '1.25rem', color: '#e8eaed', fontSize: '0.88rem', lineHeight: 1.6 }}>
                    <li>Read and change all your data on all websites</li>
                    <li>Manage your apps, extensions, and themes</li>
                  </ul>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      onClick={() => {
                        setInstalledNeoExamShield(true);
                        document.documentElement.setAttribute('data-neoexamshield-installed', 'true');
                        document.documentElement.setAttribute('data-neoexamshield-active', 'true');
                        document.documentElement.setAttribute('data-te-extension-installed', 'true');
                        document.documentElement.setAttribute('data-te-extension-active', 'true');
                        setIsTeExtensionActive(true);
                        setShowChromeAddDialog(false);
                        setVerificationStep('step4_warning2');
                      }}
                      style={{ background: '#1a73e8', color: '#ffffff', border: 'none', padding: '0.6rem 1.4rem', borderRadius: '20px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      Add extension
                    </button>
                    <button
                      onClick={() => setShowChromeAddDialog(false)}
                      style={{ background: '#3c4043', color: '#e8eaed', border: 'none', padding: '0.6rem 1.4rem', borderRadius: '20px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: WARNING MODAL 2 (Matching Image 4) ── */}
        {verificationStep === 'step4_warning2' && (
          <div style={{ position: 'relative' }}>
            <AssessmentEnvironmentBackground examTitle={exam?.title} />

            <div style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(3px)',
              display: 'grid', placeItems: 'center',
              zIndex: 99999,
              padding: '1rem'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '2.25rem 2.5rem',
                maxWidth: '560px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                color: '#1e293b'
              }}>
                <button
                  onClick={() => window.close()}
                  style={{
                    position: 'absolute', top: '1.25rem', right: '1.25rem',
                    border: 'none', background: 'transparent',
                    fontSize: '1.25rem', cursor: 'pointer', color: '#64748b'
                  }}
                >
                  ✕
                </button>

                <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                  Warning!
                </h2>

                <p style={{ margin: '0 0 2.25rem', fontSize: '0.96rem', color: '#334155', lineHeight: 1.65 }}>
                  Please disable all extensions except 'NeoExamShield' to take the test. Click 'OK' to access the extension page.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setVerificationStep('step4_extensions_page')}
                    style={{
                      background: '#3b82f6',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.65rem 1.85rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: CHROME EXTENSIONS MANAGEMENT PAGE (Matching Image 5) ── */}
        {verificationStep === 'step4_extensions_page' && (() => {
          const activeLiveUnauthorized = liveChromeExtensions.filter(e => !e.isSelf && !e.name.toLowerCase().includes('neoexamshield') && e.enabled);
          const isPassed = liveChromeExtensions.length > 0
            ? activeLiveUnauthorized.length === 0
            : (!otherExtensionsState.automatedBooking && !otherExtensionsState.googleDocs && !otherExtensionsState.monica);

          const displayList = liveChromeExtensions.length > 0
            ? liveChromeExtensions.map(e => ({
                key: e.id,
                title: e.name,
                version: e.version || '1.0',
                desc: e.description || 'Installed browser extension on Chrome.',
                id: e.id,
                inspect: 'service worker',
                icon: (e.isSelf || e.name.toLowerCase().includes('neoexamshield')) ? '💻' : '🧩',
                enabled: e.enabled,
                toggleable: !(e.isSelf || e.name.toLowerCase().includes('neoexamshield')),
                isLive: true
              }))
            : [
                {
                  key: 'automatedBooking',
                  title: 'Automated Booking',
                  version: '12.1',
                  desc: 'Automatically book slots on multiple tabs with unique query parameters.',
                  id: 'kghekogakhailaobgcagldebdijbfcbpg',
                  inspect: 'service worker',
                  icon: '💡',
                  enabled: otherExtensionsState.automatedBooking,
                  toggleable: true,
                  isLive: false
                },
                {
                  key: 'googleDocs',
                  title: 'Google Docs Offline',
                  version: '1.109.1',
                  desc: 'Edit, create, and view your documents, spreadsheets, and presentations — all without internet access.',
                  id: 'ghbmnnjooekpmoecnnnilnnbdlolhkhi',
                  inspect: 'service worker, 1 more...',
                  icon: '📊',
                  enabled: otherExtensionsState.googleDocs,
                  toggleable: true,
                  isLive: false
                },
                {
                  key: 'monica',
                  title: 'Monica: All-In-One AI Assist & Smartest ...',
                  version: '9.0.22',
                  desc: 'One stop AI Assistant with GPT, Claude, Gemini: Chat, Write, Translate, Search, Summarize, image generator, video generation',
                  id: 'ofpnmcalabcbjgholdjcjblkibolbppb',
                  inspect: 'service worker',
                  icon: '🤖',
                  enabled: otherExtensionsState.monica,
                  toggleable: true,
                  isLive: false
                },
                {
                  key: 'neoexamshield',
                  title: 'NeoExamShield Release Version',
                  version: '',
                  desc: 'Prevents malpractice by blocking unauthorized extensions and websites during tests on the lamneo portal.',
                  id: 'deojfdehldjjfmcjcfaogalbalafifc',
                  inspect: 'service worker',
                  icon: '💻',
                  enabled: true,
                  toggleable: false,
                  isLive: false
                }
              ];

          const handleDisableAll = () => {
            window.postMessage({ source: 'neoexamshield-portal', type: 'DISABLE_ALL_LIVE_EXTENSIONS' }, '*');
            window.postMessage({ source: 'neoexamshield-portal', type: 'START_NEOEXAMSHIELD' }, '*');
            setOtherExtensionsState({ automatedBooking: false, googleDocs: false, monica: false });
            setLiveChromeExtensions(prev => prev.map(item => (item.isSelf || item.name.toLowerCase().includes('neoexamshield')) ? item : { ...item, enabled: false }));
          };

          const handleToggleItem = (ext: typeof displayList[0]) => {
            if (!ext.toggleable) return;
            const targetState = !ext.enabled;
            if (ext.isLive) {
              window.postMessage({ source: 'neoexamshield-portal', type: 'TOGGLE_LIVE_EXTENSION', id: ext.id, enabled: targetState }, '*');
              setLiveChromeExtensions(prev => prev.map(item => item.id === ext.id ? { ...item, enabled: targetState } : item));
            } else {
              window.postMessage({ source: 'neoexamshield-portal', type: 'TOGGLE_LIVE_EXTENSION', id: ext.id, enabled: targetState }, '*');
              setOtherExtensionsState(prev => ({ ...prev, [ext.key]: targetState }));
            }
          };

          return (
            <div style={{ minHeight: '100vh', background: '#202124', color: '#e8eaed', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
              {/* Chrome Address Bar Header */}
              <div style={{ background: '#292a2d', borderBottom: '1px solid #3c4043', padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: '#9aa0a6', fontSize: '1.1rem', cursor: 'pointer' }}>←</span>
                <span style={{ color: '#9aa0a6', fontSize: '1.1rem', cursor: 'pointer' }}>→</span>
                <span style={{ color: '#9aa0a6', fontSize: '1.1rem', cursor: 'pointer' }}>↻</span>
                <div style={{ flex: 1, background: '#202124', border: '1px solid #3c4043', borderRadius: '20px', padding: '0.4rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e8eaed', fontSize: '0.85rem' }}>
                  <span style={{ color: '#9aa0a6' }}>🔒 Chrome</span>
                  <span style={{ color: '#e8eaed' }}>chrome://extensions</span>
                </div>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1a73e8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>School</div>
              </div>

              {/* Extensions Header Bar */}
              <div style={{ background: '#292a2d', borderBottom: '1px solid #3c4043', padding: '1rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#f1f5f9' }}>Extensions</h1>
                  <div style={{ background: '#202124', border: '1px solid #3c4043', borderRadius: '20px', padding: '0.45rem 1.25rem', width: '300px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#9aa0a6' }}>🔍</span>
                    <input readOnly value="Search extensions" style={{ background: 'transparent', border: 'none', color: '#9aa0a6', outline: 'none', width: '100%', fontSize: '0.85rem' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#9aa0a6' }}>Developer mode</span>
                  <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: '#8ab4f8', position: 'relative', cursor: 'pointer' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#202124', position: 'absolute', top: '2px', right: '2px' }} />
                  </div>
                </div>
              </div>

              {/* Sub-bar Actions */}
              <div style={{ background: '#202124', borderBottom: '1px solid #3c4043', padding: '0.75rem 2.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {['Load unpacked', 'Pack extension', 'Update'].map((btn) => (
                  <button key={btn} style={{ background: 'transparent', border: '1px solid #8ab4f8', color: '#8ab4f8', padding: '0.45rem 1.25rem', borderRadius: '16px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>{btn}</button>
                ))}
                <button
                  onClick={handleDisableAll}
                  style={{ marginLeft: 'auto', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '16px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ⚡ Disable All Other Extensions Automatically
                </button>
              </div>

              {/* Profile Managed Banner */}
              <div style={{ padding: '1rem 2.5rem', background: '#202124', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#9aa0a6', fontSize: '0.85rem' }}>
                <span>🏢 Your profile is managed by <strong>bitsathy.ac.in</strong></span>
              </div>

              {/* Extensions List Container */}
              <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 2.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1.25rem' }}>All Extensions</h3>

                {/* Verification Status Banner */}
                {isPassed ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#34d399', fontWeight: 700, fontSize: '0.95rem' }}>✅ Security Verification Passed!</div>
                      <div style={{ color: '#a7f3d0', fontSize: '0.85rem', marginTop: '0.2rem' }}>All non-essential extensions are turned OFF in Chrome. Only NeoExamShield is active.</div>
                    </div>
                    <button
                      onClick={() => setVerificationStep('step5_countdown')}
                      style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}
                    >
                      Proceed to Environment Setup →
                    </button>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.75rem', color: '#fca5a5', fontSize: '0.88rem' }}>
                    ⚠️ <strong>Action Required:</strong> Turn OFF the toggle switches for all extensions below except <strong>NeoExamShield</strong> to continue.
                  </div>
                )}

                {/* Extension Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  {displayList.map((ext) => (
                    <div key={ext.key} style={{ background: '#292a2d', border: '1px solid #3c4043', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#3c4043', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                            {ext.icon}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9' }}>
                              {ext.title} <span style={{ color: '#9aa0a6', fontSize: '0.8rem', fontWeight: 400 }}>{ext.version}</span>
                            </h4>
                            <p style={{ margin: '0.4rem 0 0.6rem', fontSize: '0.8rem', color: '#9aa0a6', lineHeight: 1.45 }}>
                              {ext.desc}
                            </p>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: '#9aa0a6', marginTop: '0.5rem' }}>
                          ID: <code>{ext.id}</code>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9aa0a6', marginTop: '0.2rem' }}>
                          Inspect views: <span style={{ color: '#8ab4f8', cursor: 'pointer' }}>{ext.inspect}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #3c4043' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button style={{ background: '#3c4043', border: 'none', color: '#e8eaed', padding: '0.35rem 0.85rem', borderRadius: '16px', fontSize: '0.78rem', cursor: 'pointer' }}>Details</button>
                          <button style={{ background: '#3c4043', border: 'none', color: '#e8eaed', padding: '0.35rem 0.85rem', borderRadius: '16px', fontSize: '0.78rem', cursor: 'pointer' }}>Remove</button>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <div
                          onClick={() => handleToggleItem(ext)}
                          style={{
                            width: '40px',
                            height: '22px',
                            borderRadius: '11px',
                            background: ext.enabled ? '#8ab4f8' : '#5f6368',
                            position: 'relative',
                            cursor: ext.toggleable ? 'pointer' : 'not-allowed',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: '#202124',
                            position: 'absolute',
                            top: '2px',
                            left: ext.enabled ? '20px' : '2px',
                            transition: 'left 0.2s'
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── STEP 5: 5-SECONDS ENVIRONMENT VERIFICATION PAGE ── */}
        {verificationStep === 'step5_countdown' && (
          <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', display: 'grid', placeItems: 'center', fontFamily: "'Inter', sans-serif", color: '#f8fafc', padding: '2rem' }}>
            <div style={{ textAlign: 'center', maxWidth: '520px', width: '100%', background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '24px', padding: '3rem 2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
              
              {/* Animated 5-second countdown timer ring */}
              <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 2rem' }}>
                <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="80" cy="80" r="54" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="10" />
                  <circle
                    cx="80" cy="80" r="54" fill="none"
                    stroke="#6366f1"
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={(2 * Math.PI * 54) * (1 - countdown / COUNTDOWN_SECONDS)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.9s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '3.2rem', fontWeight: 800, color: '#818cf8', lineHeight: 1 }}>{countdown}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.2rem' }}>Seconds</span>
                </div>
              </div>

              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem' }}>
                Environment Setup & Security Check
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: '0 0 2rem', lineHeight: 1.5 }}>
                Verifying system environment and extension integrity for <strong style={{ color: '#cbd5e1' }}>{exam?.title}</strong>...
              </p>

              {/* Environment Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left', background: 'rgba(0, 0, 0, 0.3)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                {[
                  { text: 'NeoExamShield Extension Active & Verified', status: true },
                  { text: '0 Conflicting Chrome Extensions Active', status: true },
                  { text: 'Browser & Session Security Tokens Authenticated', status: true },
                  { text: 'Secure Fullscreen & Focus Protection Enforced', status: countdown <= 2 }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem' }}>
                    <span style={{ color: item.status ? '#34d399' : '#a7f3d0', fontSize: '1.1rem' }}>{item.status ? '✓' : '⏳'}</span>
                    <span style={{ color: item.status ? '#f1f5f9' : '#94a3b8', fontWeight: item.status ? 600 : 400 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  /* ────────────────── EXAM PHASE ────────────────── */
  const allQuestions = [
    ...(exam?.mcqQuestions || []).map((q) => ({ ...q, _type: 'mcq' })),
    ...(exam?.codingQuestions || []).map((q) => ({ ...q, _type: 'coding' }))
  ];
  const currentQ = allQuestions[activeQuestionIndex];
  const isWarningTime = timeLeftSeconds < 300;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', 'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* E-Extension Disconnect Lock Modal */}
      {isExamLocked && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderTop: '6px solid #ef4444', borderRadius: '16px', padding: '2.5rem', maxWidth: '480px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🔒</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#991b1b', fontSize: '1.4rem', fontWeight: 800 }}>
              Exam Session Locked!
            </h3>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Your examination has been automatically <strong>locked</strong> because communication with the required <strong>E-Extension</strong> was lost or disabled.
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.75rem', fontSize: '0.85rem', color: '#991b1b', marginBottom: '1.5rem', textAlign: 'left' }}>
              <strong>Reason:</strong> {lockReason}<br />
              <strong>Disconnect count:</strong> {disconnectCount} (recorded in security audit log)
            </div>
            <button
              onClick={handleReverifyAndResume}
              style={{
                ...styles.primaryBtn,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 4px 15px rgba(16,185,129,0.35)',
                width: '100%',
                padding: '0.85rem'
              }}
            >
              🔄 Re-verify E-Extension & Resume Exam
            </button>
          </div>
        </div>
      )}

      {/* Warning Modal for 1st Tab Switch */}
      {warningModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderTop: '6px solid #f59e0b', borderRadius: '16px', padding: '2rem', maxWidth: '440px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#92400e', fontSize: '1.3rem' }}>Tab Switch Warning!</h3>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              You switched away from the test screen. <strong>1 warning out of 1 limit used!</strong><br /><br />
              <span style={{ color: '#dc2626', fontWeight: 700 }}>Note: One more tab switch will automatically terminate your exam for malpractice.</span>
            </p>
            <button
              onClick={() => {
                setWarningModalOpen(false);
                if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              style={{ ...styles.primaryBtn, width: '100%', padding: '0.75rem' }}
            >
              Return to Exam (Fullscreen)
            </button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header style={{
        height: '64px', background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem', position: 'sticky', top: 0, zIndex: 50
      }}>
        {/* Left — Exam Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: '#fff' }}>S</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{exam?.title}</h1>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{exam?.subject}</span>
          </div>
        </div>

        {/* Center — Progress Bar */}
        <div style={{ flex: 1, maxWidth: '320px', margin: '0 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
            <span>Question {activeQuestionIndex + 1} of {allQuestions.length}</span>
            <span>{Math.round(((activeQuestionIndex + 1) / Math.max(allQuestions.length, 1)) * 100)}% complete</span>
          </div>
          <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((activeQuestionIndex + 1) / Math.max(allQuestions.length, 1)) * 100}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Right — Timer + Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {tabSwitchCount > 0 && (
            <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
              ⚠️ Tab Warnings: {tabSwitchCount}/1
            </span>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: isWarningTime ? '#fef2f2' : '#f0f4ff',
            border: `1px solid ${isWarningTime ? '#fecaca' : '#c7d2fe'}`,
            color: isWarningTime ? '#dc2626' : '#4f46e5',
            padding: '0.45rem 1rem', borderRadius: '20px',
            fontWeight: 700, fontFamily: 'monospace', fontSize: '1.05rem'
          }}>
            ⏱ {formatTime(timeLeftSeconds)}
          </div>
          <button
            onClick={handleSubmitExam}
            disabled={isSubmitting}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '0.55rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(16,185,129,0.3)', fontSize: '0.9rem' }}
          >
            {isSubmitting ? 'Submitting…' : '✓ Submit Exam'}
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Main Question Area */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {currentQ?._type === 'mcq' && (
            <div style={{ maxWidth: '720px' }}>
              {/* Question Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ background: '#eef2ff', color: '#6366f1', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>MCQ</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Question {activeQuestionIndex + 1}</span>
                </div>
                <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>+{currentQ.marks ?? 1} marks</span>
              </div>

              {/* Question Card */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1.25rem' }}>
                <p style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', lineHeight: '1.7', fontWeight: 500 }}>{currentQ.text}</p>
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(currentQ.options || []).map((opt: string, idx: number) => {
                  const isSelected = mcqAnswers[currentQ.id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setMcqAnswers({ ...mcqAnswers, [currentQ.id]: idx })}
                      style={{
                        textAlign: 'left', padding: '1.1rem 1.25rem',
                        borderRadius: '12px', cursor: 'pointer',
                        background: isSelected ? '#eef2ff' : '#fff',
                        border: isSelected ? '2px solid #6366f1' : '1px solid #e2e8f0',
                        color: '#1e293b', fontSize: '0.95rem',
                        boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                        display: 'flex', alignItems: 'center', gap: '1rem'
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.borderColor = '#c7d2fe'); }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.borderColor = '#e2e8f0'); }}
                    >
                      <span style={{
                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                        background: isSelected ? '#6366f1' : '#f1f5f9',
                        color: isSelected ? '#fff' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.15s'
                      }}>
                        {['A', 'B', 'C', 'D'][idx]}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentQ?._type === 'coding' && (
            <StudentCodingQuestion attemptId={attemptId || 'demo'} question={currentQ} />
          )}
        </main>

        {/* Right Sidebar — Question Palette */}
        <aside style={{ width: '260px', background: '#fff', borderLeft: '1px solid #e2e8f0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          <div>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Question Palette</h4>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#dcfce7', border: '1px solid #86efac', display: 'inline-block' }} />Answered</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f8fafc', border: '1px solid #cbd5e1', display: 'inline-block' }} />Not visited</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
              {allQuestions.map((q, idx) => {
                const isAnswered = q._type === 'mcq' ? mcqAnswers[q.id] !== undefined : false;
                const isCurrent = activeQuestionIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveQuestionIndex(idx)}
                    style={{
                      padding: '0.55rem 0', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                      border: isCurrent ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      background: isCurrent ? '#eef2ff' : isAnswered ? '#dcfce7' : '#f8fafc',
                      color: isCurrent ? '#6366f1' : isAnswered ? '#16a34a' : '#64748b',
                      transition: 'all 0.15s'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Answered</span>
                <strong style={{ color: '#16a34a' }}>{Object.keys(mcqAnswers).length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Remaining</span>
                <strong style={{ color: '#dc2626' }}>{allQuestions.length - Object.keys(mcqAnswers).length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Total</span>
                <strong style={{ color: '#1e293b' }}>{allQuestions.length}</strong>
              </div>
            </div>
          </div>

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
            <button
              disabled={activeQuestionIndex === 0}
              onClick={() => setActiveQuestionIndex((n) => n - 1)}
              style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ← Prev
            </button>
            <button
              disabled={activeQuestionIndex === allQuestions.length - 1}
              onClick={() => setActiveQuestionIndex((n) => n + 1)}
              style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Next →
            </button>
          </div>
        </aside>
      </div>
      <style>{spinnerCss}</style>
    </div>
  );
}

const styles = {
  fullCenter: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafe 100%)',
    display: 'grid',
    placeItems: 'center',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: '2rem'
  } as React.CSSProperties,
  loadCard: {
    background: '#fff',
    borderRadius: '20px',
    padding: '3rem',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    textAlign: 'center' as const,
    maxWidth: '400px',
    width: '100%'
  } as React.CSSProperties,
  spinner: {
    width: '48px', height: '48px',
    borderRadius: '50%',
    border: '4px solid #e2e8f0',
    borderTopColor: '#6366f1',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto'
  } as React.CSSProperties,
  primaryBtn: {
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    color: '#fff', border: 'none',
    padding: '0.75rem 2rem', borderRadius: '10px',
    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(99,102,241,0.35)',
    transition: 'transform 0.15s ease'
  } as React.CSSProperties
};

const spinnerCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
`;
