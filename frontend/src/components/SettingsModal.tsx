import React, { useState, useEffect } from 'react';
import { X, Save, Palette } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentLimit: number;
  currentTheme: Theme;
  currentTileSize: number;
  onSave: (newLimit: number, newTheme: Theme, newTileSize: number) => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, currentLimit, currentTheme, onSave }) => {
  const [limit, setLimit] = useState(50);
  const [selectedTheme, setSelectedTheme] = useState<Theme>('dracula');
  const [tileSize, setTileSize] = useState(280);

  useEffect(() => {
    setLimit(currentLimit);
    setSelectedTheme(currentTheme);
  }, [currentLimit, currentTheme, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(limit, selectedTheme, tileSize);
    onClose();
  };

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
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 border border-gray-700/50">
        <button onClick={onClose} className="absolute right-4 top-4 text-text hover:opacity-70">
          <X size={24} />
        </button>

        <h2 className="mb-6 text-2xl font-bold flex items-center gap-2 text-text">
          <Palette size={24} className="text-primary" /> Appearance
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* THEME SELECTOR */}
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-400 uppercase tracking-wider">Select Theme</label>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTheme(t.id)}
                  // FIX: Explicit 'text-text' ensures visibility in both light/dark modes
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                    selectedTheme === t.id
                      ? 'border-primary bg-primary/20 text-primary ring-1 ring-primary'
                      : 'border-gray-500/30 hover:border-primary/50 hover:bg-white/5 text-text'
                  }`}
                >
                  {/* Color Dot */}
                  <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: t.color }}></div>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-600/30"></div>

          {/* PAGINATION LIMIT */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">
                Bookmarks per load
              </label>
              <span className="font-mono text-lg font-bold text-primary">
                {limit}
              </span>
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
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">
                Card Size
              </label>
              <span className="font-mono text-lg font-bold text-primary">
                {tileSize}px
              </span>
            </div>
            <input
              type="range"
              min="200" max="450" step="10"
              value={tileSize}
              onChange={(e) => setTileSize(parseInt(e.target.value))}
              className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-text hover:bg-white/10 transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-bold text-white shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all">
              <Save size={18} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
