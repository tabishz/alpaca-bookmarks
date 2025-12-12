import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentLimit: number;
  onSave: (newLimit: number) => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, currentLimit, onSave }) => {
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    setLimit(currentLimit);
  }, [currentLimit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(limit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-text">
          <X size={24} />
        </button>

        <h2 className="mb-6 text-2xl font-bold">App Settings</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Bookmarks per load
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-primary"
              />
              <span className="w-12 text-center font-mono text-lg font-bold text-primary">
                {limit}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Higher numbers load more data at once but might be slower.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-400 hover:bg-background hover:text-text">
              Cancel
            </button>
            <button type="submit" className="flex items-center gap-2 rounded bg-primary px-6 py-2 font-bold text-white hover:opacity-90">
              <Save size={18} /> Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
