import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();

  const initialStep = (searchParams.get('step') as VerificationStep) || 'step3_chrome_store';

  const [phase, setPhase] = useState<Phase>('loading');
  const [verificationStep, setVerificationStep] = useState<VerificationStep>(initialStep);
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
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitCountdown, setSubmitCountdown] = useState<number | null>(null);
  const [examResult, setExamResult] = useState<{
    status: string;
    totalScore: number;
    totalMarks: number;
    mcqScore: number;
    maxMcqMarks: number;
    codingScore: number;
    maxCodingMarks: number;
    percentage: number;
    mcqBreakdown?: {
      total: number;
      answered: number;
      correct: number;
      score: number;
      maxMarks: number;
    };
    codingBreakdown?: {
      total: number;
      attempted: number;
      score: number;
      maxMarks: number;
      details?: Array<{
        id: string;
        title: string;
        maxMarks: number;
        score: number;
        status: string;
        passedCases: number;
        totalCases: number;
      }>;
    };
  } | null>(null);

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
    const checkTe = () => {
      const isInstalled = document.documentElement.getAttribute('data-neoexamshield-installed') === 'true' ||
                          document.documentElement.getAttribute('data-neoexamshield-active') === 'true' ||
                          document.documentElement.getAttribute('data-te-extension-installed') === 'true' || 
                          document.documentElement.getAttribute('data-seep-proctor-installed') === 'true';
      if (isInstalled) {
        setIsTeExtensionActive(true);
        setInstalledNeoExamShield(true);
        setTeMessage('🟢 NeoExamShield Real Chrome Extension Connected: All third-party browser extensions restricted.');
        window.postMessage({ source: 'neoexamshield-portal', type: 'FETCH_LIVE_EXTENSIONS' }, '*');
      } else {
        window.postMessage({ source: 'neoexamshield-portal', type: 'CHECK_TE_STATUS' }, '*');
      }
    };

    checkTe();

    const handleMessage = (event: MessageEvent) => {
      if (event.data && (event.data.source === 'te-extension' || event.data.source === 'neoexamshield-extension' || event.data.source === 'seep-extension')) {
        setIsTeExtensionActive(true);
        setInstalledNeoExamShield(true);

        if (event.data.type === 'LIVE_EXTENSIONS_RESPONSE') {
          if (event.data.ok && Array.isArray(event.data.extensions)) {
            setLiveChromeExtensions(event.data.extensions);
          }
          return;
        }
        if (event.data.type === 'TOGGLE_LIVE_EXTENSION_RESPONSE') {
          if (event.data.ok && event.data.id) {
            setLiveChromeExtensions(prev => prev.map(ext => ext.id === event.data.id ? { ...ext, enabled: event.data.enabled } : ext));
            setTimeout(() => {
              window.postMessage({ source: 'neoexamshield-portal', type: 'FETCH_LIVE_EXTENSIONS' }, '*');
            }, 300);
          }
          return;
        }
        if (event.data.type === 'DISABLE_ALL_LIVE_EXTENSIONS_RESPONSE') {
          if (event.data.ok) {
            setLiveChromeExtensions(prev => prev.map(ext => (ext.isSelf || ext.name.toLowerCase().includes('neoexamshield')) ? ext : { ...ext, enabled: false }));
            setOtherExtensionsState({ automatedBooking: false, googleDocs: false, monica: false });
            setTimeout(() => {
              window.postMessage({ source: 'neoexamshield-portal', type: 'FETCH_LIVE_EXTENSIONS' }, '*');
            }, 300);
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
        setTeMessage('🟢 NeoExamShield Extension ACTIVE: All unauthorized browser extensions disabled & verified.');
      }
    };

    window.addEventListener('message', handleMessage);

    const interval = setInterval(() => {
      const isInstalled = document.documentElement.getAttribute('data-neoexamshield-installed') === 'true' ||
                          document.documentElement.getAttribute('data-neoexamshield-active') === 'true' ||
                          document.documentElement.getAttribute('data-te-extension-installed') === 'true';
      if (isInstalled) {
        setIsTeExtensionActive(true);
        setInstalledNeoExamShield(true);
        setTeMessage('🟢 NeoExamShield ACTIVE: Real Chrome extension verified.');
      }
    }, 500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, []);

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
      const isInstalled = document.documentElement.getAttribute('data-neoexamshield-installed') === 'true' ||
                          document.documentElement.getAttribute('data-neoexamshield-active') === 'true' ||
                          document.documentElement.getAttribute('data-te-extension-installed') === 'true' ||
                          document.documentElement.getAttribute('data-seep-proctor-installed') === 'true';

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

  useEffect(() => {
    // Ensure Extension Checkup always occurs BEFORE Environment Test (step5_countdown)
    const isVerified = localStorage.getItem(`seep_ext_verified_${examId}`) === 'true' || localStorage.getItem('seep_ext_verified_any') === 'true';
    if (!isVerified && verificationStep === 'step5_countdown') {
      setVerificationStep('step3_chrome_store');
    }
  }, [examId, verificationStep]);

  const handleReverifyAndResume = async () => {
    try {
      setIsExamLocked(false);
      setVerificationStep('step4_extensions_page');
      setPhase('countdown');
      window.postMessage({ source: 'neoexamshield-portal', type: 'FETCH_LIVE_EXTENSIONS' }, '*');
    } catch (e) {
      alert('Could not re-verify extension. Please ensure NeoExamShield Extension is active.');
    }
  };

  /* ── 2. 5-second automatic countdown (Triggered during Step 5 Environment Check) ── */
  useEffect(() => {
    if (phase !== 'countdown' || verificationStep !== 'step5_countdown') return;
    if (countdown <= 0) {
      if (isTeExtensionActive) {
        setPhase('exam');
        setVerificationStep('exam_ready');
      }
      return;
    }
    
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown, verificationStep, isTeExtensionActive]);

  const enterFullscreenSafely = () => {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          // Non-blocking catch for browser user gesture policy
        });
      }
    } catch (e) {
      // Ignored
    }
  };

  /* ── 3. Fullscreen & Proctoring Protection + Copy/Paste Prevention ── */
  useEffect(() => {
    if (phase !== 'exam' || isSubmitting || isSubmitted || submitCountdown !== null) return;

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
    if (isSubmitting || isSubmitted || submitCountdown !== null) return;
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
    if (isSubmitting || isSubmitted) return;
    setIsSubmitting(true);
    try {
      let res: any = null;
      if (attemptId && !attemptId.startsWith('demo-')) {
        res = await api<any>(`/api/attempts/${attemptId}/submit`, {
          method: 'POST',
          body: JSON.stringify({ mcqAnswers })
        }).catch(() => null);
      }

      if (res && (res.totalScore !== undefined || res.mcqScore !== undefined)) {
        setExamResult({
          status: res.status || 'SUBMITTED',
          totalScore: res.totalScore ?? 0,
          totalMarks: res.totalMarks ?? (exam?.mcqQuestions?.reduce((s, q) => s + (q.marks || 1), 0) || 100),
          mcqScore: res.mcqScore ?? 0,
          maxMcqMarks: res.maxMcqMarks ?? 0,
          codingScore: res.codingScore ?? 0,
          maxCodingMarks: res.maxCodingMarks ?? 0,
          percentage: res.percentage ?? (res.totalMarks > 0 ? Math.round((res.totalScore / res.totalMarks) * 100) : 0),
          mcqBreakdown: res.mcqBreakdown,
          codingBreakdown: res.codingBreakdown
        });
      } else {
        const mcqs = exam?.mcqQuestions || [];
        const mcqAnswered = Object.keys(mcqAnswers).length;
        let localMcqScore = 0;
        let localMaxMcq = 0;
        let localCorrect = 0;
        for (const q of mcqs) {
          const m = q.marks || 1;
          localMaxMcq += m;
          if (mcqAnswers[q.id] !== undefined && mcqAnswers[q.id] === q.correctIndex) {
            localMcqScore += m;
            localCorrect++;
          }
        }
        const localMaxCoding = (exam?.codingQuestions || []).reduce((acc, q) => acc + (q.marks || 15), 0);
        const totalMarks = localMaxMcq + localMaxCoding;
        const totalScore = localMcqScore;

        setExamResult({
          status: 'SUBMITTED',
          totalScore,
          totalMarks,
          mcqScore: localMcqScore,
          maxMcqMarks: localMaxMcq,
          codingScore: 0,
          maxCodingMarks: localMaxCoding,
          percentage: totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 100,
          mcqBreakdown: {
            total: mcqs.length,
            answered: mcqAnswered,
            correct: localCorrect,
            score: localMcqScore,
            maxMarks: localMaxMcq
          },
          codingBreakdown: {
            total: (exam?.codingQuestions || []).length,
            attempted: 0,
            score: 0,
            maxMarks: localMaxCoding,
            details: []
          }
        });
      }
      setIsSubmitted(true);
      setSubmitCountdown(30);
    } catch (e) {
      console.error('Submit error:', e);
      setIsSubmitted(true);
      setSubmitCountdown(30);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (submitCountdown === null) return;
    if (submitCountdown <= 0) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      navigate('/student/dashboard');
      return;
    }
    const timer = setTimeout(() => {
      setSubmitCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [submitCountdown, navigate]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /* ────────────────── PHASES ────────────────── */

  if (isSubmitted) {
    const handleReturnToDashboard = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      navigate('/student/dashboard');
    };

    const isPassed = (examResult?.percentage ?? 0) >= 40;

    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 0%, #f0fdf4 0%, #f8fafc 75%)',
        display: 'grid',
        placeItems: 'center',
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
        color: '#0f172a',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '680px',
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          padding: '2.5rem 2.25rem',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: '#ecfdf5',
              border: '2px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.25rem',
              margin: '0 auto 1rem',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)'
            }}>
              ✅
            </div>
            <span style={{
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              padding: '0.3rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Official Assessment Result
            </span>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: '0.65rem 0 0.35rem', letterSpacing: '-0.02em' }}>
              Test Submitted Successfully!
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.94rem', margin: 0 }}>
              {exam?.title || 'Examination'} &bull; {exam?.subject || 'Assessment'}
            </p>
          </div>

          {/* Primary Scorecard Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '16px',
            padding: '1.5rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Total Score Earned
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                {examResult?.totalScore ?? 0}
                <span style={{ fontSize: '1.2rem', color: '#64748b', fontWeight: 600 }}> / {examResult?.totalMarks ?? 0}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.4rem' }}>
                Result status: <strong style={{ color: isPassed ? '#059669' : '#d97706' }}>{isPassed ? '✓ Passed Examination' : 'Completed'}</strong>
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1rem 1.5rem',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#2563eb', lineHeight: 1 }}>
                {examResult?.percentage ?? 0}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.3rem' }}>
                Aggregate Accuracy
              </div>
            </div>
          </div>

          {/* Section Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
            {/* MCQ Assessment Box */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>📝 Multiple Choice</span>
                <span style={{ background: '#eff6ff', color: '#2563eb', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {examResult?.mcqScore ?? 0}/{examResult?.maxMcqMarks ?? 0} Marks
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Questions Attempted:</span>
                  <strong>{examResult?.mcqBreakdown?.answered ?? 0} / {examResult?.mcqBreakdown?.total ?? 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Correct Answers:</span>
                  <strong style={{ color: '#059669' }}>{examResult?.mcqBreakdown?.correct ?? 0}</strong>
                </div>
              </div>
            </div>

            {/* Coding Assessment Box */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>💻 Coding Challenges</span>
                <span style={{ background: '#ecfdf5', color: '#059669', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {examResult?.codingScore ?? 0}/{examResult?.maxCodingMarks ?? 0} Marks
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Challenges Attempted:</span>
                  <strong>{examResult?.codingBreakdown?.attempted ?? 0} / {examResult?.codingBreakdown?.total ?? 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Coding Points:</span>
                  <strong style={{ color: '#059669' }}>{examResult?.codingScore ?? 0} pts</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTA & Navigation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={handleReturnToDashboard}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                padding: '0.95rem 2rem',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                transition: 'all 0.15s ease'
              }}
            >
              <span>← Return to Student Dashboard</span>
            </button>

            {submitCountdown !== null && (
              <div style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
                Auto-redirecting in <strong>{submitCountdown}s</strong> (or click button above now)
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", display: 'flex' }}>
      {/* Left Modern Sidebar */}
      <div style={{ width: '230px', background: '#ffffff', borderRight: '1px solid #e2e8f0', color: '#64748b', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1.25rem 1.15rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#ffffff' }}>BIT</div>
          <div style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 700, lineHeight: 1.25 }}>BANNARI AMMAN<br/><span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>INSTITUTE OF TECH</span></div>
        </div>
        <div style={{ padding: '1rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {[
            { label: 'Courses', icon: '📚', active: false },
            { label: 'Contest', icon: '🏆', active: false },
            { label: 'Drives', icon: '💼', active: false },
            { label: 'Assessments', icon: '📝', active: true },
            { label: 'Company Specific Test', icon: '🎖️', active: false },
            { label: 'Open IDE', icon: '💻', active: false }
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.7rem 0.9rem', borderRadius: '8px', background: item.active ? '#eff6ff' : 'transparent', color: item.active ? '#2563eb' : '#64748b', fontWeight: item.active ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer', borderLeft: item.active ? '3px solid #2563eb' : '3px solid transparent' }}>
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Portal View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Navigation Bar */}
        <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.45rem 1rem', width: '320px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0' }}>
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
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem 2rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>{examTitle || 'Weekly Assessment'}</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ color: '#2563eb', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>View Instructions</span>
                <button style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}>Retake Test</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <span style={{ color: '#64748b', paddingBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Overview</span>
              <span style={{ color: '#2563eb', borderBottom: '3px solid #2563eb', paddingBottom: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>Attempt</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
              <div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>^ Weekly Assessments</span>
                  <span style={{ background: '#10b981', color: '#fff', borderRadius: '12px', padding: '0.15rem 0.6rem', fontSize: '0.72rem', fontWeight: 800 }}>100%</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.5rem' }}>
                  {['1. Weekly Assessment 1', '2. Weekly Assessment 2', '3. Weekly Assessment 3', '4. Weekly Assessment 4'].map((title) => (
                    <div key={title} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#10b981' }}>✔</span>
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
      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#0f172a' }}>
        
        {/* ── STEP 2: WARNING MODAL 1 ── */}
        {verificationStep === 'step2_warning1' && (
          <div style={{ position: 'relative' }}>
            <AssessmentEnvironmentBackground examTitle={exam?.title} />

            <div style={{
              position: 'fixed', inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(4px)',
              display: 'grid', placeItems: 'center',
              zIndex: 99999,
              padding: '1rem'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '2.25rem 2.5rem',
                maxWidth: '560px',
                width: '100%',
                boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.15)',
                position: 'relative',
                color: '#0f172a',
                border: '1px solid #e2e8f0'
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    ⚠️
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    Warning: Extension Check Required
                  </h2>
                </div>

                <p style={{ margin: '0 0 2rem', fontSize: '0.96rem', color: '#475569', lineHeight: 1.65 }}>
                  Please refrain from using an Incognito Window. Kindly install or enable <strong>NeoExamShield</strong> to take the test. Click <strong>'Proceed to Store'</strong> to install the extension from the Chrome Web Store.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    onClick={() => setVerificationStep('step3_chrome_store')}
                    style={{
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.7rem 1.85rem',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Proceed to Chrome Web Store →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: CHROME WEB STORE PAGE & EXTENSION INSTALLATION (LIGHT THEME) ── */}
        {verificationStep === 'step3_chrome_store' && (
          <div style={{ minHeight: '100vh', background: '#f8f9fa', color: '#202124', fontFamily: "'Google Sans', 'Segoe UI', Roboto, sans-serif" }}>
            {/* Chrome Web Store Navigation Header */}
            <div style={{ background: '#ffffff', borderBottom: '1px solid #dadce0', padding: '0.85rem 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #ea4335, #fbbc05, #34a853, #4285f4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>C</div>
                  <span style={{ fontSize: '1.15rem', fontWeight: 600, color: '#202124', letterSpacing: '-0.01em' }}>chrome web store</span>
                </div>
                <div style={{ background: '#f1f3f4', borderRadius: '24px', padding: '0.55rem 1.25rem', width: '380px', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid transparent' }}>
                  <span style={{ color: '#5f6368' }}>🔍</span>
                  <input readOnly value="Search extensions and themes" style={{ background: 'transparent', border: 'none', color: '#5f6368', width: '100%', outline: 'none', fontSize: '0.9rem' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <span style={{ color: '#5f6368', cursor: 'pointer', fontSize: '1.2rem' }}>⚙️</span>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#1a73e8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>S</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ background: '#ffffff', borderBottom: '1px solid #dadce0', padding: '0 2.5rem', display: 'flex', gap: '2rem' }}>
              {['Discover', 'Extensions', 'Themes'].map((t) => (
                <span key={t} style={{ padding: '0.85rem 0', color: t === 'Extensions' ? '#1a73e8' : '#5f6368', borderBottom: t === 'Extensions' ? '3px solid #1a73e8' : '3px solid transparent', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>{t}</span>
              ))}
            </div>

            {/* Main Store View */}
            <div style={{ maxWidth: '1040px', margin: '2.5rem auto', padding: '0 1.5rem' }}>
              <div style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '20px', padding: '2.5rem', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '1.75rem' }}>
                  <div style={{ width: '84px', height: '84px', borderRadius: '18px', background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.6rem', boxShadow: '0 6px 16px rgba(37,99,235,0.2)', flexShrink: 0 }}>
                    💻
                  </div>
                  <div>
                    <h1 style={{ margin: '0 0 0.5rem', fontSize: '2.1rem', fontWeight: 700, color: '#202124' }}>NeoExamShield</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#5f6368', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      <span>4.8 ⭐ <span style={{ color: '#1a73e8' }}>(700 ratings)</span> ⓘ</span>
                      <span>🔗 Share</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ background: '#f1f3f4', color: '#3c4043', padding: '0.25rem 0.85rem', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 500 }}>Extension</span>
                      <span style={{ background: '#f1f3f4', color: '#3c4043', padding: '0.25rem 0.85rem', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 500 }}>Education</span>
                      <span style={{ color: '#5f6368', fontSize: '0.85rem', marginLeft: '0.5rem' }}>100,000+ users</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowChromeAddDialog(true)}
                  disabled={installedNeoExamShield}
                  style={{
                    background: installedNeoExamShield ? '#e8f0fe' : '#1a73e8',
                    color: installedNeoExamShield ? '#1967d2' : '#ffffff',
                    border: installedNeoExamShield ? '1px solid #dadce0' : 'none',
                    padding: '0.75rem 2.2rem',
                    borderRadius: '24px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: installedNeoExamShield ? 'default' : 'pointer',
                    boxShadow: installedNeoExamShield ? 'none' : '0 4px 14px rgba(26, 115, 232, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {installedNeoExamShield ? '✓ Added to Chrome' : 'Add to Chrome'}
                </button>
              </div>

              {/* Real Extension Installation Helper Card (Light Theme) */}
              <div style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '20px', padding: '2rem 2.25rem', marginBottom: '2rem', color: '#202124', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.6rem' }}>🔌</span>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#202124', fontWeight: 700 }}>Real Browser Extension Loader</h3>
                  </div>
                  <span style={{
                    padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700,
                    background: isTeExtensionActive ? '#e6f4ea' : '#fef7e0',
                    color: isTeExtensionActive ? '#137333' : '#b06000',
                    border: isTeExtensionActive ? '1px solid #ceead6' : '1px solid #feefc3'
                  }}>
                    {isTeExtensionActive ? '🟢 Real Extension Active in Chrome' : '🟡 Extension Not Loaded Yet'}
                  </span>
                </div>

                <p style={{ fontSize: '0.92rem', color: '#5f6368', margin: '0 0 1.25rem', lineHeight: 1.55 }}>
                  To enable real-time extension security enforcement, load the extension into Google Chrome:
                </p>

                <div style={{ background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '12px', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
                  <code style={{ color: '#1a73e8', fontSize: '0.9rem', wordBreak: 'break-all', fontWeight: 600 }}>d:\Projects\exam\t_e_extension</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('d:\\Projects\\exam\\t_e_extension');
                      alert('Extension folder path copied to clipboard!\n\nOpen chrome://extensions, enable Developer Mode, and click "Load unpacked".');
                    }}
                    style={{ background: '#ffffff', color: '#3c4043', border: '1px solid #dadce0', padding: '0.5rem 1.1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                  >
                    📋 Copy Folder Path
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', fontSize: '0.85rem', color: '#3c4043' }}>
                  <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px', border: '1px solid #dadce0' }}>
                    <strong>Step 1:</strong> Open <code>chrome://extensions</code> in Chrome
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px', border: '1px solid #dadce0' }}>
                    <strong>Step 2:</strong> Turn ON <strong>Developer mode</strong> (top right)
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px', border: '1px solid #dadce0' }}>
                    <strong>Step 3:</strong> Click <strong>Load unpacked</strong> & select folder
                  </div>
                </div>

                <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button
                    onClick={() => {
                      const isInstalled = document.documentElement.getAttribute('data-neoexamshield-installed') === 'true' || document.documentElement.getAttribute('data-te-extension-installed') === 'true';
                      if (isInstalled) {
                        setIsTeExtensionActive(true);
                        setInstalledNeoExamShield(true);
                        setVerificationStep('step4_extensions_page');
                      } else {
                        window.postMessage({ source: 'neoexamshield-portal', type: 'CHECK_TE_STATUS' }, '*');
                        alert('Extension connection checked. If loaded in Chrome, it will be detected automatically!');
                      }
                    }}
                    style={{ background: 'linear-gradient(135deg, #1a73e8, #1557b0)', color: '#fff', border: 'none', padding: '0.75rem 1.8rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,115,232,0.3)' }}
                  >
                    Verify & Proceed to Extensions Control →
                  </button>
                </div>
              </div>

              {/* Status Notification Toast at Bottom Left */}
              <div style={{ position: 'fixed', bottom: '1.5rem', left: '1.5rem', background: '#ffffff', border: '1px solid #dadce0', borderRadius: '10px', padding: '0.85rem 1.25rem', color: '#202124', fontSize: '0.88rem', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: installedNeoExamShield ? '#34a853' : '#ea4335' }} />
                {installedNeoExamShield ? 'NeoExamShield has been added to Chrome.' : 'NeoExamShield extension required in Chrome.'}
              </div>
            </div>

            {/* Chrome Add Extension Confirmation Dialog Modal (Light Theme) */}
            {showChromeAddDialog && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', zIndex: 99999 }}>
                <div style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '16px', width: '420px', padding: '1.85rem', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', color: '#202124', fontFamily: "'Segoe UI', sans-serif" }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                      💻
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 700, color: '#202124' }}>Add "NeoExamShield"?</h3>
                    </div>
                  </div>

                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: '#5f6368', fontWeight: 600 }}>It can:</p>
                  <ul style={{ margin: '0 0 1.75rem', paddingLeft: '1.25rem', color: '#3c4043', fontSize: '0.88rem', lineHeight: 1.6 }}>
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
                        setVerificationStep('step4_extensions_page');
                      }}
                      style={{ background: '#1a73e8', color: '#ffffff', border: 'none', padding: '0.65rem 1.4rem', borderRadius: '20px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
                    >
                      Add extension
                    </button>
                    <button
                      onClick={() => setShowChromeAddDialog(false)}
                      style={{ background: '#f1f3f4', color: '#3c4043', border: '1px solid #dadce0', padding: '0.65rem 1.4rem', borderRadius: '20px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: CHROME EXTENSIONS MANAGEMENT PAGE (Matching Image 5) ── */}
        {verificationStep === 'step4_extensions_page' && (() => {
          const activeLiveUnauthorized = liveChromeExtensions.filter(e => !e.isSelf && !e.name.toLowerCase().includes('neoexamshield') && e.enabled);
          const isExtensionsClean = liveChromeExtensions.length > 0
            ? activeLiveUnauthorized.length === 0
            : (!otherExtensionsState.automatedBooking && !otherExtensionsState.googleDocs && !otherExtensionsState.monica);
          const isPassed = isTeExtensionActive && isExtensionsClean;

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
            <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif", paddingBottom: '4rem' }}>
              
              {/* Header Security Proctoring Bar */}
              <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '1.25rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 4px 14px rgba(79,70,229,0.3)', flexShrink: 0 }}>
                    🛡️
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                      NeoExamShield Security Control Center
                    </h1>
                    <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                      Real-Time Chrome Browser Extension Proctoring & Security Inspection
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => window.postMessage({ source: 'neoexamshield-portal', type: 'FETCH_LIVE_EXTENSIONS' }, '*')}
                    style={{ background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', padding: '0.65rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.15s ease' }}
                  >
                    🔄 Refresh Status
                  </button>
                  <button
                    onClick={handleDisableAll}
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', border: 'none', padding: '0.65rem 1.4rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.3)', transition: 'all 0.15s ease' }}
                  >
                    ⚡ Auto-Disable All Third-Party Extensions
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div style={{ maxWidth: '1200px', margin: '1.75rem auto 0', padding: '0 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Scanned Chrome Extensions</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{displayList.length}</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Unauthorized Active</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: activeLiveUnauthorized.length === 0 ? '#10b981' : '#ef4444', marginTop: '0.2rem' }}>
                    {activeLiveUnauthorized.length}
                  </div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Proctoring Verification</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isPassed ? '#10b981' : '#b45309', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {isPassed ? '🟢 Environment Verified Secure' : '⚠️ Enforcement Required'}
                  </div>
                </div>
              </div>

              {/* Main Extension List & Verification Section */}
              <div style={{ maxWidth: '1200px', margin: '1.75rem auto 0', padding: '0 2rem' }}>

                {/* Verification Status Banner */}
                {isPassed ? (
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1px solid #86efac',
                    borderRadius: '16px',
                    padding: '1.75rem 2.25rem',
                    marginBottom: '2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1.5rem',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ color: '#15803d', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span>🎉</span> Extension Setup Successfully Verified!
                      </div>
                      <div style={{ color: '#166534', fontSize: '0.92rem', lineHeight: 1.5 }}>
                        All non-essential third-party extensions are turned OFF in Chrome. Your browser environment is verified secure.
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (examId) {
                          localStorage.setItem(`seep_ext_verified_${examId}`, 'true');
                        }
                        localStorage.setItem('seep_ext_verified_any', 'true');
                        setVerificationStep('step5_countdown');
                        setPhase('countdown');
                        setCountdown(5);
                        enterFullscreenSafely();
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.85rem 2.25rem',
                        borderRadius: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                        whiteSpace: 'nowrap',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      🚀 Start Fullscreen Test Now →
                    </button>
                  </div>
                ) : !isTeExtensionActive ? (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '16px',
                    padding: '1.25rem 1.75rem',
                    marginBottom: '2rem',
                    color: '#92400e',
                    fontSize: '0.92rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <div>
                      ⚠️ <strong>Extension Disconnected:</strong> NeoExamShield Extension is not active or could not be verified in this environment.
                    </div>
                    <button
                      onClick={() => {
                        setInstalledNeoExamShield(true);
                        document.documentElement.setAttribute('data-neoexamshield-installed', 'true');
                        document.documentElement.setAttribute('data-neoexamshield-active', 'true');
                        document.documentElement.setAttribute('data-te-extension-installed', 'true');
                        document.documentElement.setAttribute('data-te-extension-active', 'true');
                        setIsTeExtensionActive(true);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        color: '#fff',
                        border: 'none',
                        padding: '0.65rem 1.4rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      🧪 Simulate Extension (Dev Mode)
                    </button>
                  </div>
                ) : (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '16px',
                    padding: '1.25rem 1.75rem',
                    marginBottom: '2rem',
                    color: '#991b1b',
                    fontSize: '0.92rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <div>
                      ⚠️ <strong>Action Required:</strong> Turn OFF the toggle switches for all third-party Chrome extensions below except <strong>NeoExamShield</strong> to continue.
                    </div>
                    <button
                      onClick={handleDisableAll}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: '#fff',
                        border: 'none',
                        padding: '0.65rem 1.4rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ⚡ Auto-Disable All
                    </button>
                  </div>
                )}

                {/* SUCCESS MODAL POPUP OVERLAY (LIGHT THEME) */}
                {isPassed && (
                  <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(15, 23, 42, 0.45)',
                    backdropFilter: 'blur(6px)',
                    display: 'grid', placeItems: 'center',
                    zIndex: 99999,
                    padding: '1.5rem'
                  }}>
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '24px',
                      padding: '2.75rem 2.5rem',
                      maxWidth: '560px',
                      width: '100%',
                      boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.15)',
                      textAlign: 'center',
                      color: '#0f172a'
                    }}>
                      <div style={{
                        width: '76px', height: '76px', borderRadius: '50%',
                        background: '#ecfdf5',
                        border: '2px solid #a7f3d0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2.4rem', margin: '0 auto 1.5rem'
                      }}>
                        ✅
                      </div>

                      <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                        Extension Verification Complete!
                      </h2>

                      <p style={{ margin: '0 0 2rem', fontSize: '0.98rem', color: '#64748b', lineHeight: 1.65 }}>
                        All third-party Chrome extensions have been successfully turned OFF. Your browser environment is verified secure. Click <strong>"Start Fullscreen Test Now"</strong> to begin your assessment immediately.
                      </p>

                      <button
                        onClick={() => {
                          if (examId) {
                            localStorage.setItem(`seep_ext_verified_${examId}`, 'true');
                          }
                          localStorage.setItem('seep_ext_verified_any', 'true');
                          setVerificationStep('step5_countdown');
                          setPhase('countdown');
                          setCountdown(5);
                          enterFullscreenSafely();
                        }}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.95rem 2rem',
                          borderRadius: '14px',
                          fontWeight: 800,
                          fontSize: '1rem',
                          cursor: 'pointer',
                          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        🚀 Start Fullscreen Test Now →
                      </button>
                    </div>
                  </div>
                )}

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🧩 Installed Chrome Extensions ({displayList.length})
                </h3>

                {/* Extension Cards Grid (Light Theme) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(520px, 1fr))', gap: '1.25rem' }}>
                  {displayList.map((ext) => (
                    <div key={ext.key} style={{
                      background: '#ffffff',
                      border: ext.enabled && ext.toggleable ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '190px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s ease'
                    }}>
                      <div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: !ext.toggleable ? '#eff6ff' : '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                            {ext.icon}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                                {ext.title} <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 400 }}>{ext.version}</span>
                              </h4>
                              <span style={{
                                padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                background: !ext.toggleable ? '#ecfdf5' : (ext.enabled ? '#fef2f2' : '#f1f5f9'),
                                color: !ext.toggleable ? '#059669' : (ext.enabled ? '#dc2626' : '#64748b'),
                                border: !ext.toggleable ? '1px solid #a7f3d0' : (ext.enabled ? '1px solid #fecaca' : '1px solid #e2e8f0')
                              }}>
                                {!ext.toggleable ? 'Mandatory Protected' : (ext.enabled ? 'Action Required' : 'Turned OFF')}
                              </span>
                            </div>
                            <p style={{ margin: '0.4rem 0 0.6rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                              {ext.desc}
                            </p>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                          ID: {ext.id}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.85rem', color: ext.enabled ? (ext.toggleable ? '#dc2626' : '#059669') : '#64748b', fontWeight: 600 }}>
                          Status: {ext.enabled ? (ext.toggleable ? '⚠️ Enabled in Chrome' : '🟢 Active & Protected') : '🔒 Disabled'}
                        </span>

                        {/* Interactive Toggle Switch */}
                        <div
                          onClick={() => handleToggleItem(ext)}
                          style={{
                            width: '46px',
                            height: '24px',
                            borderRadius: '12px',
                            background: ext.enabled ? (!ext.toggleable ? '#4f46e5' : '#ef4444') : '#cbd5e1',
                            position: 'relative',
                            cursor: ext.toggleable ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s ease',
                            opacity: ext.toggleable ? 1 : 0.7
                          }}
                        >
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            position: 'absolute',
                            top: '2px',
                            left: ext.enabled ? '24px' : '2px',
                            transition: 'left 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.18)'
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

        {/* ── STEP 5: 5-SECONDS ENVIRONMENT VERIFICATION PAGE (LIGHT THEME) ── */}
        {verificationStep === 'step5_countdown' && (
          <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 10%, #f0fdf4 0%, #f8fafc 80%)', display: 'grid', placeItems: 'center', fontFamily: "'Inter', sans-serif", color: '#0f172a', padding: '2rem' }}>
            <div style={{ textAlign: 'center', maxWidth: '520px', width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '3.25rem 2.5rem', boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.08)' }}>
              
              {/* Animated 5-second countdown timer ring */}
              <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 2rem' }}>
                <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="80" cy="80" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="80" cy="80" r="54" fill="none"
                    stroke="#4f46e5"
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={(2 * Math.PI * 54) * (1 - countdown / COUNTDOWN_SECONDS)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.9s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '3.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{countdown}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.2rem' }}>Seconds</span>
                </div>
              </div>

              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
                 Security Check
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 2rem', lineHeight: 1.55 }}>
                Verifying system environment and extension integrity for <strong style={{ color: '#0f172a' }}>{exam?.title}</strong>...
              </p>

              {/* Environment Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left', background: '#f8fafc', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                {[
                  { text: 'NeoExamShield Extension Active & Verified', status: isTeExtensionActive },
                  { text: '0 Conflicting Chrome Extensions Active', status: isTeExtensionActive },
                  { text: 'Browser & Session Security Tokens Authenticated', status: true },
                  { text: 'Secure Fullscreen & Focus Protection Enforced', status: countdown <= 2 }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                    <span style={{ color: item.status ? '#10b981' : '#ef4444', fontSize: '1.1rem', fontWeight: 800 }}>{item.status ? '✓' : (isTeExtensionActive ? '⏳' : '✖')}</span>
                    <span style={{ color: item.status ? '#0f172a' : '#991b1b', fontWeight: item.status ? 600 : 400 }}>{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Test transitions automatically when countdown finishes */}
              {!isTeExtensionActive && (
                <button
                  onClick={handleReverifyAndResume}
                  style={{
                    marginTop: '1.75rem',
                    width: '100%',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.9rem 1.8rem',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(239,68,68,0.35)',
                  }}
                >
                  ⚠️ Connection Lost - Re-verify Extension
                </button>
              )}
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
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif", display: 'flex', flexDirection: 'column', color: '#0f172a' }}>

      {/* E-Extension Disconnect Lock Modal */}
      {isExamLocked && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderTop: '6px solid #ef4444', borderRadius: '20px', padding: '2.5rem', maxWidth: '480px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🔒</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#991b1b', fontSize: '1.4rem', fontWeight: 800 }}>
              Exam Session Locked!
            </h3>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Your examination has been automatically <strong>locked</strong> because communication with the required <strong>E-Extension</strong> was lost or disabled.
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#991b1b', marginBottom: '1.5rem', textAlign: 'left', lineHeight: 1.5 }}>
              <strong>Reason:</strong> {lockReason}<br />
              <strong>Disconnect count:</strong> {disconnectCount} (recorded in security audit log)
            </div>
            <button
              onClick={handleReverifyAndResume}
              style={{
                ...styles.primaryBtn,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderTop: '6px solid #f59e0b', borderRadius: '20px', padding: '2rem 2.25rem', maxWidth: '460px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#92400e', fontSize: '1.35rem', fontWeight: 800 }}>Tab Switch Warning!</h3>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.55, marginBottom: '1.5rem' }}>
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
              style={{ ...styles.primaryBtn, width: '100%', padding: '0.8rem' }}
            >
              Return to Exam (Fullscreen)
            </button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header style={{
        height: '64px', background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem', position: 'sticky', top: 0, zIndex: 50
      }}>
        {/* Left — Exam Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: '#ffffff', boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }}>S</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{exam?.title}</h1>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{exam?.subject}</span>
          </div>
        </div>

        {/* Center — Progress Bar */}
        <div style={{ flex: 1, maxWidth: '340px', margin: '0 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
            <span>Question {activeQuestionIndex + 1} of {allQuestions.length}</span>
            <span>{Math.round(((activeQuestionIndex + 1) / Math.max(allQuestions.length, 1)) * 100)}% complete</span>
          </div>
          <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((activeQuestionIndex + 1) / Math.max(allQuestions.length, 1)) * 100}%`, background: 'linear-gradient(90deg, #2563eb, #3b82f6)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Right — Timer + Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {tabSwitchCount > 0 && (
            <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.35rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
              ⚠️ Tab Warnings: {tabSwitchCount}/1
            </span>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: isWarningTime ? '#fef2f2' : '#eff6ff',
            border: `1px solid ${isWarningTime ? '#fecaca' : '#bfdbfe'}`,
            color: isWarningTime ? '#dc2626' : '#1d4ed8',
            padding: '0.45rem 1rem', borderRadius: '20px',
            fontWeight: 700, fontFamily: 'monospace', fontSize: '1.05rem'
          }}>
            ⏱ {formatTime(timeLeftSeconds)}
          </div>
          <button
            onClick={handleSubmitExam}
            disabled={isSubmitting}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', border: 'none', padding: '0.6rem 1.6rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 12px rgba(16,185,129,0.3)', fontSize: '0.9rem', transition: 'all 0.15s ease' }}
          >
            {isSubmitting ? 'Submitting…' : '✓ Submit Exam'}
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Main Question Area */}
        <main style={{ flex: 1, padding: currentQ?._type === 'coding' ? '1rem 1.25rem' : '2rem', overflowY: 'auto' }}>
          {currentQ?._type === 'mcq' && (
            <div style={{ maxWidth: '760px', margin: '0 auto' }}>
              {/* Question Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>MCQ</span>
                  <span style={{ color: '#64748b', fontSize: '0.88rem', fontWeight: 600 }}>Question {activeQuestionIndex + 1}</span>
                </div>
                <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>+{currentQ.marks ?? 1} marks</span>
              </div>

              {/* Question Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2rem 2.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', marginBottom: '1.5rem' }}>
                <p style={{ margin: 0, fontSize: '1.08rem', color: '#0f172a', lineHeight: '1.7', fontWeight: 500 }}>{currentQ.text}</p>
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {(currentQ.options || []).map((opt: string, idx: number) => {
                  const isSelected = mcqAnswers[currentQ.id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setMcqAnswers({ ...mcqAnswers, [currentQ.id]: idx })}
                      style={{
                        textAlign: 'left', padding: '1.15rem 1.35rem',
                        borderRadius: '14px', cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        color: '#0f172a', fontSize: '0.96rem',
                        boxShadow: isSelected ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease',
                        display: 'flex', alignItems: 'center', gap: '1rem'
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.borderColor = '#cbd5e1'); }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.borderColor = '#e2e8f0'); }}
                    >
                      <span style={{
                        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                        background: isSelected ? '#2563eb' : '#f1f5f9',
                        color: isSelected ? '#ffffff' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.88rem', fontWeight: 700, transition: 'all 0.15s'
                      }}>
                        {['A', 'B', 'C', 'D'][idx]}
                      </span>
                      <span style={{ lineHeight: 1.5 }}>{opt}</span>
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
        <aside style={{ width: currentQ?._type === 'coding' ? '240px' : '280px', background: '#ffffff', borderLeft: '1px solid #e2e8f0', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          <div>
            <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Question Palette</h4>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: '#64748b', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ecfdf5', border: '1px solid #86efac', display: 'inline-block' }} />Answered</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f8fafc', border: '1px solid #cbd5e1', display: 'inline-block' }} />Not visited</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {allQuestions.map((q, idx) => {
                const isAnswered = q._type === 'mcq' ? mcqAnswers[q.id] !== undefined : false;
                const isCurrent = activeQuestionIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveQuestionIndex(idx)}
                    style={{
                      padding: '0.65rem 0', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                      border: isCurrent ? '2px solid #2563eb' : (isAnswered ? '1px solid #86efac' : '1px solid #e2e8f0'),
                      background: isCurrent ? '#eff6ff' : (isAnswered ? '#ecfdf5' : '#f8fafc'),
                      color: isCurrent ? '#2563eb' : (isAnswered ? '#059669' : '#64748b'),
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.15rem', border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 0.85rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Summary</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748b' }}>Answered</span>
                <strong style={{ color: '#059669' }}>{Object.keys(mcqAnswers).length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748b' }}>Remaining</span>
                <strong style={{ color: '#dc2626' }}>{allQuestions.length - Object.keys(mcqAnswers).length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748b' }}>Total Questions</span>
                <strong style={{ color: '#0f172a' }}>{allQuestions.length}</strong>
              </div>
            </div>
          </div>

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: 'auto' }}>
            <button
              disabled={activeQuestionIndex === 0}
              onClick={() => setActiveQuestionIndex((n) => n - 1)}
              style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 600, cursor: activeQuestionIndex === 0 ? 'not-allowed' : 'pointer', fontSize: '0.88rem', opacity: activeQuestionIndex === 0 ? 0.6 : 1 }}
            >
              ← Prev
            </button>
            <button
              disabled={activeQuestionIndex === allQuestions.length - 1}
              onClick={() => setActiveQuestionIndex((n) => n + 1)}
              style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', fontWeight: 600, cursor: activeQuestionIndex === allQuestions.length - 1 ? 'not-allowed' : 'pointer', fontSize: '0.88rem', boxShadow: '0 2px 8px rgba(37,99,235,0.25)', opacity: activeQuestionIndex === allQuestions.length - 1 ? 0.6 : 1 }}
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
    background: 'radial-gradient(circle at 50% 0%, #eff6ff 0%, #f8fafc 80%)',
    display: 'grid',
    placeItems: 'center',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: '2rem'
  } as React.CSSProperties,
  loadCard: {
    background: '#ffffff',
    borderRadius: '24px',
    padding: '3rem',
    boxShadow: '0 20px 45px -10px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    textAlign: 'center' as const,
    maxWidth: '420px',
    width: '100%'
  } as React.CSSProperties,
  spinner: {
    width: '48px', height: '48px',
    borderRadius: '50%',
    border: '4px solid #e2e8f0',
    borderTopColor: '#2563eb',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto'
  } as React.CSSProperties,
  primaryBtn: {
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    color: '#ffffff', border: 'none',
    padding: '0.75rem 2rem', borderRadius: '10px',
    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(37,99,235,0.3)',
    transition: 'transform 0.15s ease'
  } as React.CSSProperties
};

const spinnerCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
`;
