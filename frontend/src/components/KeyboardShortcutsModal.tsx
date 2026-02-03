import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
    { key: '/', description: 'Focus the search bar' },
    { key: 't', description: 'Open the tags menu' },
    { key: 'esc', description: 'Close modals or menus' },
    { key: 'backspace', description: 'Clear selected tag' },
    { key: 'f', description: 'Favorites Dashboard' },

];

export const KeyboardShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-surface p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 border border-gray-700/50 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-text">
            <Keyboard size={24} className="text-primary" />
            Keyboard Shortcuts
          </h2>
          <button onClick={onClose} className="text-text hover:opacity-70">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-3">
            {shortcuts.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-gray-700/50">
                    <p className="text-sm text-gray-300">{shortcut.description}</p>
                    <kbd className="px-2 py-1.5 text-xs font-sans font-semibold text-gray-400 bg-gray-800 border border-gray-700 rounded-md">
                        {shortcut.key}
                    </kbd>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
};
