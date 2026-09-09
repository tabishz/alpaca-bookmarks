import React, { useState, useEffect } from 'react';
import { X, Save, Palette, Lock, Check, AlertCircle, Tags, Trash2, LayoutGrid, Sliders } from 'lucide-react';
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
  currentSearchOpenNewTab?: boolean;
  currentTileOpacity?: number;
  currentTileHeight?: number;
  onSave: (
    newLimit: number,
    newTheme: Theme,
    newTileSize: number,
    newShowUrl: boolean,
    newSearchOpenNewTab: boolean,
    newTileOpacity: number,
    newTileHeight: number
  ) => void;
  onTagsUpdate?: () => void;
  initialView?: 'settings' | 'tags' | 'tiles';
  onOpenPageBgModal?: () => void;
}

interface TagObj { id: number; name: string }

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentLimit,
  currentTheme,
  currentTileSize,
  currentShowUrl,
  currentSearchOpenNewTab = false,
  currentTileOpacity = 100,
  currentTileHeight = 0,
  onSave,
  onTagsUpdate,
  initialView = 'settings',
  onOpenPageBgModal
}) => {
  const [limit, setLimit] = useState(50);
  const [selectedTheme, setSelectedTheme] = useState<Theme>('dracula');
  const [tileSize, setTileSize] = useState(280);
  const [tileHeight, setTileHeight] = useState(0);
  const [showUrl, setShowUrl] = useState(true);
  const [searchOpenNewTab, setSearchOpenNewTab] = useState(false);
  const [tileOpacity, setTileOpacity] = useState(100);

  // Tab State: 'general' | 'tiles' | 'tags'
  const [activeTab, setActiveTab] = useState<'general' | 'tiles' | 'tags'>('general');

  // Password State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // View State
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
    if (activeTab === 'tags') fetchTags();
  }, [activeTab]);

  useEffect(() => {
    setLimit(currentLimit);
    setSelectedTheme(currentTheme);
    setTileSize(currentTileSize);
    setTileHeight(currentTileHeight);
    setShowUrl(currentShowUrl);
    setSearchOpenNewTab(currentSearchOpenNewTab);
    setTileOpacity(currentTileOpacity);
    if (isOpen) {
      if (initialView === 'tags') {
        setActiveTab('tags');
      } else if (initialView === 'tiles') {
        setActiveTab('tiles');
      } else {
        setActiveTab('general');
      }
      setShowPasswordForm(false);
      setPassMessage(null);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    }
  }, [currentLimit, currentTheme, currentTileSize, currentTileHeight, currentShowUrl, currentSearchOpenNewTab, currentTileOpacity, isOpen, initialView]);

  const handleMainSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSave(limit, selectedTheme, tileSize, showUrl, searchOpenNewTab, tileOpacity, tileHeight);
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
      <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 border border-gray-700/50 max-h-[90vh] overflow-hidden flex flex-col">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Sliders size={22} className="text-primary" />
            <h2 className="text-xl font-bold text-text">Preferences</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-text transition-colors"><X size={22} /></button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-gray-700/60 mb-5 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'general'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Palette size={14} />
            General
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tiles')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'tiles'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid size={14} />
            Tiles & Cards
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'tags'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Tags size={14} />
            Tags
          </button>
        </div>

        {/* --- TAB 1: GENERAL & THEME --- */}
        {activeTab === 'general' && (
          <div className="overflow-y-auto pr-1 flex-1 space-y-6">
            {/* Theme Selector */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-400 uppercase tracking-wider">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTheme(t.id)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all ${
                      selectedTheme === t.id
                        ? 'border-primary bg-primary/20 text-primary ring-1 ring-primary'
                        : 'border-gray-500/30 hover:border-primary/50 hover:bg-white/5 text-text'
                    }`}
                  >
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: t.color }}></div>
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-600/30"></div>

            {/* Display & Search Options */}
            <div>
              <label className="mb-3 block text-xs font-semibold text-gray-400 uppercase tracking-wider">Display & Search</label>
              <div className="space-y-3 bg-black/20 p-3.5 rounded-lg border border-gray-700/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUrl}
                    onChange={(e) => setShowUrl(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span className="text-sm text-text">Show URL in bookmark tiles</span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchOpenNewTab}
                    onChange={(e) => setSearchOpenNewTab(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <div>
                    <span className="text-sm text-text block">Open search results and URLs in a new tab</span>
                    <span className="text-xs text-gray-400 block">By default, search queries and typed URLs from the search bar open in the current tab.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Page Background Shortcut (if provided) */}
            {onOpenPageBgModal && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPageBgModal();
                  }}
                  className="w-full flex items-center justify-between bg-gray-700/30 hover:bg-gray-700/50 p-3 rounded-lg text-left transition-colors group border border-gray-700/40"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Palette size={16} className="text-primary" />
                    Customize Page Background
                  </span>
                  <span className="text-xs text-gray-400 group-hover:text-text">Radial Gradient & Image</span>
                </button>
              </div>
            )}

            <div className="border-t border-gray-600/30"></div>

            {/* Password Section */}
            <div>
              <button
                type="button"
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-text transition-colors"
              >
                <Lock size={14} /> Change Password
              </button>

              {showPasswordForm && (
                <form onSubmit={handlePasswordSubmit} className="mt-3 space-y-3 bg-black/20 p-4 rounded-lg border border-gray-700">
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
                  <div className="flex gap-3">
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
                      placeholder="Confirm New Password"
                      required
                      value={confirmPass}
                      onChange={e => setConfirmPass(e.target.value)}
                      className={`w-full rounded bg-background border p-2 text-sm text-text focus:outline-none ${confirmPass && confirmPass !== newPass ? 'border-red-500' : 'border-gray-600 focus:border-primary'}`}
                    />
                  </div>

                  {passMessage && (
                    <div className={`text-xs flex items-center gap-1 ${passMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {passMessage.type === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
                      {passMessage.text}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button type="submit" className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition-colors font-semibold">
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: TILES & CARDS (SEPARATE SECTION) --- */}
        {activeTab === 'tiles' && (
          <div className="overflow-y-auto pr-1 flex-1 space-y-5">
            <div className="bg-black/20 p-3 rounded-lg border border-gray-700/40 text-xs text-gray-400">
              Configure bookmark card dimensions, grid spacing, batch loading, and background opacity.
            </div>

            {/* Bookmarks to Load */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Bookmarks To Load
                </label>
                <span className="font-mono text-base font-bold text-primary">{limit}</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-primary"
              />
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>10 items</span>
                <span>50 items</span>
                <span>100 items</span>
              </div>
            </div>

            {/* Card Width (Horizontal Size) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Card Width
                </label>
                <span className="font-mono text-base font-bold text-primary">{tileSize}px</span>
              </div>
              <input
                type="range"
                min="200"
                max="450"
                step="10"
                value={tileSize}
                onChange={(e) => setTileSize(parseInt(e.target.value))}
                className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-primary"
              />
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Compact (200px)</span>
                <span>Standard (280px)</span>
                <span>Wide (450px)</span>
              </div>
            </div>

            {/* Tile Vertical Size (Height with text truncation) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Tile Vertical Size
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTileHeight(tileHeight === 0 ? 240 : 0)}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                      tileHeight === 0
                        ? 'bg-primary/20 border-primary text-primary font-bold'
                        : 'border-gray-600 text-gray-400 hover:text-white'
                    }`}
                    title="Toggle dynamic auto-height vs fixed height"
                  >
                    Auto
                  </button>
                  <span className="font-mono text-base font-bold text-primary">
                    {tileHeight === 0 ? 'Auto' : `${tileHeight}px`}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="150"
                max="400"
                step="10"
                value={tileHeight === 0 ? 240 : tileHeight}
                onChange={(e) => setTileHeight(parseInt(e.target.value))}
                className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-primary"
              />
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Compact (150px)</span>
                <span>Balanced (240px)</span>
                <span>Tall (400px)</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">
                Controls card height. Text, titles, and descriptions are truncated with an ellipsis to fit smoothly.
              </p>
            </div>

            {/* Tile Opacity */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Tile Background Opacity
                </label>
                <span className="font-mono text-base font-bold text-primary">{tileOpacity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={tileOpacity}
                onChange={(e) => setTileOpacity(parseInt(e.target.value))}
                className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-primary"
              />
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Translucent (20%)</span>
                <span>Solid (100%)</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">
                Adjusts background translucency without washing out text, badges, or icons.
              </p>
            </div>
          </div>
        )}

        {/* --- TAB 3: TAGS --- */}
        {activeTab === 'tags' && (
          <div className="overflow-y-auto pr-1 flex-1">
            <div className="mb-3 text-xs text-gray-400">
              Manage existing bookmark tags. Deleting a tag removes it from all bookmarks without deleting the bookmarks themselves.
            </div>
            {isLoadingTags ? (
              <div className="text-center text-gray-500 py-10">Loading tags...</div>
            ) : tagList.length === 0 ? (
              <div className="text-center text-gray-500 py-10">No tags found.</div>
            ) : (
              <div className="space-y-2">
                {tagList.map(tag => (
                  <div key={tag.id} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-gray-700/50 hover:border-gray-600">
                    <span className="font-medium flex items-center gap-2 text-sm text-text">
                      <Tags size={14} className="text-primary" />
                      {tag.name}
                    </span>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-gray-400 hover:text-red-400 p-1.5 hover:bg-red-400/10 rounded transition-colors"
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

        {/* FOOTER: SAVE BUTTON (for General and Tiles tabs) */}
        {(activeTab === 'general' || activeTab === 'tiles') && (
          <div className="pt-4 border-t border-gray-700/50 mt-4 shrink-0">
            <button
              type="button"
              onClick={() => handleMainSubmit()}
              className="w-full flex justify-center items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-bold text-white shadow-lg hover:opacity-90 transition-all text-sm"
            >
              <Save size={16} /> Save Preferences
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
