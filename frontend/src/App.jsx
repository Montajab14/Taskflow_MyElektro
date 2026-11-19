import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import TaskListPage from './pages/TaskListPage';
import TaskDetailPage from './pages/TaskDetailPage';
import TaskFormPage from './pages/TaskFormPage';
import HabitsPage from './pages/HabitsPage';
import ActivityPage from './pages/ActivityPage';

/** Routes protégées : sans session on est renvoyé vers /login ; connecté, /login renvoie vers /tasks. */
function Protected({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function NotFound() {
  return (
    <div className="panel">
      <p>Page introuvable</p>
      <a href="#/tasks">Retour aux étapes</a>
    </div>
  );
}

export default function App() {
  const { isLoggedIn } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/tasks" replace /> : <AuthPage />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Navigate to="/tasks" replace />} />
        <Route path="tasks" element={<TaskListPage />} />
        <Route path="tasks/new" element={<TaskFormPage />} />
        <Route path="tasks/:id" element={<TaskDetailPage />} />
        <Route path="tasks/:id/edit" element={<TaskFormPage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
