import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { useAuthStore } from './store/authStore';
import { useSystemStore } from './store/systemStore';
import { Admin } from './pages/Admin';
import { FavoritesDashboard } from './pages/FavoritesDashboard';
import { TodoListPage } from './pages/TodoListPage';
import { KanbanPage } from './pages/KanbanPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const fetchConfig = useSystemStore(state => state.fetchConfig);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConfig();
    }
    const savedOpacity = localStorage.getItem('tile_opacity');
    if (savedOpacity) {
      const parsed = parseFloat(savedOpacity);
      const pct = !isNaN(parsed) ? (parsed <= 1 ? `${Math.round(parsed * 100)}%` : `${Math.round(parsed)}%`) : '100%';
      document.documentElement.style.setProperty('--tile-opacity', pct);
    } else {
      document.documentElement.style.setProperty('--tile-opacity', '100%');
    }
  }, [isAuthenticated, fetchConfig]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-text" data-theme="dracula">
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/favorites" element={
            <ProtectedRoute>
              <FavoritesDashboard />
            </ProtectedRoute>
          } />
          <Route path="/todos" element={
            <ProtectedRoute>
              <TodoListPage />
            </ProtectedRoute>
          } />
          <Route path="/kanban" element={
            <ProtectedRoute>
              <KanbanPage />
            </ProtectedRoute>
          } />
          <Route path="/kanban/:boardId" element={
            <ProtectedRoute>
              <KanbanPage />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;