import React, { useState, useEffect } from 'react';
import { X, Save, Palette, Lock, Check, AlertCircle } from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import api from '../api/client'; // Import API client

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentLimit: number;
  currentTheme: Theme;
  currentTileSize: number;
  onSave: (newLimit: number, newTheme: Theme, newTileSize: number) => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, currentLimit, currentTheme, currentTileSize, onSave }) => {
  const [limit, setLimit] = useState(50);
  const [selectedTheme, setSelectedTheme] = useState<Theme>('dracula');
  const [tileSize, setTileSize] = useState(280);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    setLimit(currentLimit);
    setSelectedTheme(currentTheme);
    setTileSize(currentTileSize);
    // Reset password form on open
    if (isOpen) {
      setShowPasswordForm(false);
      setPassMessage(null);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    }
  }, [currentLimit, currentTheme, currentTileSize, isOpen]);

  if (!isOpen) return null;

  const handleMainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(limit, selectedTheme, tileSize);
    onClose();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);
    if (newPass !== confirmPass) {
      setPassMessage({ type: 'error', text: "New passwords do not match" });
      return;
    }

    try {
      await api.patch('/user/password', {
        currentPassword: currentPass,
        newPassword: newPass
      });
      setPassMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPass('');
      setNewPass('');
      // Optional: Close form after delay
      setTimeout(() => setShowPasswordForm(false), 2000);
    } catch (error: any) {
      setPassMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update password' });
    }
  };

  // ... (Keep existing themes array) ...
  const themes: { id: Theme; name: string; color: string }[] = [
    { id: 'dracula', name: 'Dracula', color: '#bd93f9' },
    { id: 'andromeda', name: 'Andromeda', color: '#00E8C6' },
    { id: 'github-dark', name: 'GitHub Dark', color: '#58a6ff' },
    { id: 'synthwave', name: 'SynthWave', color: '#ff7edb' },
    { id: 'cute-pink', name: 'Cute Pink', color: '#ff69b4' },
    { id: 'snazzy-light', name: 'Snazzy Light', color: '#287bde' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 border border-gray-700/50 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-text hover:opacity-70">
          <X size={24} />
        </button>

        <h2 className="mb-6 text-2xl font-bold flex items-center gap-2 text-text">
          <Palette size={24} className="text-primary" /> Settings
        </h2>

        {/* --- MAIN SETTINGS FORM --- */}
        <form onSubmit={handleMainSubmit} className="space-y-6">

          {/* Theme Selector */}
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-400 uppercase tracking-wider">Theme</label>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTheme(t.id)}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${selectedTheme === t.id
                    ? 'border-primary bg-primary/20 text-primary ring-1 ring-primary'
                    : 'border-gray-500/30 hover:border-primary/50 hover:bg-white/5 text-text'
                    }`}
                >
                  <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: t.color }}></div>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-600/30"></div>

          {/* Sliders (Limit & Tile Size) */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">Bookmarks Load</label>
                <span className="font-mono text-lg font-bold text-primary">{limit}</span>
              </div>
              <input type="range" min="10" max="100" step="10" value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-primary" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">Card Size</label>
                <span className="font-mono text-lg font-bold text-primary">{tileSize}px</span>
              </div>
              <input type="range" min="200" max="450" step="10" value={tileSize} onChange={(e) => setTileSize(parseInt(e.target.value))} className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-primary" />
            </div>
          </div>

          <button type="submit" className="w-full flex justify-center items-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-white shadow-lg hover:opacity-90 transition-all">
            <Save size={18} /> Save Preferences
          </button>
        </form>

        <div className="border-t border-gray-600/30 my-6"></div>

        {/* --- PASSWORD SECTION --- */}
        <div>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-text transition-colors"
          >
            <Lock size={16} /> Change Password
          </button>

          {showPasswordForm && (
            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3 bg-black/20 p-4 rounded-lg border border-gray-700">
              <div>
                <input
                  type="password"
                  placeholder="Current Password"
                  required
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  className="w-full rounded bg-background border border-gray-600 p-2 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="New Password"
                  required
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  className="w-full rounded bg-background border border-gray-600 p-2 text-sm text-text focus:border-primary focus:outline-none"
                />
                <input
                  type="password"
                  placeholder="Confirm New"
                  required
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className={`w-full rounded bg-background border p-2 text-sm text-text focus:outline-none ${confirmPass && confirmPass !== newPass
                      ? 'border-red-500 focus:border-red-500' // Visual cue if mismatch
                      : 'border-gray-600 focus:border-primary'
                    }`}
                />
              </div>

              {passMessage && (
                <div className={`text-xs flex items-center gap-1 ${passMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {passMessage.type === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
                  {passMessage.text}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button type="submit" className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition-colors">
                  Update Password
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
