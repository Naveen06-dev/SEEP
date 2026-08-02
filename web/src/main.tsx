import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ExamCreationWizard } from './components/ExamCreationWizard';
import { TeacherCodingAnalytics } from './components/TeacherCodingAnalytics';
import './styles.css';

function Home() {
  return (
    <div className="page">
      <h1>SEEP Platform</h1>
      <p>Smart Examination & Evaluation with MCQ + Coding modules</p>
      <nav className="nav-links">
        <Link to="/teacher/exams/new">Create Exam (Wizard)</Link>
        <Link to="/teacher/analytics/demo">Coding Analytics</Link>
        <a href="http://localhost:3000" target="_blank" rel="noreferrer">Legacy Prototype</a>
      </nav>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/teacher/exams/new" element={<ExamCreationWizard creatorId="teacher-1" />} />
        <Route path="/teacher/analytics/:examId" element={<TeacherCodingAnalytics examId="" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
