import React, { useMemo } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  key: string;
  description: string;
}

const favoritesShortcuts: Shortcut[] = [
  { key: 'h', description: 'Go to Dashboard'},
  { key: 'd', description: 'Go to Todo Lists'},
  { key: 'k', description: 'Go to Kanban Boards'},
  { key: 'i', description: 'Toggle shortcuts list'},
];

const todoShortcuts: Shortcut[] = [
  { key: 'h', description: 'Go to Dashboard'},
  { key: 'f', description: 'Go to Favorites'},
  { key: 'k', description: 'Go to Kanban Boards'},
  { key: 't', description: 'Create new todo list'},
  { key: 'n', description: 'Create new task in top-most list'},
  { key: 'i', description: 'Toggle shortcuts list'},
];

const kanbanShortcuts: Shortcut[] = [
  { key: 'h', description: 'Go to Dashboard'},
  { key: 'f', description: 'Go to Favorites'},
  { key: 'd', description: 'Go to Todo Lists'},
  { key: 'n', description: 'Create new card in left-most column'},
  { key: '1-9', description: 'Switch Kanban Boards 1-9'},
  { key: 'i', description: 'Toggle shortcuts list'},
];

const mainShortcuts: Shortcut[] = [
  { key: '/', description: 'Focus the search bar'},
  { key: 't', description: 'Open the tags menu'},
  { key: 'backspace', description: 'Clear selected tag'},
  { key: 'f', description: 'Go to Favorites'},
  { key: 'd', description: 'Go to Todo Lists'},
  { key: 'k', description: 'Go to Kanban Boards'},
  { key: 'i', description: 'Toggle shortcuts list'},
  { key: 'esc', description: 'Close modals or menus'},
];

export const KeyboardShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const location = useLocation();

  const visibleShortcuts = useMemo(() => {
    if (location.pathname === '/') return mainShortcuts;
    if (location.pathname === '/favorites') return favoritesShortcuts;
    if (location.pathname === '/todos') return todoShortcuts;
    if (location.pathname.startsWith('/kanban')) return kanbanShortcuts;
    return mainShortcuts;
  }, [location.pathname]);

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

        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
          {visibleShortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-gray-700/50">
              <p className="text-sm text-gray-300">{shortcut.description}</p>
              <kbd className="px-2 py-1.5 text-xs font-sans font-semibold text-gray-400 bg-gray-800 border border-gray-700 rounded-md shadow-inner min-w-[2.5rem] text-center">
                {shortcut.key === 'backspace' ? '←' : shortcut.key === 'esc' ? 'Esc' : shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <footer className="mt-6 pt-4 border-t border-gray-700/50 text-center text-gray-500 text-xs">
          <p>
            Alpaca Bookmarks v{__APP_VERSION__} is open source. {' '}
            <a
              href="https://github.com/tabishz/alpaca-bookmarks.git"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              GitHub
            </a>
            .
          </p>
        </footer>
      </div>
    </div>
  );
};
