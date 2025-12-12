import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token);
      navigate('/'); // Redirect to dashboard
    } catch (err: any) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-surface p-8 shadow-lg">
        <h2 className="mb-6 text-2xl font-bold text-center">Bookmark Manager</h2>

        {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}

        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Username</label>
          <input
            className="w-full rounded border p-2 text-black"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">Password</label>
          <input
            type="password"
            className="w-full rounded border p-2 text-black"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="w-full rounded bg-primary py-2 font-bold text-white hover:opacity-90">
          Login
        </button>
      </form>
    </div>
  );
};
