import React, { useState } from 'react';
import AppShell from './AppShell';
import StudentDashboard from './StudentDashboard';
import SecurityControlCenter from './SecurityControlCenter';
import EnvironmentVerification from './EnvironmentVerification';
import ExamPlayer from './ExamPlayer';

export function NeoStudentApp() {
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [currentExam, setCurrentExam] = useState(null);

  const handleStartExam = (exam: any) => {
    setCurrentExam(exam);
    setActiveRoute('verification');
  };

  return (
    <AppShell activeRoute={activeRoute} setActiveRoute={setActiveRoute}>
      {activeRoute === 'dashboard' && (
        <StudentDashboard onStartExam={handleStartExam} />
      )}
      {activeRoute === 'security-center' && (
        <SecurityControlCenter />
      )}
      {activeRoute === 'verification' && (
        <EnvironmentVerification onVerificationComplete={() => setActiveRoute('exam-player')} />
      )}
      {activeRoute === 'exam-player' && (
        <ExamPlayer exam={currentExam} />
      )}
    </AppShell>
  );
}
