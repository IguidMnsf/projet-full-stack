import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { PageLoading } from './components/ui.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Quizzes from './pages/Quizzes.jsx';
import QuizEditor from './pages/QuizEditor.jsx';
import QuizPlayer from './pages/QuizPlayer.jsx';
import Scores from './pages/Scores.jsx';
import Students from './pages/Students.jsx';
import Settings from './pages/Settings.jsx';

function Protected({ children, professorOnly }) {
  const { user, booting, isProfessor } = useAuth();
  const location = useLocation();
  if (booting) return <PageLoading />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (professorOnly && !isProfessor) return <Navigate to="/" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, booting } = useAuth();
  if (booting) return <PageLoading />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      <Route element={<Protected><DashboardLayout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="quizzes" element={<Quizzes />} />
        <Route path="quizzes/new" element={<QuizEditor mode="create" />} />
        <Route path="quizzes/:id/edit" element={<QuizEditor mode="edit" />} />
        <Route path="quizzes/:id/play" element={<QuizPlayer />} />
        <Route path="scores" element={<Scores />} />
        <Route path="students" element={<Protected professorOnly><Students /></Protected>} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
