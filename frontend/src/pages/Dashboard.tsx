import React, { useEffect, useState, useMemo, useRef } from 'react';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { BookmarkCard } from '../components/BookmarkCard';
import { AddBookmarkModal } from '../components/AddBookmarkModal';
import { EditBookmarkModal } from '../components/EditBookmarkModal';
import { LayoutGrid, List, Plus, Search, LogOut, Tags, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const Dashboard = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);

  // Tag Filter State
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState(''); // NEW: Search text inside dropdown
  const tagInputRef = useRef<HTMLInputElement>(null); // NEW: Focus ref

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

  // 2. Global Search Hotkey ('/')
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. Auto-focus Tag Input when menu opens
  useEffect(() => {
    if (isTagMenuOpen) {
      setTagSearch(''); // Reset search on open
      setTimeout(() => tagInputRef.current?.focus(), 50); // Small delay for render
    }
  }, [isTagMenuOpen]);

  // 4. Calculate All Unique Tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    bookmarks.forEach(b => {
      b.tags.forEach(t => tags.add(t.name));
    });
    return Array.from(tags).sort();
  }, [bookmarks]);

  // 5. Calculate "Visible" Tags in Dropdown (Filtered by Tag Search)
  const visibleTags = useMemo(() => {
    if (!tagSearch) return allTags;
    return allTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()));
  }, [allTags, tagSearch]);

  // 6. Handle Tag Selection logic
  const handleTagSelect = (tag: string) => {
    setSelectedTag(tag);
    setIsTagMenuOpen(false);
    setTagSearch('');
  };

  // 7. Handle Tag Search Keydown (Tab/Enter support)
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Tab' || e.key === 'Enter') && visibleTags.length > 0) {
      e.preventDefault();
      handleTagSelect(visibleTags[0]); // Select first match
    }
  };

  // 8. Main Bookmark Filtering
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

  // Handlers
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
    <div className="min-h-screen p-6 md:p-10 w-full" onClick={() => setIsTagMenuOpen(false)}>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between" onClick={e => e.stopPropagation()}>
        <div>
          <h1 className="text-3xl font-bold">My Bookmarks</h1>
          <p className="text-gray-400 text-sm">
            {filteredBookmarks.length} {filteredBookmarks.length === 1 ? 'link' : 'links'} found
            {selectedTag && <span className="ml-2 text-primary">(Filtered by #{selectedTag})</span>}
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">

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

          {/* TAGS FILTER BUTTON */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsTagMenuOpen(!isTagMenuOpen); }}
              className={`flex items-center gap-2 rounded-md border p-2 text-sm font-medium transition-colors ${
                selectedTag
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-transparent bg-surface text-gray-400 hover:text-white'
              }`}
            >
              <Tags size={18} />
              {selectedTag || "Tags"}
              {selectedTag && (
                <div
                  onClick={(e) => { e.stopPropagation(); setSelectedTag(null); }}
                  className="ml-1 rounded-full p-0.5 hover:bg-black/20"
                >
                  <X size={14} />
                </div>
              )}
            </button>

            {/* TAGS DROPDOWN MENU */}
            {isTagMenuOpen && (
              <div
                className="absolute right-0 top-full z-20 mt-2 max-h-80 w-56 overflow-hidden rounded-md border border-gray-600 bg-surface shadow-xl animate-in fade-in zoom-in duration-100 flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Search Input Inside Dropdown */}
                <div className="border-b border-gray-700 p-2">
                  <input
                    ref={tagInputRef}
                    type="text"
                    placeholder="Find tag..."
                    className="w-full rounded bg-background px-2 py-1 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                  />
                </div>

                {/* Scrollable Tag List */}
                <div className="overflow-y-auto max-h-60">
                  {visibleTags.length === 0 ? (
                    <div className="p-3 text-center text-sm text-gray-500">No matching tags</div>
                  ) : (
                    visibleTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleTagSelect(tag)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-primary hover:text-white transition-colors ${
                          selectedTag === tag ? 'bg-primary/20 text-primary' : 'text-text'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* View Toggles & Logout */}
          <div className="flex gap-2 rounded-md bg-surface p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400'}`}>
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400'}`}>
              <List size={20} />
            </button>
          </div>

          <button onClick={logout} className="p-2 text-gray-400 hover:text-red-400" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-center text-gray-500 mt-20">Loading...</div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          {search || selectedTag ? "No matches found." : "No bookmarks yet."}
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "flex flex-col"
        }>
          {filteredBookmarks.map(b => (
            <BookmarkCard
              key={b.id}
              bookmark={b}
              viewMode={viewMode}
              onDelete={handleDelete}
              onEdit={setEditingBookmark}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:scale-110 transition-transform z-40"
      >
        <Plus size={28} />
      </button>

      <AddBookmarkModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
        existingTags={allTags}
      />

      <EditBookmarkModal
        bookmark={editingBookmark}
        onClose={() => setEditingBookmark(null)}
        onSuccess={handleEditSuccess}
        existingTags={allTags}
      />
    </div>
  );
};
