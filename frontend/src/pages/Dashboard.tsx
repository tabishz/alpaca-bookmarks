import React, { useEffect, useState, useMemo, useRef } from 'react';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { BookmarkCard } from '../components/BookmarkCard';
import { AddBookmarkModal } from '../components/AddBookmarkModal';
import { EditBookmarkModal } from '../components/EditBookmarkModal';
import { LayoutGrid, List, Plus, Search, LogOut, Tags, X, Settings, Upload, Download } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const Dashboard = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);

  // Tag Filter State
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null); // Main Search Ref
  const tagInputRef = useRef<HTMLInputElement>(null);    // Tag Dropdown Search Ref
  const fileInputRef = useRef<HTMLInputElement>(null);   // Import Input Ref

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);

  const logout = useAuthStore(state => state.logout);

  // 1. Fetch Data
  const fetchBookmarks = async () => {
    try {
      const res = await api.get<Bookmark[]>('/bookmarks');
      setBookmarks(res.data);
    } catch (err) {
      console.error("Failed to load bookmarks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookmarks(); }, []);

  // 2. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Hotkey: '/' to Focus Main Search
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Hotkey: 't' to Toggle Tags Menu
      if (e.key === 't' && !isTyping) {
        e.preventDefault();
        setIsTagMenuOpen(prev => !prev);
        return;
      }

      // Hotkey: 'Escape' to Close Menus
      if (e.key === 'Escape') {
        if (isTagMenuOpen) {
            e.preventDefault();
            setIsTagMenuOpen(false);
        } else if (isSettingsOpen) {
            e.preventDefault();
            setIsSettingsOpen(false);
        }
        return;
      }

      // Hotkey: 'Backspace' to Clear Tag Filter
      if (e.key === 'Backspace' && !isTyping && selectedTag) {
        e.preventDefault();
        setSelectedTag(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTag, isTagMenuOpen, isSettingsOpen]); // Dependencies are critical here

  // 3. Auto-Focus Tag Input Logic
  // We use a small timeout to allow the Dropdown DIV to render before trying to focus the input inside it.
  useEffect(() => {
    if (isTagMenuOpen) {
      setTagSearch(''); // Clear search on open
      // FIX: Ensure focus happens after render cycle
      setTimeout(() => {
        tagInputRef.current?.focus();
      }, 50);
    }
  }, [isTagMenuOpen]);

  // 4. Data Processing (Tags & Filters)
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    bookmarks.forEach(b => {
      b.tags.forEach(t => tags.add(t.name));
    });
    return Array.from(tags).sort();
  }, [bookmarks]);

  const visibleTags = useMemo(() => {
    if (!tagSearch) return allTags;
    return allTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()));
  }, [allTags, tagSearch]);

  const filteredBookmarks = useMemo(() => {
    let result = bookmarks;
    if (selectedTag) {
      result = result.filter(b => b.tags.some(t => t.name === selectedTag));
    }
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(b =>
        b.title?.toLowerCase().includes(lowerSearch) ||
        b.url.toLowerCase().includes(lowerSearch) ||
        b.tags.some(t => t.name.toLowerCase().includes(lowerSearch))
      );
    }
    return result;
  }, [search, bookmarks, selectedTag]);

  // 5. Handlers (Import/Export/Tag Select)
  const handleImportClick = () => {
    fileInputRef.current?.click();
    setIsSettingsOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`Import bookmarks from "${file.name}"?`)) {
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      await api.post('/system/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Import successful!');
      fetchBookmarks();
    } catch (error) {
      alert('Failed to import file');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleExport = async () => {
    setIsSettingsOpen(false);
    try {
      const response = await api.get('/system/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'bookmarks.html');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Failed to export bookmarks");
    }
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTag(tag);
    setIsTagMenuOpen(false);
    setTagSearch('');
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Tab' || e.key === 'Enter') && visibleTags.length > 0) {
      e.preventDefault();
      handleTagSelect(visibleTags[0]);
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Are you sure?")) return;
    try {
      await api.delete(`/bookmarks/${id}`);
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      alert("Failed to delete");
    }
  };

  const handleAddSuccess = (newBookmark: Bookmark) => setBookmarks(prev => [newBookmark, ...prev]);
  const handleEditSuccess = (updatedBookmark: Bookmark) => setBookmarks(prev => prev.map(b => b.id === updatedBookmark.id ? updatedBookmark : b));

  return (
    <div className="min-h-screen p-6 md:p-10 w-full" onClick={() => { setIsTagMenuOpen(false); setIsSettingsOpen(false); }}>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".html" />

      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between" onClick={e => e.stopPropagation()}>
        <div>
          <h1 className="text-3xl font-bold">My Bookmarks</h1>
          <p className="text-gray-400 text-sm">
            {filteredBookmarks.length} {filteredBookmarks.length === 1 ? 'link' : 'links'} found
            {selectedTag && <span className="ml-2 text-primary">(Filtered by #{selectedTag})</span>}
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">

          {/* SEARCH BAR - FIX: Added ref back */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search... (Press '/')"
              className="w-full rounded-md bg-surface py-2 pl-10 pr-4 text-text focus:outline-none focus:ring-2 focus:ring-primary md:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* TAGS BUTTON */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsTagMenuOpen(!isTagMenuOpen); setIsSettingsOpen(false); }}
              className={`flex items-center gap-2 rounded-md border p-2 text-sm font-medium transition-colors ${
                selectedTag ? 'border-primary bg-primary/20 text-primary' : 'border-transparent bg-surface text-gray-400 hover:text-white'
              }`}
            >
              <Tags size={18} />
              {selectedTag || "Tags"}
              {selectedTag && (
                <div onClick={(e) => { e.stopPropagation(); setSelectedTag(null); }} className="ml-1 rounded-full p-0.5 hover:bg-black/20">
                  <X size={14} />
                </div>
              )}
            </button>

            {/* TAGS MENU */}
            {isTagMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 max-h-80 w-56 overflow-hidden rounded-md border border-gray-600 bg-surface shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="border-b border-gray-700 p-2">
                  <input
                    ref={tagInputRef} // FIX: Ensure this ref is attached
                    type="text"
                    placeholder="Find tag..."
                    className="w-full rounded bg-background px-2 py-1 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                  />
                </div>
                <div className="overflow-y-auto max-h-60">
                  {visibleTags.length === 0 ? (
                    <div className="p-3 text-center text-sm text-gray-500">No matching tags</div>
                  ) : (
                    visibleTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleTagSelect(tag)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-primary hover:text-white transition-colors ${selectedTag === tag ? 'bg-primary/20 text-primary' : 'text-text'}`}
                      >
                        #{tag}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* VIEW TOGGLE */}
          <div className="flex gap-2 rounded-md bg-surface p-1">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400'}`}>
              <LayoutGrid size={20} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400'}`}>
              <List size={20} />
            </button>
          </div>

          {/* SETTINGS MENU */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); setIsTagMenuOpen(false); }}
              className={`p-2 rounded-md transition-colors ${isSettingsOpen ? 'bg-surface text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Settings size={20} />
            </button>
            {isSettingsOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-md border border-gray-600 bg-surface shadow-xl">
                <button onClick={handleImportClick} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 hover:bg-primary hover:text-white">
                  <Upload size={16} /> Import Bookmarks
                </button>
                <button onClick={handleExport} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 hover:bg-primary hover:text-white">
                  <Download size={16} /> Export Bookmarks
                </button>
                <div className="my-1 border-t border-gray-700"></div>
                 <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-400 hover:bg-red-400/10">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* REST OF UI (Grid, Modals) */}
      {loading ? (
        <div className="text-center text-gray-500 mt-20">Loading your library...</div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          {search || selectedTag ? "No matches found." : "No bookmarks yet. Add one!"}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col"}>
          {filteredBookmarks.map(b => (
            <BookmarkCard key={b.id} bookmark={b} viewMode={viewMode} onDelete={handleDelete} onEdit={setEditingBookmark} />
          ))}
        </div>
      )}

      <button onClick={() => setIsAddModalOpen(true)} className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:scale-110 transition-transform z-40">
        <Plus size={28} />
      </button>

      <AddBookmarkModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={handleAddSuccess} existingTags={allTags} />
      <EditBookmarkModal bookmark={editingBookmark} onClose={() => setEditingBookmark(null)} onSuccess={handleEditSuccess} existingTags={allTags} />
    </div>
  );
};
