import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { BookmarkCard } from '../components/BookmarkCard';
import { AddBookmarkModal } from '../components/AddBookmarkModal';
import { EditBookmarkModal } from '../components/EditBookmarkModal';
import { SettingsModal } from '../components/SettingsModal';
import { LayoutGrid, List, Plus, Search, LogOut, Tags, Settings, Upload, Download, Sliders, Shield, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTheme, Theme } from '../hooks/useTheme';

export const Dashboard = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [droppedData, setDroppedData] = useState<{ url: string; title?: string } | null>(null);
  const [tileSize, setTileSize] = useState(() => {
    const saved = localStorage.getItem('tile_size');
    return saved ? parseInt(saved) : 280; // Default 280px
  });
  const [totalCount, setTotalCount] = useState(0);
  const [settingsStartView, setSettingsStartView] = useState<'settings' | 'tags'>('settings');

  // --- REFS ---
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const logout = useAuthStore(state => state.logout);

  useEffect(() => {
    // If user has a saved theme in DB that differs from local, sync it
    if (user && user.theme && user.theme !== theme) {
      setTheme(user.theme as Theme);
    }
  }, [user, setTheme]);

  // --- FIX 2: CALLBACK REF FOR TAG INPUT ---
  // This function runs automatically when the <input> mounts into the DOM.
  const setTagInputFocus = useCallback((element: HTMLInputElement) => {
    if (element) {
      // Use a microtask to ensure the UI is fully painted
      requestAnimationFrame(() => element.focus());
    }
  }, []);

  // 1. Fetch Tags
  const fetchTags = async () => {
    try {
      const res = await api.get<string[]>('/tags');
      const tagNames = res.data.map((t: any) => t.name);
      setAllTags(tagNames);
    } catch (e) { console.error("Failed to load tags"); }
  };
  useEffect(() => { fetchTags(); }, []);

  // 2. Fetch Bookmarks (with Abort)
  const fetchBookmarks = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    } else {
      if (loading) return;
    }

    setLoading(true);
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
      if (err.name !== 'Canceled') console.error("Failed to load bookmarks");
    } finally {
      if (abortControllerRef.current === controller) setLoading(false);
    }
  }, [limit, selectedTag, search, loading]);

  // 3. Reset Trigger
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      setHasMore(true);
      fetchBookmarks(1, true);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search, selectedTag, limit]);

  // 4. Infinite Scroll
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

  // 5. Global Shortcuts
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
    // Prevent default behavior (Prevent file from being opened)
    e.preventDefault();
    e.stopPropagation();
    // Optional: Add visual cue (change border color etc.)
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Try to get URL from the dropped data
    // Browsers usually provide 'text/uri-list' or 'text/plain'
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');

    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      setDroppedData({ url });
      setIsAddModalOpen(true);
    }
  };

  // --- HANDLERS ---
  const handleConfigSave = async (newLimit: number, newTheme: Theme, newTileSize: number) => {
    localStorage.setItem('bookmarks_limit', newLimit.toString());
    setLimit(newLimit);
    setTheme(newTheme);
    setTileSize(newTileSize);
    try {
      await api.patch('/user/preferences', { theme: newTheme });
    } catch (error) {
      console.error("Failed to save theme preference to server");
      // Optional: Revert on failure? Usually not critical for themes.
    }
  };
  const handleImportClick = () => { fileInputRef.current?.click(); setIsSettingsMenuOpen(false); };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { /* ... Keep Import Logic ... */
    const file = e.target.files?.[0]; if (!file) return;
    if (!confirm(`Import "${file.name}"?`)) { e.target.value = ''; return; }
    const formData = new FormData(); formData.append('file', file);
    try { setLoading(true); await api.post('/system/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); alert('Import successful!'); fetchTags(); setPage(1); fetchBookmarks(1, true); } catch (error) { alert('Failed'); } finally { setLoading(false); e.target.value = ''; }
  };
  const handleExport = async () => { /* ... Keep Export Logic ... */
    setIsSettingsMenuOpen(false);
    try { const response = await api.get('/system/export', { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'bookmarks.html'); document.body.appendChild(link); link.click(); link.remove(); } catch (error) { alert("Failed"); }
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try { await api.delete(`/bookmarks/${id}`); setBookmarks(prev => prev.filter(b => b.id !== id)); } catch (error) { alert("Failed"); }
  };
  const handleTagSelect = (tag: string) => { setSelectedTag(tag); setIsTagMenuOpen(false); setTagSearch(''); };
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Tab' || e.key === 'Enter') && visibleTags.length > 0) {
      e.preventDefault(); handleTagSelect(visibleTags[0]);
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

  // FILTERING LOGIC
  // const filteredBookmarks = useMemo(() => {
  //   let result = bookmarks;

  //   // Search Filter
  //   if (search) {
  //     const lower = search.toLowerCase();
  //     result = result.filter(b =>
  //       b.title.toLowerCase().includes(lower) ||
  //       b.url.toLowerCase().includes(lower) ||
  //       b.tags.some(t => t.name.toLowerCase().includes(lower))
  //     );
  //   }

  //   // Tag Filter
  //   if (selectedTag) {
  //     if (selectedTag === 'Untagged') {
  //       // SHOW TAGLESS
  //       result = result.filter(b => (!b.tags || b.tags.length === 0));
  //     } else {
  //       // STANDARD FILTER
  //       result = result.filter(b => b.tags.some(t => t.name === selectedTag));
  //     }
  //   }

  //   return result;
  // }, [bookmarks, search, selectedTag]);

  return (
    <div className="min-h-screen p-6 md:p-10 w-full" onClick={() => { setIsTagMenuOpen(false); setIsSettingsMenuOpen(false); }} onDragOver={handleDragOver} onDrop={handleDrop}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".html" />

      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between" onClick={e => e.stopPropagation()}>
        <div>
          <h1 className="text-3xl font-bold">My Bookmarks</h1>
          <p className="text-gray-400 text-sm">
            Showing {bookmarks.length} results out of {totalCount}
            {selectedTag && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Stop click from bubbling to other handlers
                  setSelectedTag('');  // Clear the tag
                  setTagSearch('');    // Reset tag search input
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              className="w-full rounded-md bg-surface py-2 pl-10 pr-4 text-text focus:outline-none focus:ring-2 focus:ring-primary md:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              // --- FIX 1: BLUR ON ESCAPE ---
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  searchInputRef.current?.blur();
                }
              }}
            />
          </div>

          <div className="relative">
            <div
              className={`flex items-center rounded-md border transition-colors ${selectedTag
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-transparent bg-surface text-gray-400 hover:text-white'
                }`}
            >
              {/* Button 1: The Main Label (Clicking this toggles the menu) */}
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

              {/* Button 2: The X (Only visible when tag is selected) */}
              {selectedTag && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Stop click from opening the menu
                    setSelectedTag('');  // Clear the tag
                    setTagSearch('');    // Reset tag search
                  }}
                  className="mr-2 rounded-full p-1 hover:bg-white/20 active:bg-white/30 transition-colors"
                  title="Clear tag filter"
                >
                  <X size={14} /> {/* Ensure X is imported from lucide-react */}
                </button>
              )}
            </div>

            {isTagMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 max-h-80 w-56 overflow-hidden rounded-md border border-gray-600 bg-surface shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
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
                {/* NEW: UNTAGGED OPTION */}
                <button
                  onClick={() => { setSelectedTag('Untagged'); setIsTagMenuOpen(false); }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-yellow-400 italic border-b border-gray-700"
                >
                  Without Tags
                </button>
                {/* ... Tag List ... */}
                <div className="overflow-y-auto max-h-60">
                  {visibleTags.length === 0 ? <div className="p-3 text-center text-sm text-gray-500">No matching tags</div> :
                    visibleTags.map(tag => (
                      <button key={tag} onClick={() => { setSelectedTag(tag); setIsTagMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-primary hover:text-white transition-colors ${selectedTag === tag ? 'bg-primary/20 text-primary' : 'text-text'}`}>#{tag}</button>
                    ))
                  }
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
              onClick={(e) => { e.stopPropagation(); setIsSettingsMenuOpen(!isSettingsMenuOpen); setIsTagMenuOpen(false); }}
              className={`p-2 rounded-md transition-colors ${isSettingsMenuOpen ? 'bg-surface text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Settings size={20} />
            </button>
            {isSettingsMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-md border border-gray-600 bg-surface shadow-xl">
                <button onClick={() => { setSettingsStartView('settings'); setIsConfigModalOpen(true); setIsSettingsMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 hover:bg-primary hover:text-white"><Sliders size={16} /> Preferences</button>
                <div className="my-1 border-t border-gray-700"></div>
                <button onClick={handleImportClick} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 hover:bg-primary hover:text-white"><Upload size={16} /> Import Bookmarks</button>
                <button onClick={handleExport} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 hover:bg-primary hover:text-white"><Download size={16} /> Export Bookmarks</button>
                <button
                  onClick={() => {
                    setSettingsStartView('tags');
                    setIsConfigModalOpen(true);
                    setIsSettingsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 hover:bg-primary hover:text-white"
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
      </header>

      {/* Grid ... */}
      <div
        className={viewMode === 'grid' ? "grid gap-6" : "flex flex-col"}
        style={viewMode === 'grid' ? {
          // CSS Grid Magic: Create columns that are AT LEAST 'tileSize' wide
          gridTemplateColumns: `repeat(auto-fill, minmax(${tileSize}px, 1fr))`
        } : {}}
      >
        {bookmarks.length === 0 && !loading ? (
          <div className="col-span-full text-center text-gray-500 mt-20">
            {search || selectedTag ? "No matches found." : "No bookmarks yet. Add one!"}
          </div>
        ) : (
          bookmarks.map(b => (
            <BookmarkCard
              key={b.id}
              bookmark={b}
              viewMode={viewMode}
              onDelete={handleDelete}
              onEdit={setEditingBookmark}
              onTagClick={handleTagSelect} // <--- PASS THE HANDLER HERE
            />
          ))
        )}
      </div>

      <div ref={observerTarget} className="py-8 text-center">{loading && <span className="text-primary">Loading...</span>}</div>
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
        initialView={settingsStartView} // <--- Pass the state here
      />
    </div>
  );
};
