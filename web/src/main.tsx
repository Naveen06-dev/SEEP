import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { StudentDashboard } from './components/StudentDashboard';
import { StudentExamPlayer } from './components/StudentExamPlayer';
import { TeacherLayout } from './components/teacher/TeacherLayout';
import { TeacherProfile } from './components/teacher/TeacherProfile';
import { AddQuestionPaper } from './components/teacher/AddQuestionPaper';
import { QuestionPapersList } from './components/teacher/QuestionPapersList';
import { StudentResults } from './components/teacher/StudentResults';
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

        {/* Student Routes */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/exam/:examId" element={<StudentExamPlayer />} />

        {/* Teacher Dashboard Nested Routes */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<Navigate to="/teacher/profile" replace />} />
          <Route path="profile" element={<TeacherProfile />} />
          <Route path="exams/new" element={<AddQuestionPaper />} />
          <Route path="exams" element={<QuestionPapersList />} />
          <Route path="exams/:id/edit" element={<QuestionPapersList />} />
          <Route path="results" element={<StudentResults />} />
          <Route path="analytics/:examId" element={<TeacherCodingAnalytics examId="" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

