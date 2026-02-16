import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, Image as ImageIcon, ChevronRight } from 'lucide-react';
import axios from 'axios';

interface IconRecord {
  id: string;
  name: string;
  filename: string;
  tags: string;
  description: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconUrl: string) => void;
  endpoint: string;
  collection: string;
  location: string;
}

export const IconSelectionModal: React.FC<Props> = ({ isOpen, onClose, onSelect, endpoint, collection, location }) => {
  const [search, setSearch] = useState('');
  const [icons, setIcons] = useState<IconRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const searchTimeout = useRef<number | null>(null);

  const fetchIcons = async (pageNum: number, searchQuery: string) => {
    if (!endpoint || !collection) return;
    setLoading(true);
    try {
      // PocketBase List/Search API: /api/collections/<collection>/records
      const apiUrl = `${endpoint}/api/collections/${collection}/records`;
      
      const filter = searchQuery
        ? `(name ~ "${searchQuery}" || tags ~ "${searchQuery}" || description ~ "${searchQuery}")`
        : '';

      const response = await axios.get(apiUrl, {
        params: {
          page: pageNum,
          perPage: 12,
          filter: filter,
          sort: '-created'
        }
      });

      const { items, totalItems: total } = response.data;

      if (pageNum === 1) {
        setIcons(items);
      } else {
        setIcons(prev => [...prev, ...items]);
      }

      setTotalItems(total);
      setHasMore(items.length === 12 && (pageNum * 12) < total);
    } catch (err) {
      console.error("Failed to fetch icons from collection:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && endpoint && collection) {
      setPage(1);
      fetchIcons(1, search);
    }
  }, [isOpen, endpoint, collection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);

    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);

    searchTimeout.current = window.setTimeout(() => {
      setPage(1);
      fetchIcons(1, value);
    }, 500);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchIcons(nextPage, search);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-surface p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 border border-gray-700 max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-text">
          <X size={24} />
        </button>

        <h2 className="mb-6 text-2xl font-bold flex items-center gap-2">
          <ImageIcon className="text-primary" /> Select Icon from Collection
        </h2>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input
            type="text"
            className="w-full rounded-lg border border-gray-600 bg-background p-3 pl-10 text-text focus:border-primary focus:outline-none"
            placeholder="Search by name, tags, or description..."
            value={search}
            onChange={handleSearchChange}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {icons.length === 0 && !loading ? (
            <div className="text-center py-10 text-gray-500">No icons found matching your search.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {icons.map((icon) => (
                <button
                  key={icon.id}
                  onClick={() => onSelect(`${location}/${icon.filename}`)}
                  className="group flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all"
                  title={icon.description || icon.name}
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-background rounded-md overflow-hidden border border-gray-700 group-hover:border-primary/50">
                    <img
                      src={`${location}/${icon.filename}`}
                      alt={icon.name}
                      className="w-10 h-10 object-contain"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 truncate w-full text-center group-hover:text-text">
                    {icon.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                className="flex items-center gap-2 px-6 py-2 bg-gray-700/50 hover:bg-gray-700 text-text rounded-lg transition-colors border border-gray-600"
              >
                Load More Icons <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          Showing {icons.length} of {totalItems} icons
        </div>
      </div>
    </div>
  );
};
