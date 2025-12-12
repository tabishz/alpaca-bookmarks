import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { BookmarkCard } from '../components/BookmarkCard';
import { LayoutGrid, List, Plus, Search, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { AddBookmarkModal } from '../components/AddBookmarkModal';

export const Dashboard = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const logout = useAuthStore(state => state.logout);

  // 1. Load Data
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

  // Handler for when a new bookmark is created
  const handleAddSuccess = (newBookmark: Bookmark) => {
    // Optimistic update: Add to list immediately
    setBookmarks(prev => [newBookmark, ...prev]);
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  // 2. Search Logic (Hot Key '/')
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. Filtering Logic (Memoized for performance)
  const filteredBookmarks = useMemo(() => {
    if (!search) return bookmarks;
    const lowerSearch = search.toLowerCase();

    return bookmarks.filter(b =>
      b.title?.toLowerCase().includes(lowerSearch) ||
      b.url.toLowerCase().includes(lowerSearch) ||
      b.tags.some(t => t.name.toLowerCase().includes(lowerSearch))
    );
  }, [search, bookmarks]);

  // 4. Delete Handler
  const handleDelete = async (id: number) => {
    if(!confirm("Are you sure?")) return;
    try {
      await api.delete(`/bookmarks/${id}`);
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      alert("Failed to delete");
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Bookmarks</h1>
          <p className="text-gray-400 text-sm">{bookmarks.length} links saved</p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Search Bar */}
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

          {/* View Toggles */}
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

      {/* Content */}
      {loading ? (
        <div className="text-center text-gray-500 mt-20">Loading your library...</div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          {search ? "No matches found." : "No bookmarks yet. Add one!"}
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "flex flex-col"
        }>
          {filteredBookmarks.map(b => (
            <BookmarkCard key={b.id} bookmark={b} viewMode={viewMode} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <button
        onClick={() => setIsModalOpen(true)} // Open modal on click
        className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:scale-110 transition-transform z-40"
      >
        <Plus size={28} />
      </button>

      <AddBookmarkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Floating Action Button (Placeholder for Add Modal) */}
      <button className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:scale-110 transition-transform">
        <Plus size={28} />
      </button>
    </div>
  );
};
