import { useEffect, useState, useRef } from 'react';
import api from '../api/client';
import { Trash2, Key, UserPlus, Shield, User as UserIcon, ArrowLeft, ChevronDown, Check } from 'lucide-react';
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
  const [, setLoading] = useState(true);

  // NEW: Track which user's dropdown is open
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Click outside handler to close menus
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ... (keep fetchUsers and useEffect) ...

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
  useEffect(() => {
    // If user is not logged in OR not an admin, kick them out
    if (user && user.role !== 'admin') {
      alert("Access Denied: Admins only.");
      navigate('/');
    }
  }, [user, navigate]);

  // ... (keep handleCreateUser, handleDelete, handleResetPassword) ...

  const handleCreateUser = async () => {
    const username = prompt("Enter Username:");
    if (!username) return;
    const password = prompt("Enter Password:");
    if (!password) return;
    const isAdmin = confirm("Should this user be an Admin?");
    try {
      await api.post('/admin/users', { username, password, role: isAdmin ? 'admin' : 'user' });
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

  // NEW: Update Role Logic
  const handleSetRole = async (id: number, newRole: string) => {
    try {
      await api.patch(`/admin/users/${id}/role`, { role: newRole });

      // Update local state
      setUsers(prev => prev.map(u =>
        u.ID === id ? { ...u, role: newRole } : u
      ));
      setOpenMenuId(null); // Close menu
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to update role");
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 w-full max-w-5xl mx-auto">
      {/* ... (Header remains same) ... */}
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

      <div className="bg-surface rounded-lg shadow-xl border border-gray-700 overflow-visible" style={{ minHeight: '300px' }}>
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
            {users.map(u => {
              // 1. Check if this row is the current admin
              const isCurrentUser = user?.id === u.ID;

              return (
                <tr key={u.ID} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-gray-500 font-mono text-sm">#{u.ID}</td>
                  <td className="p-4 font-bold flex items-center gap-2">
                    <UserIcon size={16} className="text-gray-500" />
                    {u.username}
                    {/* Optional: Add a visual indicator */}
                    {isCurrentUser && <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 rounded ml-2">YOU</span>}
                  </td>

                  {/* UPDATED ROLE COLUMN */}
                  <td className="p-4 relative">
                    <button
                      // 2. Disable click if it's the current user
                      disabled={isCurrentUser}
                      onClick={() => setOpenMenuId(openMenuId === u.ID ? null : u.ID)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase border transition-all ${
                        u.role === 'admin'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      } ${
                        // 3. Styling changes for enabled vs disabled
                        !isCurrentUser
                          ? 'hover:bg-opacity-20 cursor-pointer'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {u.role}
                      {/* 4. Only show Chevron if actionable */}
                      {!isCurrentUser && <ChevronDown size={12} />}
                    </button>

                    {/* POPUP MENU (Only renders if openMenuId matches) */}
                    {openMenuId === u.ID && !isCurrentUser && (
                      <div ref={menuRef} className="absolute left-4 top-12 z-50 w-32 rounded-lg border border-gray-600 bg-surface p-1 shadow-xl">
                        <div className="text-[10px] uppercase text-gray-500 px-2 py-1 font-bold tracking-wider">Set Role</div>

                        <button
                          onClick={() => handleSetRole(u.ID, 'user')}
                          className={`flex w-full items-center justify-between rounded px-2 py-2 text-sm text-left hover:bg-white/10 ${u.role === 'user' ? 'text-blue-400' : 'text-gray-300'}`}
                        >
                          User {u.role === 'user' && <Check size={14} />}
                        </button>

                        <button
                          onClick={() => handleSetRole(u.ID, 'admin')}
                          className={`flex w-full items-center justify-between rounded px-2 py-2 text-sm text-left hover:bg-white/10 ${u.role === 'admin' ? 'text-red-400' : 'text-gray-300'}`}
                        >
                          Admin {u.role === 'admin' && <Check size={14} />}
                        </button>
                      </div>
                    )}
                  </td>

                  {/* ... actions ... */}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
