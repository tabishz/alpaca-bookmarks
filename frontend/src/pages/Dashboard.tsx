import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { BookmarkCard } from '../components/BookmarkCard';
import { AddBookmarkModal } from '../components/AddBookmarkModal';
import { EditBookmarkModal } from '../components/EditBookmarkModal';
import { SettingsModal } from '../components/SettingsModal';
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal';
import { UndoToast } from '../components/UndoToast';
import { DashboardHeader } from '../components/DashboardHeader';
import { Plus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTheme, Theme } from '../hooks/useTheme';
import { useBookmarks } from '../hooks/useBookmarks';
import { useTags } from '../hooks/useTags';

interface UndoToastData {
  id: string;
  message: string;
  bookmark: Bookmark;
  index: number;
}

export const Dashboard = () => {
  const { theme, setTheme } = useTheme();
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();

  // Local State
  const [limit, setLimit] = useState(() => {
    const saved = localStorage.getItem('bookmarks_limit');
    return saved ? parseInt(saved) : 50;
  });
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [droppedData, setDroppedData] = useState<{ url: string; title?: string } | null>(null);
  const [tileSize, setTileSize] = useState(() => {
    const saved = localStorage.getItem('tile_size');
    return saved ? parseInt(saved) : 280;
  });
  const [showUrl, setShowUrl] = useState(() => {
    const saved = localStorage.getItem('show_url');
    return saved ? saved === 'true' : true;
  });
  const [settingsStartView, setSettingsStartView] = useState<'settings' | 'tags'>('settings');
  const [highlightedTagIndex, setHighlightedTagIndex] = useState(0);

  const [undoToasts, setUndoToasts] = useState<UndoToastData[]>([]);
  const undoTimersRef = useRef<{ [key: string]: number }>({});

  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const highlightedTagRef = useRef<HTMLButtonElement>(null);

  // Custom Hooks
  const {
    bookmarks,
    setBookmarks,
    loading,
    hasMore,
    fetchError,
    totalCount,
    fetchBookmarks,
    setPage
  } = useBookmarks({ limit, search, selectedTag });

  const { allTags, fetchTags } = useTags();

  // Effects
  useEffect(() => {
    if (highlightedTagRef.current) {
      highlightedTagRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedTagIndex]);

  useEffect(() => {
    if (isTagMenuOpen) {
      setHighlightedTagIndex(0);
      setTagSearch('');
    }
  }, [isTagMenuOpen]);

  useEffect(() => {
    if (user && user.theme && user.theme !== theme) {
      setTheme(user.theme as Theme);
    }
  }, [user, setTheme, theme]);

  useEffect(() => {
    const timers = undoTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => {
            const nextPage = prev + 1;
            fetchBookmarks(nextPage, false);
            return nextPage;
          });
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loading, fetchBookmarks, setPage]);

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      switch (e.key) {
        case '/':
          if (!isTyping) {
            e.preventDefault();
            searchInputRef.current?.focus();
          }
          break;
        case 't':
          if (!isTyping) {
            e.preventDefault();
            setIsTagMenuOpen(prev => !prev);
          }
          break;
        case 'f':
          if (!isTyping) {
            e.preventDefault();
            navigate('/favorites');
          }
          break;
        case 'd':
          if (!isTyping) {
            e.preventDefault();
            navigate('/todos');
          }
          break;
        case 'k':
          if (!isTyping) {
            e.preventDefault();
            navigate('/kanban');
          }
          break;
        case 'i':
          if (!isTyping) {
            e.preventDefault();
            isInfoModalOpen ? setIsInfoModalOpen(false) : setIsInfoModalOpen(true);
          }
          break;
        case 'Escape':
          if (isTagMenuOpen) { e.preventDefault(); setIsTagMenuOpen(false); }
          else if (isSettingsMenuOpen) { e.preventDefault(); setIsSettingsMenuOpen(false); }
          else if (isInfoModalOpen) { setIsInfoModalOpen(false); }
          break;
        case 'Backspace':
          if (!isTyping && selectedTag) {
            e.preventDefault();
            setSelectedTag('');
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTag, isTagMenuOpen, isSettingsMenuOpen, navigate, isInfoModalOpen]);

  // Helper Functions
  const setTagInputFocus = useCallback((element: HTMLInputElement) => {
    if (element) {
      requestAnimationFrame(() => element.focus());
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');

    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      setDroppedData({ url });
      setIsAddModalOpen(true);
    }
  };

  const handleConfigSave = async (newLimit: number, newTheme: Theme, newTileSize: number, newShowUrl: boolean) => {
    localStorage.setItem('bookmarks_limit', newLimit.toString());
    localStorage.setItem('tile_size', newTileSize.toString());
    localStorage.setItem('show_url', newShowUrl.toString());
    setLimit(newLimit);
    setTheme(newTheme);
    setTileSize(newTileSize);
    setShowUrl(newShowUrl);
    try {
      await api.patch('/user/preferences', { theme: newTheme });
      if (user) {
        const updatedUser = { ...user, theme: newTheme };
        updateUser(updatedUser);
      }
    } catch {
      console.error("Failed to save theme preference to server");
    }
  };

  const handleImportClick = () => { fileInputRef.current?.click(); setIsSettingsMenuOpen(false); };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!confirm(`Import "${file.name}"?`)) { e.target.value = ''; return; }
    const formData = new FormData(); formData.append('file', file);
    try {
      await api.post('/system/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Import successful!');
      fetchTags();
      setPage(1);
      fetchBookmarks(1, true);
    } catch { alert('Failed'); } finally { e.target.value = ''; }
  };

  const handleExport = async () => {
    setIsSettingsMenuOpen(false);
    try { const response = await api.get('/system/export', { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'bookmarks.html'); document.body.appendChild(link); link.click(); link.remove(); } catch { alert("Failed"); }
  };

  // Undo Toast Logic
  const removeToast = (toastId: string) => {
    setUndoToasts(currentToasts => currentToasts.filter(t => t.id !== toastId));
    if (undoTimersRef.current[toastId]) {
      clearTimeout(undoTimersRef.current[toastId]);
      delete undoTimersRef.current[toastId];
    }
  };

  const handleUndoDelete = (toastId: string) => {
    const toast = undoToasts.find(t => t.id === toastId);
    if (toast) {
      setBookmarks(prev => {
        const newBookmarks = [...prev];
        newBookmarks.splice(toast.index, 0, toast.bookmark);
        return newBookmarks;
      });
      removeToast(toastId);
    }
  };

  const handleDelete = (bookmarkToDelete: Bookmark) => {
    const index = bookmarks.findIndex(b => b.id === bookmarkToDelete.id);
    if (index === -1) return;

    setBookmarks(prev => prev.filter(b => b.id !== bookmarkToDelete.id));

    const toastId = `undo-${Date.now()}`;
    const newToast: UndoToastData = {
      id: toastId,
      message: `Deleted bookmark "${bookmarkToDelete.title || 'Untitled'}"`,
      bookmark: bookmarkToDelete,
      index: index,
    };
    setUndoToasts(prev => [...prev, newToast]);

    const timer = window.setTimeout(() => {
      api.delete(`/bookmarks/${bookmarkToDelete.id}`).catch(error => {
        console.error("Failed to permanently delete bookmark", error);
        handleUndoDelete(toastId);
        alert("Error: Could not delete bookmark from server.");
      });
      removeToast(toastId);
    }, 10000);

    undoTimersRef.current[toastId] = timer;
  };

  // Tag & Bookmark Operations
  const handleTagSelect = (tag: string) => { setSelectedTag(tag); setIsTagMenuOpen(false); setTagSearch(''); };

  const visibleTags = useMemo(() => {
    if (!tagSearch) return allTags;
    return allTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()));
  }, [allTags, tagSearch]);

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    const hasUntaggedOption = !tagSearch;
    const totalOptions = visibleTags.length + (hasUntaggedOption ? 1 : 0);

    if (totalOptions === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedTagIndex(prev => (prev + 1) % totalOptions);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedTagIndex(prev => (prev - 1 + totalOptions) % totalOptions);
    } else if ((e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault();

      let selected;
      if (hasUntaggedOption) {
        if (highlightedTagIndex === 0) {
          selected = 'Untagged';
        } else {
          selected = visibleTags[highlightedTagIndex - 1];
        }
      } else {
        selected = visibleTags[highlightedTagIndex];
      }

      if (selected) {
        handleTagSelect(selected);
      }
    }
  };

  const handleToggleFavorite = async (bookmark: Bookmark, isFavorite: boolean) => {
    const favoriteTagName = 'Favorites';
    let newTags: string[];

    if (isFavorite) {
      newTags = bookmark.tags.filter(t => t.name !== favoriteTagName).map(t => t.name);
    } else {
      newTags = [...bookmark.tags.map(t => t.name), favoriteTagName];
    }

    try {
      const response = await api.put(`/bookmarks/${bookmark.id}`, {
        ...bookmark,
        tags: newTags
      });
      handleEditSuccess(response.data);
    } catch (error) {
      console.error("Failed to toggle favorite status", error);
      alert("Failed to update favorite status.");
    }
  };

  const handleAddSuccess = (newBookmark: Bookmark) => { setBookmarks(prev => [newBookmark, ...prev]); fetchTags(); };
  const handleEditSuccess = (updatedBookmark: Bookmark) => { setBookmarks(prev => prev.map(b => b.id === updatedBookmark.id ? updatedBookmark : b)); fetchTags(); };
  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setDroppedData(null);
  };

  return (
    <div className="min-h-screen p-6 md:p-10 w-full flex flex-col" onClick={() => { setIsTagMenuOpen(false); setIsSettingsMenuOpen(false); }} onDragOver={handleDragOver} onDrop={handleDrop}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".html" />

      <DashboardHeader
        bookmarksCount={bookmarks.length}
        totalCount={totalCount}
        search={search}
        setSearch={setSearch}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        setTagSearch={setTagSearch}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isTagMenuOpen={isTagMenuOpen}
        setIsTagMenuOpen={setIsTagMenuOpen}
        tagSearch={tagSearch}
        visibleTags={visibleTags}
        highlightedTagIndex={highlightedTagIndex}
        highlightedTagRef={highlightedTagRef}
        setTagInputFocus={setTagInputFocus}
        handleTagInputKeyDown={handleTagInputKeyDown}
        handleTagSelect={handleTagSelect}
        isSettingsMenuOpen={isSettingsMenuOpen}
        setIsSettingsMenuOpen={setIsSettingsMenuOpen}
        setIsInfoModalOpen={setIsInfoModalOpen}
        setIsConfigModalOpen={setIsConfigModalOpen}
        setSettingsStartView={setSettingsStartView}
        handleImportClick={handleImportClick}
        handleExport={handleExport}
        logout={logout}
        user={user}
        searchInputRef={searchInputRef}
      />

      <div className="flex-1">
        <div
          className={viewMode === 'grid' ? "grid gap-6" : "flex flex-col"}
          style={viewMode === 'grid' ? {
            gridTemplateColumns: `repeat(auto-fill, minmax(${tileSize}px, 1fr))`
          } : {}}
        >
          {bookmarks.length === 0 && !loading ? (
            <div className="col-span-full text-center text-gray-500 mt-20">
              {fetchError ? <span className="text-red-400">{fetchError}</span> :
                (search || selectedTag ? "No matches found." : "No bookmarks yet. Add one!")
              }
            </div>
          ) : (
            bookmarks.map(b => (
              <BookmarkCard
                key={b.id}
                bookmark={b}
                viewMode={viewMode}
                onDelete={handleDelete}
                onEdit={setEditingBookmark}
                onTagClick={handleTagSelect}
                onToggleFavorite={handleToggleFavorite}
                showUrl={showUrl}
              />
            ))
          )}
        </div>

        <div ref={observerTarget} className="py-8 text-center">{loading && <span className="text-primary">Loading...</span>}</div>
      </div>

      <footer className="mt-10 py-4 text-center text-gray-500 text-sm">
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

      <button onClick={() => setIsAddModalOpen(true)} className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:scale-110 transition-transform z-40"><Plus size={28} /></button>
      <AddBookmarkModal isOpen={isAddModalOpen} onClose={closeAddModal} onSuccess={handleAddSuccess} existingTags={allTags} initialData={droppedData} />
      <EditBookmarkModal bookmark={editingBookmark} onClose={() => setEditingBookmark(null)} onSuccess={handleEditSuccess} existingTags={allTags} />
      <SettingsModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentLimit={limit}
        currentTheme={theme}
        currentTileSize={tileSize}
        currentShowUrl={showUrl}
        onSave={handleConfigSave}
        onTagsUpdate={() => fetchBookmarks(1, true)}
        initialView={settingsStartView}
      />
      <KeyboardShortcutsModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />

      <div className="fixed bottom-10 right-10 z-50 flex flex-col gap-3">
        {undoToasts.map(toast => (
          <UndoToast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            duration={10000}
            onUndo={() => handleUndoDelete(toast.id)}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};
