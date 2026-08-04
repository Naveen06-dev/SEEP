import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Login } from './components/Login';
import { ExamCreationWizard } from './components/ExamCreationWizard';
import { TeacherCodingAnalytics } from './components/TeacherCodingAnalytics';
import './styles.css';

function Home() {
  return <Login />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/teacher/exams/new" element={<ExamCreationWizard creatorId="teacher-1" />} />
        <Route path="/teacher/analytics/:examId" element={<TeacherCodingAnalytics examId="" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

