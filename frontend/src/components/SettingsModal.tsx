import React, { useState, useEffect } from 'react';
import { X, Save, Palette, Lock, Check, AlertCircle, Tags, Trash2, ArrowLeft } from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import api from '../api/client';
import { AxiosError } from 'axios';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentLimit: number;
  currentTheme: Theme;
  currentTileSize: number;
  currentShowUrl: boolean;
  onSave: (newLimit: number, newTheme: Theme, newTileSize: number, newShowUrl: boolean) => void;
  onTagsUpdate?: () => void;
  initialView?: 'settings' | 'tags';
}

interface TagObj { id: number; name: string }

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, currentLimit, currentTheme, currentTileSize, currentShowUrl, onSave, onTagsUpdate, initialView = 'settings' }) => {
  const [limit, setLimit] = useState(50);
  const [selectedTheme, setSelectedTheme] = useState<Theme>('dracula');
  const [tileSize, setTileSize] = useState(280);
  const [showUrl, setShowUrl] = useState(true);

  // Password State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);



  // View State
  const [view, setView] = useState<'settings' | 'tags'>('settings');
  const [tagList, setTagList] = useState<TagObj[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // Fetch Tags
  const fetchTags = async () => {
    setIsLoadingTags(true);
    try {
      const res = await api.get<TagObj[]>('/tags');
      setTagList(res.data);
    } catch {
      console.error("Failed to load tags");
    } finally {
      setIsLoadingTags(false);
    }
  };

  useEffect(() => {
    if (view === 'tags') fetchTags();
  }, [view]);

  useEffect(() => {
    setLimit(currentLimit);
    setSelectedTheme(currentTheme);
    setTileSize(currentTileSize);
    setShowUrl(currentShowUrl);
    if (isOpen) {
      setView(initialView);
      setShowPasswordForm(false);
      setPassMessage(null);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    }
  }, [currentLimit, currentTheme, currentTileSize, currentShowUrl, isOpen, initialView]);

  const handleMainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(limit, selectedTheme, tileSize, showUrl);
    onClose();
  };

  const handleDeleteTag = async (id: number) => {
    if (!confirm("Delete this tag? Bookmarks with this tag will remain, but become tagless if they have no other tags.")) return;
    try {
      await api.delete(`/tags/${id}`);
      setTagList(prev => prev.filter(t => t.id !== id));
      if (onTagsUpdate) onTagsUpdate();
    } catch {
      alert("Failed to delete tag");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);
    if (newPass !== confirmPass) {
      setPassMessage({ type: 'error', text: "New passwords do not match" });
      return;
    }
    try {
      await api.patch('/user/password', { currentPassword: currentPass, newPassword: newPass });
      setPassMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
      setTimeout(() => setShowPasswordForm(false), 2000);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ error: string }>;
      setPassMessage({ type: 'error', text: axiosError.response?.data?.error || 'Failed to update password' });
    }
  };

  if (!isOpen) return null;

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
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 border border-gray-700/50 max-h-[90vh] overflow-hidden flex flex-col">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-2">
            {view === 'tags' && (
              <button onClick={() => setView('settings')} className="mr-2 hover:bg-gray-700 p-1 rounded-full">
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-2xl font-bold flex items-center gap-2 text-text">
              {view === 'settings' ? <Palette size={24} className="text-primary" /> : <Tags size={24} className="text-primary" />}
              {view === 'settings' ? 'Settings' : 'Organize Tags'}
            </h2>
          </div>
          <button onClick={onClose} className="text-text hover:opacity-70"><X size={24} /></button>
        </div>

        {/* --- VIEW: SETTINGS --- */}
        {view === 'settings' && (
          <div className="overflow-y-auto pr-2">
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

              {/* Sliders */}
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

              <div className="border-t border-gray-600/30"></div>

              {/* Display Options */}
              <div>
                <label className="mb-3 block text-sm font-medium text-gray-400 uppercase tracking-wider">Display Options</label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUrl}
                    onChange={(e) => setShowUrl(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span className="text-sm text-text">Show URL in bookmark tiles</span>
                </label>
              </div>

              <button type="submit" className="w-full flex justify-center items-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-white shadow-lg hover:opacity-90 transition-all">
                <Save size={18} /> Save Preferences
              </button>
            </form>

            <div className="border-t border-gray-600/30 my-6"></div>

            {/* Manage Tags Button */}
            <button
              onClick={() => setView('tags')}
              className="w-full flex items-center justify-between bg-gray-700/30 hover:bg-gray-700/50 p-3 rounded-lg text-left transition-colors mb-4 group"
            >
              <span className="flex items-center gap-2 font-medium"><Tags size={18} className="text-blue-400" /> Organize Tags</span>
              <span className="text-xs text-gray-500 group-hover:text-muted">Manage & Delete</span>
            </button>

            {/* Password Section */}
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
                      type="password" placeholder="Current Password" required
                      value={currentPass} onChange={e => setCurrentPass(e.target.value)}
                      className="w-full rounded bg-background border border-gray-600 p-2 text-sm text-text focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="password" placeholder="New Password" required
                      value={newPass} onChange={e => setNewPass(e.target.value)}
                      className="w-full rounded bg-background border border-gray-600 p-2 text-sm text-text focus:border-primary focus:outline-none"
                    />
                    <input
                      type="password" placeholder="Confirm" required
                      value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                      className={`w-full rounded bg-background border p-2 text-sm text-text focus:outline-none ${confirmPass && confirmPass !== newPass ? 'border-red-500' : 'border-gray-600 focus:border-primary'}`}
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
        )}

        {view === 'tags' && (
          <div className="overflow-y-auto pr-2 flex-1">
            {isLoadingTags ? (
              <div className="text-center text-gray-500 py-10">Loading tags...</div>
            ) : tagList.length === 0 ? (
              <div className="text-center text-gray-500 py-10">No tags found.</div>
            ) : (
              <div className="space-y-2">
                {tagList.map(tag => (
                  <div key={tag.id} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-gray-700/50 hover:border-gray-600">
                    <span className="font-medium flex items-center gap-2">
                      <Tags size={14} className="text-gray-500" />
                      {tag.name}
                    </span>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-gray-400 hover:text-red-400 p-2 hover:bg-red-400/10 rounded transition-colors"
                      title="Delete Tag"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
