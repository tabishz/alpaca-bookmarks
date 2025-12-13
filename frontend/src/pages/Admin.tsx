import { useEffect, useState } from 'react';
import api from '../api/client';
import { Trash2, Key, UserPlus, Shield, User as UserIcon, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface UserData {
  ID: number;
  username: string;
  role: string;
  created_at: string;
}

export const Admin = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'admin') {
      alert("Access Denied");
      navigate('/');
    }
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await api.get<UserData[]>('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreateUser = async () => {
    const username = prompt("Enter Username:");
    if (!username) return;
    const password = prompt("Enter Password:");
    if (!password) return;
    const isAdmin = confirm("Should this user be an Admin?");

    try {
      await api.post('/admin/users', {
        username,
        password,
        role: isAdmin ? 'admin' : 'user'
      });
      alert("User created");
      fetchUsers();
    } catch (error) {
      alert("Failed to create user");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure? This deletes the user and ALL their bookmarks.")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.ID !== id));
    } catch (error) {
      alert("Failed to delete");
    }
  };

  const handleResetPassword = async (id: number) => {
    const newPass = prompt("Enter new password:");
    if (!newPass) return;
    try {
      await api.patch(`/admin/users/${id}/reset-password`, { password: newPass });
      alert("Password reset successfully");
    } catch (error) {
      alert("Failed to reset password");
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <Link to="/" className="p-2 rounded-full hover:bg-gray-700 text-gray-400">
                <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="text-primary" /> Admin Console
            </h1>
        </div>
        <button
          onClick={handleCreateUser}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded hover:opacity-90"
        >
          <UserPlus size={18} /> Add User
        </button>
      </div>

      <div className="bg-surface rounded-lg shadow-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-black/20 text-gray-400 uppercase text-xs">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Username</th>
              <th className="p-4">Role</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.map(u => (
              <tr key={u.ID} className="hover:bg-white/5 transition-colors">
                <td className="p-4 text-gray-500 font-mono text-sm">#{u.ID}</td>
                <td className="p-4 font-bold flex items-center gap-2">
                  <UserIcon size={16} className="text-gray-500" /> {u.username}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-right flex justify-end gap-3">
                  <button onClick={() => handleResetPassword(u.ID)} className="text-gray-400 hover:text-white" title="Reset Password">
                    <Key size={18} />
                  </button>
                  <button onClick={() => handleDelete(u.ID)} className="text-gray-400 hover:text-red-500" title="Delete User">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">No users found.</div>
        )}
      </div>
    </div>
  );
};
