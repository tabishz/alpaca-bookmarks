import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { BookmarkCard } from '../components/BookmarkCard';
import { AddBookmarkModal } from '../components/AddBookmarkModal';
import { EditBookmarkModal } from '../components/EditBookmarkModal';
import { SettingsModal } from '../components/SettingsModal';
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal';
import { UndoToast } from '../components/UndoToast';
import { LayoutGrid, List, Plus, Search, LogOut, Tags, Settings, Upload, Download, Sliders, Shield, X, Heart, Info } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTheme, Theme } from '../hooks/useTheme';

interface UndoToastData {
  id: string;
  message: string;
  bookmark: Bookmark;
  index: number;
}

export const Dashboard = () => {
  const { theme, setTheme } = useTheme();
  const { user, updateUser } = useAuthStore();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
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
  const [totalCount, setTotalCount] = useState(0);
  const [settingsStartView, setSettingsStartView] = useState<'settings' | 'tags'>('settings');
  const [highlightedTagIndex, setHighlightedTagIndex] = useState(0);

  const [undoToasts, setUndoToasts] = useState<UndoToastData[]>([]);
  const undoTimersRef = useRef<{ [key: string]: number }>({});


  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const highlightedTagRef = useRef<HTMLButtonElement>(null);

  const logout = useAuthStore(state => state.logout);

  useEffect(() => {
    // Scroll highlighted tag into view
    if (highlightedTagRef.current) {
      highlightedTagRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedTagIndex]);

  useEffect(() => {
    // Reset highlighted index when menu opens or search changes
    if (isTagMenuOpen) {
      setHighlightedTagIndex(0);
    }
  }, [isTagMenuOpen, tagSearch]);

  useEffect(() => {
    // If user has a saved theme in DB that differs from local, sync it
    if (user && user.theme && user.theme !== theme) {
      setTheme(user.theme as Theme);
    }
  }, [user, setTheme]);

  useEffect(() => {
    // Cleanup timers on unmount
    return () => {
      Object.values(undoTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  const setTagInputFocus = useCallback((element: HTMLInputElement) => {
    if (element) {
      // Ensure the UI is fully loaded
      requestAnimationFrame(() => element.focus());
    }
  }, []);

  // Fetch Tags
  const fetchTags = async () => {
    try {
      const res = await api.get<string[]>('/tags');
      const tagNames = res.data.map((t: any) => t.name);
      setAllTags(tagNames);
    } catch (e) { console.error("Failed to load tags"); }
  };
  useEffect(() => { fetchTags(); }, []);

  // Fetch Bookmarks (with Abort)
  const fetchBookmarks = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    } else {
      if (loading) return;
    }

    setLoading(true);
    setFetchError(null); // Reset error on new fetch
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isRefresh) setBookmarks([]);

    try {
      let url = `/bookmarks?page=${pageNum}&limit=${limit}`;
      if (selectedTag) url += `&tag=${encodeURIComponent(selectedTag)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await api.get<Bookmark[]>(url, { signal: controller.signal });
      const newData = res.data;
      const total = parseInt(res.headers['x-total-count'] || '0', 10);
      setTotalCount(total);

      if (isRefresh) {
        setBookmarks(newData);
      } else {
        setBookmarks(prev => {
          const existingIds = new Set(prev.map(b => b.id));
          const uniqueNewData = newData.filter(b => !existingIds.has(b.id));
          return [...prev, ...uniqueNewData];
        });
      }

      setHasMore(newData.length >= limit);
    } catch (err: any) {
      if (err.name !== 'Canceled') {
        console.error("Failed to load bookmarks", err);
        setFetchError("Could not connect to the server. Please try again later.");
        setHasMore(false); // Stop infinite scroll on error
      }
    } finally {
      if (abortControllerRef.current === controller) setLoading(false);
    }
  }, [limit, selectedTag, search, loading]);

  // Reset Trigger
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      setHasMore(true);
      fetchBookmarks(1, true);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search, selectedTag, limit]);

  // Infinite Scroll
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
  }, [hasMore, loading, fetchBookmarks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 't' && !isTyping) {
        e.preventDefault();
        setIsTagMenuOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        if (isTagMenuOpen) { e.preventDefault(); setIsTagMenuOpen(false); }
        else if (isSettingsMenuOpen) { e.preventDefault(); setIsSettingsMenuOpen(false); }
      } else if (e.key === 'Backspace' && !isTyping && selectedTag) {
        e.preventDefault();
        setSelectedTag('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTag, isTagMenuOpen, isSettingsMenuOpen]);

  // Reset tag search when menu opens
  useEffect(() => {
    if (isTagMenuOpen) setTagSearch('');
  }, [isTagMenuOpen]);

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

  const handleConfigSave = async (newLimit: number, newTheme: Theme, newTileSize: number) => {
    localStorage.setItem('bookmarks_limit', newLimit.toString());
    localStorage.setItem('tile_size', newTileSize.toString());
    localStorage.setItem('tile_size', newTileSize.toString());
    setLimit(newLimit);
    setTheme(newTheme);
    setTileSize(newTileSize);
    try {
      await api.patch('/user/preferences', { theme: newTheme });
      if (user) {
        const updatedUser = { ...user, theme: newTheme };
        updateUser(updatedUser);
      }
    } catch (error) {
      console.error("Failed to save theme preference to server");
    }
  };
  const handleImportClick = () => { fileInputRef.current?.click(); setIsSettingsMenuOpen(false); };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!confirm(`Import "${file.name}"?`)) { e.target.value = ''; return; }
    const formData = new FormData(); formData.append('file', file);
    try { setLoading(true); await api.post('/system/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); alert('Import successful!'); fetchTags(); setPage(1); fetchBookmarks(1, true); } catch (error) { alert('Failed'); } finally { setLoading(false); e.target.value = ''; }
  };
  const handleExport = async () => {
    setIsSettingsMenuOpen(false);
    try { const response = await api.get('/system/export', { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'bookmarks.html'); document.body.appendChild(link); link.click(); link.remove(); } catch (error) { alert("Failed"); }
  };

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
        // Optionally, inform user and restore bookmark
        handleUndoDelete(toastId);
        alert("Error: Could not delete bookmark from server.");
      });
      removeToast(toastId);
    }, 10000);

    undoTimersRef.current[toastId] = timer;
  };

  const handleTagSelect = (tag: string) => { setSelectedTag(tag); setIsTagMenuOpen(false); setTagSearch(''); };
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    const hasUntaggedOption = !tagSearch;
    const totalOptions = visibleTags.length + (hasUntaggedOption ? 1 : 0);
    const hasUntaggedOption = !tagSearch;
    const totalOptions = visibleTags.length + (hasUntaggedOption ? 1 : 0);

    if (totalOptions === 0) return;

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

      let selected;
      if (hasUntaggedOption) {
        if (highlightedTagIndex === 0) {
          selected = 'Untagged';
        } else {
          selected = visibleTags[highlightedTagIndex - 1];
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
        ...bookmark, // send the whole bookmark back
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

  const visibleTags = useMemo(() => {
    if (!tagSearch) return allTags;
    return allTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()));
  }, [allTags, tagSearch]);

  return (
    <div className="min-h-screen p-6 md:p-10 w-full flex flex-col" onClick={() => { setIsTagMenuOpen(false); setIsSettingsMenuOpen(false); }} onDragOver={handleDragOver} onDrop={handleDrop}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".html" />

      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between" onClick={e => e.stopPropagation()}>
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <img src="/alpaca-bookmarks.png" alt="Alpaca Bookmarks" className="inline-block h-8 w-8 mr-2" />
            Alpaca Bookmarks
          </h1>
          <p className="text-gray-400 text-sm">
            Showing {bookmarks.length} results out of {totalCount}
            {selectedTag && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTag('');
                  setTagSearch('');
                }}
                className="mr-2 rounded-full p-0.5 hover:bg-white/20 active:bg-white/30 transition-colors"
                title="Clear tag filter"
              >
                <X size={20} />
              </button>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">

          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
              <Search className="text-gray-500" size={18} />
              <img src="/alpaca-bookmarks.png" alt="Alpaca Icon" className="ml-2 h-5 w-5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              className="w-full rounded-md bg-surface py-2 pl-16 pr-4 text-text focus:outline-none focus:ring-2 focus:ring-primary md:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  searchInputRef.current?.blur();
                }
              }}
            />
          </div>

          <div className="flex flex-row flex-wrap items-center gap-2 md:gap-3">
            <Link to="/favorites" className="flex items-center gap-2 p-2 text-sm font-medium focus:outline-none rounded-md border border-transparent bg-surface text-gray-400 hover:text-white">
              <Heart size={20} />
              <span className="hidden md:inline">Favorites</span>
            </Link>

            <div className="relative">
              <div
                className={`flex items-center rounded-md border transition-colors ${selectedTag
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-transparent bg-surface text-gray-400 hover:text-white'
                  }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTagMenuOpen(!isTagMenuOpen);
                    setIsSettingsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-2 text-sm font-medium focus:outline-none"
                >
                  <Tags size={20} />
                  <span className="hidden md:inline">{selectedTag || 'All Tags'}</span>
                </button>

                {selectedTag && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening menu when clicked
                      setSelectedTag('');  // Clear the tag
                      setTagSearch('');    // Reset tag search
                    }}
                    className="mr-2 rounded-full p-1 hover:bg-white/20 active:bg-white/30 transition-colors"
                    title="Clear tag filter"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {isTagMenuOpen && (
                <div className="absolute left-0 right-0 mx-auto top-full z-20 mt-2 max-h-80 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-gray-600 bg-surface shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="border-b border-gray-700 p-2">
                    <input
                      ref={setTagInputFocus}
                      type="text"
                      placeholder="Find tag..."
                      className="w-full rounded bg-background px-2 py-1 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                    />
                  </div>

                  {/* UNTAGGED OPTION (conditional) */}
                  {!tagSearch && (
                    <button
                      ref={highlightedTagIndex === 0 ? highlightedTagRef : null}
                      onClick={() => handleTagSelect('Untagged')}
                      className={`block w-full text-left px-4 py-2 italic border-b border-gray-700 transition-colors ${highlightedTagIndex === 0 ? 'bg-primary text-white' : 'text-yellow-400 hover:bg-gray-700'}`}
                    >
                      Without Tags
                    </button>
                  )}

                  {/* TAGS LIST */}
                  <div className="overflow-y-auto max-h-60">
                    {visibleTags.length > 0 ? (
                      visibleTags.map((tag, index) => {
                        const itemIndex = !tagSearch ? index + 1 : index;
                        return (
                          <button
                            key={tag}
                            ref={highlightedTagIndex === itemIndex ? highlightedTagRef : null}
                            onClick={() => handleTagSelect(tag)}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedTag === tag ? 'bg-primary/20 text-primary' : 'text-text'} ${highlightedTagIndex === itemIndex ? 'bg-primary text-white' : 'hover:bg-primary hover:text-white'}`}
                          >
                            #{tag}
                          </button>
                        );
                      })
                    ) : (
                      tagSearch && <div className="p-3 text-center text-sm text-gray-500">No matching tags</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 rounded-md bg-surface p-1">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400'}`}><LayoutGrid size={20} /></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400'}`}><List size={20} /></button>
            </div>

            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setIsInfoModalOpen(true); }}
                className="p-2 rounded-md text-gray-400 hover:text-white transition-colors"
              >
                <Info size={20} />
              </button>
            </div>

            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setIsSettingsMenuOpen(!isSettingsMenuOpen); setIsTagMenuOpen(false); }}
                className={`p-2 rounded-md transition-colors ${isSettingsMenuOpen ? 'bg-surface text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Settings size={20} />
              </button>
              {isSettingsMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-md border border-gray-600 bg-surface shadow-xl">
                  <button onClick={() => { setSettingsStartView('settings'); setIsConfigModalOpen(true); setIsSettingsMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted hover:bg-primary hover:text-white"><Sliders size={16} /> Preferences</button>
                  <div className="my-1 border-t border-gray-700"></div>
                  <button onClick={handleImportClick} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted hover:bg-primary hover:text-white"><Upload size={16} /> Import Bookmarks</button>
                  <button onClick={handleExport} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted hover:bg-primary hover:text-white"><Download size={16} /> Export Bookmarks</button>
                  <button
                    onClick={() => {
                      setSettingsStartView('tags');
                      setIsConfigModalOpen(true);
                      setIsSettingsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted hover:bg-primary hover:text-white"
                  >
                    <Tags size={16} /> Organize Tags
                  </button>
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-yellow-400 hover:bg-yellow-400/10"
                    >
                      <Shield size={16} /> Admin Console
                    </Link>
                  )}
                  <div className="my-1 border-t border-gray-700"></div>
                  <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-400 hover:bg-red-400/10"><LogOut size={16} /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Grid */}
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
              />
            ))
          )}
        </div>

        <div ref={observerTarget} className="py-8 text-center">{loading && <span className="text-primary">Loading...</span>}</div>
      </div>

      <footer className="mt-10 py-4 text-center text-gray-500 text-sm">
        <p>
          Alpaca Bookmarks v{__APP_VERSION__} is open source. Contribute on {' '}
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
        onSave={handleConfigSave}
        onTagsUpdate={() => fetchBookmarks(1, true)} // Refresh bookmarks if tags change
        initialView={settingsStartView}
      />
      <KeyboardShortcutsModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />

      {/* Undo Toasts Container */}
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
