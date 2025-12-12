import React from 'react'; // Ensure React is imported
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { useAuthStore } from './store/authStore';
import { Dashboard } from './pages/Dashboard';

// Change "JSX.Element" to "React.ReactNode"
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-text" data-theme="dracula">
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <div className="p-10">
                <h1 className="text-3xl">Welcome to your Bookmarks!</h1>
                <p>Phase 7 will load your links here.</p>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
