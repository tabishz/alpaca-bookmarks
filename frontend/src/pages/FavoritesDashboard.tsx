import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { Responsive as ResponsiveGridLayout, type Layout, type LayoutItem } from 'react-grid-layout';
import {
  Home, Edit, Save, Info, ListTodo, Kanban, Search, X, Settings,
  Palette, Sliders, Heart, ExternalLink, Globe, Pencil, LayoutGrid, List,
  Bookmark as BookmarkIcon
} from 'lucide-react';
import { failedIconCache, iconCache, inFlightRequests } from '../utils/cache';
import { FavoriteBookmarkCard } from '../components/FavoriteBookmarkCard';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useTheme, Theme } from '../hooks/useTheme';
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal';
import { SettingsModal } from '../components/SettingsModal';
import { EditBookmarkModal } from '../components/EditBookmarkModal';
import { PageBackgroundModal } from '../components/PageBackgroundModal';
import { PageBackground } from '../components/PageBackground';
import { usePageBackground } from '../hooks/usePageBackground';
import { useAuthStore } from '../store/authStore';
import { useTags } from '../hooks/useTags';
import { formatAndValidateUrl } from '../utils/url';

type Layouts = Partial<Record<string, readonly LayoutItem[]>>;

const SEARCH_ENGINES = [
  { name: 'Google', url: 'https://www.google.com/search?q=' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { name: 'Brave', url: 'https://search.brave.com/search?q=' },
  { name: 'Bing', url: 'https://www.bing.com/search?q=' },
];

const getLayoutsFromServer = async (): Promise<Layouts> => {
    try {
        const res = await api.get<Layouts | string>('/user/layout', {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
        if (typeof res.data === 'string' && res.data) {
            return JSON.parse(res.data);
        }
        if (typeof res.data === 'object' && res.data !== null) {
            return res.data as Layouts;
        }
        return {};
    } catch (e) {
        console.error('Failed to fetch layouts from server', e);
        return {};
    }
};

const saveLayoutsToServer = async (layouts: Layouts) => {
  await api.put('/user/layout', { layouts: JSON.stringify(layouts) });
};

const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 1 };

const SearchBookmarkIcon: React.FC<{ bookmark: Bookmark; className?: string }> = ({ bookmark, className = "h-8 w-8" }) => {
  const [iconSrc, setIconSrc] = useState<string | null>(bookmark.icon || iconCache.get(bookmark.id) || null);
  const [hasError, setHasError] = useState(failedIconCache.has(bookmark.id));

  useEffect(() => {
    setIconSrc(bookmark.icon || iconCache.get(bookmark.id) || null);
    setHasError(failedIconCache.has(bookmark.id));
  }, [bookmark.id, bookmark.icon]);

  useEffect(() => {
    if (iconSrc || hasError) return;
    if (inFlightRequests.has(bookmark.id)) return;

    inFlightRequests.add(bookmark.id);
    api.get(`/bookmarks/${bookmark.id}/icon`, { responseType: 'blob' })
      .then(res => {
        if (res.data.size > 0) {
          const url = URL.createObjectURL(res.data);
          setIconSrc(url);
          iconCache.set(bookmark.id, url);
        } else {
          setHasError(true);
          failedIconCache.add(bookmark.id);
        }
      })
      .catch(() => {
        setHasError(true);
        failedIconCache.add(bookmark.id);
      })
      .finally(() => {
        inFlightRequests.delete(bookmark.id);
      });
  }, [bookmark.id, iconSrc, hasError]);

  if (hasError || !iconSrc) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-700/60 text-gray-400 rounded-lg shrink-0`}>
        <Globe size={18} />
      </div>
    );
  }

  return (
    <img
      src={iconSrc}
      alt=""
      className={`${className} object-contain rounded-lg p-0.5 bg-surface shrink-0`}
      loading="lazy"
    />
  );
};

interface SearchMatchProps {
  bookmark: Bookmark;
  isFavorite: boolean;
  isSelected: boolean;
  onToggleFavorite: (bm: Bookmark, isFav: boolean) => void;
  onEdit: (bm: Bookmark) => void;
  onOpen: (url: string) => void;
}

const SearchMatchCard: React.FC<SearchMatchProps> = ({
  bookmark,
  isFavorite,
  isSelected,
  onToggleFavorite,
  onEdit,
  onOpen,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isSelected]);

  return (
    <div
      ref={cardRef}
      onClick={() => onOpen(bookmark.url)}
      className={`bookmark-tile group relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-xl ${
        isSelected
          ? 'ring-2 ring-primary border-primary shadow-2xl scale-[1.02] bg-surface'
          : 'border-gray-700/60 hover:border-primary/80'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <SearchBookmarkIcon bookmark={bookmark} className="h-9 w-9" />
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onToggleFavorite(bookmark, isFavorite)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                isFavorite
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-surface text-gray-400 border border-gray-700 hover:text-red-400 hover:border-red-400/50'
              }`}
              title={isFavorite ? 'In Favorites (click to remove)' : 'Click to add to Favorites'}
            >
              <Heart size={12} className={isFavorite ? 'fill-current text-red-400' : ''} />
              <span className="text-[11px]">{isFavorite ? 'Favorite' : 'Add to Fav'}</span>
            </button>
            <button
              onClick={() => onEdit(bookmark)}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Edit Bookmark"
            >
              <Pencil size={13} />
            </button>
          </div>
        </div>

        <h3
          className="text-sm font-bold text-text line-clamp-2 group-hover:text-primary transition-colors mb-1"
          title={bookmark.title}
        >
          {bookmark.title || 'Untitled'}
        </h3>
        <p className="text-xs text-gray-400 font-mono truncate mb-2" title={bookmark.url}>
          {bookmark.url.replace(/^https?:\/\/(www\.)?/, '')}
        </p>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-700/40 flex items-center justify-between">
        <div className="flex flex-wrap gap-1 max-w-[80%] overflow-hidden">
          {bookmark.tags?.slice(0, 3).map(t => (
            <span
              key={t.id}
              className="text-[10px] px-1.5 py-0.5 rounded bg-background/80 text-gray-400 border border-gray-700/40"
            >
              #{t.name}
            </span>
          ))}
          {(bookmark.tags?.length || 0) > 3 && (
            <span className="text-[10px] text-gray-500">+{bookmark.tags.length - 3}</span>
          )}
        </div>
        <ExternalLink size={13} className="text-gray-500 group-hover:text-primary transition-colors shrink-0" />
      </div>
    </div>
  );
};

const SearchMatchRow: React.FC<SearchMatchProps> = ({
  bookmark,
  isFavorite,
  isSelected,
  onToggleFavorite,
  onEdit,
  onOpen,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isSelected]);

  return (
    <div
      ref={rowRef}
      onClick={() => onOpen(bookmark.url)}
      className={`bookmark-tile group flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 shadow-sm ${
        isSelected
          ? 'ring-2 ring-primary border-primary shadow-xl bg-surface'
          : 'border-gray-700/60 hover:border-primary/80 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SearchBookmarkIcon bookmark={bookmark} className="h-7 w-7" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-text truncate group-hover:text-primary transition-colors">
              {bookmark.title || 'Untitled'}
            </h4>
            {isFavorite && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium shrink-0">
                <Heart size={10} className="fill-current" /> Fav
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 font-mono truncate" title={bookmark.url}>
            {bookmark.url.replace(/^https?:\/\/(www\.)?/, '')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="hidden sm:flex items-center gap-1">
          {bookmark.tags?.slice(0, 2).map(t => (
            <span
              key={t.id}
              className="text-[10px] px-1.5 py-0.5 rounded bg-background/80 text-gray-400 border border-gray-700/40"
            >
              #{t.name}
            </span>
          ))}
        </div>

        <button
          onClick={() => onToggleFavorite(bookmark, isFavorite)}
          className={`p-1.5 rounded-lg transition-colors ${
            isFavorite ? 'text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-400 hover:bg-white/10'
          }`}
          title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <Heart size={15} className={isFavorite ? 'fill-current' : ''} />
        </button>
        <button
          onClick={() => onEdit(bookmark)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Edit"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onOpen(bookmark.url)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
          title="Open Link"
        >
          <ExternalLink size={15} />
        </button>
      </div>
    </div>
  );
};

export const FavoritesDashboard = () => {
  const { theme, setTheme } = useTheme();
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [layouts, setLayouts] = useState<Layouts>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [breakpoint, setBreakpoint] = useState<keyof typeof cols>('lg');
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(1200);
  const layoutChanges = useRef<Layouts | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPageBgModalOpen, setIsPageBgModalOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const { bgConfig, saveBgConfig } = usePageBackground('favorites');
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const { allTags, fetchTags } = useTags();

  // Search bar states & refs
  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>([]);
  const [searchFilterTab, setSearchFilterTab] = useState<'all' | 'favorites' | 'other'>('all');
  const [searchViewMode, setSearchViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFavoriteIndex, setSelectedFavoriteIndex] = useState<number>(-1);
  const [searchOpenNewTab, setSearchOpenNewTab] = useState(() => {
    return localStorage.getItem('search_open_new_tab') === 'true';
  });
  const [tileOpacity, setTileOpacity] = useState(() => {
    const saved = localStorage.getItem('tile_opacity');
    if (!saved) return 100;
    const parsed = parseFloat(saved);
    return !isNaN(parsed) ? (parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed)) : 100;
  });
  const [defaultEngine, setDefaultEngine] = useState(() => {
    return localStorage.getItem('alpaca_default_search_engine') || 'Google';
  });
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.style.setProperty('--tile-opacity', `${tileOpacity}%`);
  }, [tileOpacity]);

  useEffect(() => {
    setSelectedFavoriteIndex(-1);
  }, [searchQuery]);

  useEffect(() => {
    const handleStorageChange = () => {
      setSearchOpenNewTab(localStorage.getItem('search_open_new_tab') === 'true');
      const savedOpacity = localStorage.getItem('tile_opacity');
      if (savedOpacity) {
        const parsed = parseFloat(savedOpacity);
        const val = !isNaN(parsed) ? (parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed)) : 100;
        setTileOpacity(val);
        document.documentElement.style.setProperty('--tile-opacity', `${val}%`);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auto-focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setIsContextMenuOpen(false);
    if (isContextMenuOpen) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isContextMenuOpen]);

  useEffect(() => {
    const grid = gridRef.current;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setGridWidth(entries[0].contentRect.width);
      }
    });

    if (grid) {
      observer.observe(grid);
    }

    return () => {
      if (grid) {
        observer.unobserve(grid);
      }
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchFavoritesAndLayouts = async () => {
      setLoading(true);
      try {
        const [favRes, allRes, savedLayouts] = await Promise.all([
          api.get<Bookmark[]>('/bookmarks?tag=Favorites&limit=1000'),
          api.get<Bookmark[]>('/bookmarks?limit=2000'),
          getLayoutsFromServer()
        ]);

        const favoritesData = favRes.data;
        const allData = allRes.data;
        setFavorites(favoritesData);
        setAllBookmarks(allData);

        const newLayouts: Layouts = {};
        for (const bp of Object.keys(cols)) {
            const savedBpLayout = savedLayouts[bp] || [];
            newLayouts[bp] = favoritesData.map((fav, i) => {
                const existing = savedBpLayout.find(l => String(l.i) === String(fav.id));
                if (existing) {
                    return { ...existing, static: true };
                }
                const numCols = cols[bp as keyof typeof cols];
                const w = numCols > 1 ? 2 : 1;
                const y = numCols > 1 ? Math.floor(i / (numCols / w)) : i;

                return {
                    i: String(fav.id),
                    x: (i * w) % numCols,
                    y,
                    w,
                    h: 1,
                    minW: 1,
                    minH: 1,
                    static: true,
                };
            });
        }
        setLayouts(newLayouts);

      } catch (error) {
        console.error("Failed to fetch favorites or layouts", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoritesAndLayouts();
  }, []);

  const onLayoutChange = useCallback((_layout: Layout, allLayouts: Layouts) => {
    // If filtering/searching, do NOT overwrite the full layouts!
    if (searchQuery.trim()) {
      return;
    }
    // Safeguard: do not overwrite with a partial layout having fewer items than favorites
    const currentBpLayout = allLayouts[breakpoint] || allLayouts.lg;
    if (favorites.length > 0 && currentBpLayout && currentBpLayout.length < favorites.length) {
      return;
    }

    layoutChanges.current = allLayouts;
    setLayouts(allLayouts);
  }, [searchQuery, breakpoint, favorites.length]);

  const handleEnterEditMode = useCallback(() => {
    setSearchQuery(''); // Ensure all tiles are visible when editing layout
    layoutChanges.current = null;
    setLayouts(prev => {
      const editableLayout: Layouts = {};
      for (const bp of Object.keys(prev)) {
        if (prev[bp]) {
          editableLayout[bp] = prev[bp]!.map(item => ({
            ...item,
            static: false,
          }));
        }
      }
      return editableLayout;
    });
    setIsEditMode(true);
  }, []);

  const handleSave = useCallback(async () => {
    // Use the latest layout from the ref, or the state if no changes were made.
    const finalLayout = layoutChanges.current || layouts;

    const staticLayout: Layouts = {};
    for (const bp of Object.keys(finalLayout)) {
      if (finalLayout[bp]) {
        staticLayout[bp] = finalLayout[bp]!.map(item => ({
          ...item,
          static: true,
        }));
      }
    }

    try {
      await saveLayoutsToServer(staticLayout);
      setLayouts(staticLayout);
      setIsEditMode(false);
      layoutChanges.current = null;
    } catch (e) {
      console.error("Failed to save", e);
    }
  }, [layouts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (['Backspace', 'f', 'h'].includes(e.key) && !isTyping) {
        e.preventDefault();
        navigate('/');
      }
      if (e.key === 'Escape') {
        if (isPageBgModalOpen) { setIsPageBgModalOpen(false); }
        if (isSettingsMenuOpen) { setIsSettingsMenuOpen(false); }
        if (isInfoModalOpen) { setIsInfoModalOpen(false); }
        if (isConfigModalOpen) { setIsConfigModalOpen(false); }
        if (editingBookmark) { setEditingBookmark(null); }
        if (isContextMenuOpen) { setIsContextMenuOpen(false); }
        if (searchQuery) { setSearchQuery(''); }
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
      if (e.key.toLowerCase() === 'e' && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (isEditMode) {
          handleSave();
        } else {
          handleEnterEditMode();
        }
      }
      if (e.key === 'i' && !isTyping) {
        if (isInfoModalOpen) { setIsInfoModalOpen(false); }
        else { setIsInfoModalOpen(true); }
      }
      if (e.key === 'd' && !isTyping) {
        e.preventDefault();
        navigate('/todos');
      }
      if (e.key === 'k' && !isTyping) {
        e.preventDefault();
        navigate('/kanban');
      }
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, isInfoModalOpen, isConfigModalOpen, editingBookmark, isContextMenuOpen, searchQuery, isEditMode, handleSave, handleEnterEditMode]);

  const handleRemoveFavorite = async (id: number) => {
    const bookmark = allBookmarks.find(f => f.id === id) || favorites.find(f => f.id === id);
    if (!bookmark) return;

    const newTags = (bookmark.tags || []).filter(t => t.name !== 'Favorites').map(t => t.name);

    try {
      const res = await api.put(`/bookmarks/${id}`, {
        ...bookmark,
        tags: newTags
      });
      const updated = res.data;
      setFavorites(prev => prev.filter(f => f.id !== id));
      setAllBookmarks(prev => prev.map(b => b.id === id ? updated : b));
    } catch (error) {
      console.error("Failed to remove from favorites", error);
      alert("Failed to remove from favorites");
    }
  };

  const handleToggleFavorite = async (bookmark: Bookmark, isFav: boolean) => {
    const favoriteTagName = 'Favorites';
    let newTags: string[];
    if (isFav) {
      newTags = (bookmark.tags || []).filter(t => t.name !== favoriteTagName).map(t => t.name);
    } else {
      newTags = [...(bookmark.tags || []).map(t => t.name), favoriteTagName];
    }

    try {
      const response = await api.put(`/bookmarks/${bookmark.id}`, {
        ...bookmark,
        tags: newTags
      });
      const updated = response.data;
      setAllBookmarks(prev => prev.map(b => b.id === updated.id ? updated : b));
      if (isFav) {
        setFavorites(prev => prev.filter(f => f.id !== bookmark.id));
      } else {
        setFavorites(prev => {
          if (prev.some(f => f.id === updated.id)) return prev;
          return [...prev, updated];
        });
      }
    } catch (err) {
      console.error("Failed to toggle favorite status", err);
    }
  };

  const handleEditSuccess = (updatedBookmark: Bookmark) => {
    const isStillFavorite = updatedBookmark.tags?.some(t => t.name.toLowerCase() === 'favorites');
    if (isStillFavorite) {
      setFavorites(prev => {
        if (prev.some(b => b.id === updatedBookmark.id)) {
          return prev.map(b => b.id === updatedBookmark.id ? updatedBookmark : b);
        }
        return [...prev, updatedBookmark];
      });
    } else {
      setFavorites(prev => prev.filter(b => b.id !== updatedBookmark.id));
    }
    setAllBookmarks(prev => prev.map(b => b.id === updatedBookmark.id ? updatedBookmark : b));
    fetchTags();
  };

  const handleConfigSave = async (
    newLimit: number,
    newTheme: Theme,
    newTileSize: number,
    newShowUrl: boolean,
    newSearchOpenNewTab: boolean,
    newTileOpacity: number = 100
  ) => {
    localStorage.setItem('bookmarks_limit', newLimit.toString());
    localStorage.setItem('tile_size', newTileSize.toString());
    localStorage.setItem('show_url', newShowUrl.toString());
    localStorage.setItem('search_open_new_tab', newSearchOpenNewTab.toString());
    localStorage.setItem('tile_opacity', newTileOpacity.toString());
    setTheme(newTheme);
    setSearchOpenNewTab(newSearchOpenNewTab);
    setTileOpacity(newTileOpacity);
    document.documentElement.style.setProperty('--tile-opacity', `${newTileOpacity}%`);
    try {
      await api.patch('/user/preferences', { theme: newTheme });
      if (user) {
        updateUser({ ...user, theme: newTheme });
      }
    } catch {
      console.error("Failed to save theme preference to server");
    }
  };

  const openUrlFromSearch = (url: string) => {
    if (searchOpenNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  const isSearching = searchQuery.trim().length > 0;

  // Filter all bookmarks based on search query
  const searchMatches = useMemo(() => {
    if (!isSearching) return [];
    const q = searchQuery.toLowerCase().trim();
    return allBookmarks.filter(bm => {
      const inTitle = bm.title?.toLowerCase().includes(q);
      const inUrl = bm.url?.toLowerCase().includes(q);
      const inDesc = bm.description?.toLowerCase().includes(q);
      const inTags = bm.tags?.some(t => t.name.toLowerCase().includes(q));
      return inTitle || inUrl || inDesc || inTags;
    });
  }, [allBookmarks, searchQuery, isSearching]);

  const favoritesMatches = useMemo(() => {
    return searchMatches.filter(bm => bm.tags?.some(t => t.name.toLowerCase() === 'favorites'));
  }, [searchMatches]);

  const otherMatches = useMemo(() => {
    return searchMatches.filter(bm => !bm.tags?.some(t => t.name.toLowerCase() === 'favorites'));
  }, [searchMatches]);

  const displayedMatches = useMemo(() => {
    if (searchFilterTab === 'favorites') return favoritesMatches;
    if (searchFilterTab === 'other') return otherMatches;
    return [...favoritesMatches, ...otherMatches];
  }, [searchFilterTab, favoritesMatches, otherMatches]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSearching && selectedFavoriteIndex >= 0 && selectedFavoriteIndex < displayedMatches.length) {
      openUrlFromSearch(displayedMatches[selectedFavoriteIndex].url);
      return;
    }
    if (!searchQuery.trim()) return;
    const engine = SEARCH_ENGINES.find(se => se.name === defaultEngine) || SEARCH_ENGINES[0];
    const searchUrl = engine.url + encodeURIComponent(searchQuery.trim());
    openUrlFromSearch(searchUrl);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Alt-Enter (Win/Linux) or Cmd-Enter (Mac) opens the typed URL if valid
    const isCmdOrAlt = e.metaKey || e.altKey;
    if (isCmdOrAlt && e.key === 'Enter') {
      e.preventDefault();
      const validUrl = formatAndValidateUrl(searchQuery);
      if (validUrl) {
        openUrlFromSearch(validUrl);
      } else if (isSearching && selectedFavoriteIndex >= 0 && selectedFavoriteIndex < displayedMatches.length) {
        openUrlFromSearch(displayedMatches[selectedFavoriteIndex].url);
      }
      return;
    }

    if (e.key === 'Escape') {
      setSelectedFavoriteIndex(-1);
      setSearchQuery('');
      searchInputRef.current?.blur();
      return;
    }

    if (isSearching && displayedMatches.length > 0) {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedFavoriteIndex(prev => (prev <= 0 ? displayedMatches.length - 1 : prev - 1));
        } else {
          setSelectedFavoriteIndex(prev => (prev + 1) % displayedMatches.length);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedFavoriteIndex(prev => (prev + 1) % displayedMatches.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedFavoriteIndex(prev => (prev <= 0 ? displayedMatches.length - 1 : prev - 1));
      } else if (e.key === 'Enter') {
        if (selectedFavoriteIndex >= 0 && selectedFavoriteIndex < displayedMatches.length) {
          e.preventDefault();
          openUrlFromSearch(displayedMatches[selectedFavoriteIndex].url);
        }
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  };

  const selectEngine = (engineName: string) => {
    setDefaultEngine(engineName);
    localStorage.setItem('alpaca_default_search_engine', engineName);
    setIsContextMenuOpen(false);
  };

  return (
    <div
      className={`p-4 min-h-screen relative z-10 transition-colors ${
        bgConfig.type === 'none' ? 'bg-background' : 'bg-transparent'
      }`}
      onClick={() => setIsSettingsMenuOpen(false)}
    >
      <PageBackground bgConfig={bgConfig} />
      <header className="relative z-20 mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text flex items-center">
          <img src="/alpaca-bookmarks.png" alt="Alpaca Bookmarks" className="inline-block h-8 w-8 mr-2" />
          Alpaca Favorites
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md bg-surface px-3 sm:px-4 py-2 text-text border border-gray-700/50 hover:border-primary hover:bg-primary hover:text-white transition-colors shadow-sm"
            title="Dashboard"
          >
            <Home size={20} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <Link
            to="/todos"
            className="flex items-center gap-2 rounded-md bg-surface px-3 sm:px-4 py-2 text-text border border-gray-700/50 hover:border-primary hover:bg-primary hover:text-white transition-colors shadow-sm"
            title="Todo List"
          >
            <ListTodo size={20} />
            <span className="hidden sm:inline">Todo List</span>
          </Link>

          <Link
            to="/kanban"
            className="flex items-center gap-2 rounded-md bg-surface px-3 sm:px-4 py-2 text-text border border-gray-700/50 hover:border-primary hover:bg-primary hover:text-white transition-colors shadow-sm"
            title="Kanban"
          >
            <Kanban size={20} />
            <span className="hidden sm:inline">Kanban</span>
          </Link>

          {isEditMode ? (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-md bg-green-500 px-3 sm:px-4 py-2 text-white hover:bg-green-600 transition-colors shadow-sm"
              title="Save Changes"
            >
              <Save size={20} />
              <span className="hidden sm:inline">Save</span>
            </button>
          ) : (
            <button
              onClick={handleEnterEditMode}
              className="flex items-center gap-2 rounded-md bg-blue-500 px-3 sm:px-4 py-2 text-white hover:bg-blue-600 transition-colors shadow-sm"
              title="Edit Mode"
            >
              <Edit size={20} />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSettingsMenuOpen(!isSettingsMenuOpen);
              }}
              className={`p-2 rounded-md border border-gray-700/50 transition-colors shadow-sm ${
                isSettingsMenuOpen ? 'bg-surface text-white' : 'bg-surface text-gray-400 hover:text-white'
              }`}
              title="Page & Global Settings"
            >
              <Settings size={20} />
            </button>
            {isSettingsMenuOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-gray-700 bg-surface shadow-2xl py-1 animate-in fade-in zoom-in duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setIsPageBgModalOpen(true);
                    setIsSettingsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-text hover:bg-primary hover:text-white transition-colors"
                >
                  <Palette size={16} className="text-primary" />
                  <div>
                    <div className="font-medium">Page Background</div>
                    <div className="text-xs text-gray-400">Radial gradient & image</div>
                  </div>
                </button>
                <div className="border-t border-gray-700/50 my-1"></div>
                <button
                  onClick={() => {
                    setIsConfigModalOpen(true);
                    setIsSettingsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-text hover:bg-primary hover:text-white transition-colors"
                >
                  <Sliders size={16} className="text-gray-400" />
                  <div>
                    <div className="font-medium">Global Preferences</div>
                    <div className="text-xs text-gray-400">Theme, tiles, search</div>
                  </div>
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsInfoModalOpen(true); }}
              className="p-2 rounded-md border border-gray-700/50 bg-surface text-gray-400 hover:text-white transition-colors shadow-sm"
              title="Keyboard Shortcuts"
            >
              <Info size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Centered Search Bar Section */}
      <div className="w-full max-w-2xl mx-auto my-6 flex flex-col items-center">
        <form onSubmit={handleSearchSubmit} className="w-full relative">
          <div className="relative flex items-center shadow-lg rounded-full overflow-hidden bg-surface border border-gray-700 hover:border-primary transition-all duration-300">
            <div className="pl-5 text-primary">
              <Search size={20} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onContextMenu={handleContextMenu}
              placeholder={`Search ${defaultEngine} or search all bookmarks (Right-click to change engine)...`}
              className="w-full py-3.5 pl-3 pr-4 bg-transparent outline-none text-text placeholder-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                className="p-1 mr-2 text-gray-400 hover:text-text transition-colors"
                title="Clear search"
              >
                <X size={18} />
              </button>
            )}
            <button
              type="submit"
              className="bg-primary text-white font-semibold px-6 py-3.5 hover:opacity-90 transition-opacity rounded-r-full"
            >
              Search
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-1.5 text-center flex items-center justify-center gap-1">
            <span>Default engine: <strong className="text-primary">{defaultEngine}</strong></span>
            <span>•</span>
            <span className="italic">Right-click search bar to change</span>
          </div>
        </form>
      </div>

      {/* Context Menu for Choosing Search Engine */}
      {isContextMenuOpen && (
        <div
          className="fixed z-50 bg-surface border border-gray-700 rounded-lg shadow-2xl w-48 p-2"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-semibold px-2 py-1 text-gray-400">Select Search Engine</div>
          {SEARCH_ENGINES.map(engine => (
            <button
              key={engine.name}
              onClick={() => selectEngine(engine.name)}
              className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md hover:bg-primary hover:text-white transition-colors ${
                defaultEngine === engine.name ? 'font-bold text-primary bg-background/50' : 'text-text'
              }`}
            >
              <span>{engine.name}</span>
              {defaultEngine === engine.name && <span className="text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center text-text py-12">Loading Favorites...</div>
      ) : isSearching ? (
        <div className="w-full max-w-7xl mx-auto mt-2 pb-12">
          {/* Header Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-surface/80 border border-gray-700/60 rounded-xl p-3.5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-text">
                Results for &ldquo;<span className="text-primary">{searchQuery}</span>&rdquo;:
              </span>
              <div className="flex items-center gap-1 bg-background/60 p-1 rounded-lg border border-gray-700/40">
                <button
                  onClick={() => setSearchFilterTab('all')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    searchFilterTab === 'all'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All ({searchMatches.length})
                </button>
                <button
                  onClick={() => setSearchFilterTab('favorites')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    searchFilterTab === 'favorites'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Heart size={12} className="fill-current text-red-400" />
                  Favorites ({favoritesMatches.length})
                </button>
                <button
                  onClick={() => setSearchFilterTab('other')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    searchFilterTab === 'other'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Other Bookmarks ({otherMatches.length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-background/60 rounded-lg p-1 border border-gray-700/40">
                <button
                  onClick={() => setSearchViewMode('grid')}
                  className={`p-1.5 rounded ${searchViewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setSearchViewMode('list')}
                  className={`p-1.5 rounded ${searchViewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                  title="List View"
                >
                  <List size={16} />
                </button>
              </div>

              <button
                onClick={() => {
                  setSearchQuery('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                className="text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-surface transition-colors flex items-center gap-1 border border-gray-700/40"
                title="Clear search (Esc)"
              >
                <X size={14} /> Clear
              </button>
            </div>
          </div>

          {/* Results List / Grid */}
          {displayedMatches.length === 0 ? (
            <div className="text-center py-16 bg-surface/50 border border-gray-700/50 rounded-2xl p-8 max-w-xl mx-auto shadow-sm">
              <Search size={36} className="mx-auto text-gray-500 mb-3" />
              <p className="text-text font-semibold mb-1">No matching bookmarks found</p>
              <p className="text-sm text-gray-400 mb-6">
                No bookmarks match &ldquo;{searchQuery}&rdquo; in {searchFilterTab === 'all' ? 'your entire library' : searchFilterTab === 'favorites' ? 'favorites' : 'other bookmarks'}.
              </p>
              <button
                onClick={handleSearchSubmit}
                className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-md"
              >
                <ExternalLink size={15} /> Search &ldquo;{searchQuery}&rdquo; on {defaultEngine}
              </button>
            </div>
          ) : searchViewMode === 'grid' ? (
            searchFilterTab === 'all' && favoritesMatches.length > 0 && otherMatches.length > 0 ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-rose-400">
                    <Heart size={14} className="fill-rose-500 text-rose-500" />
                    <span>Favorites ({favoritesMatches.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {favoritesMatches.map((bm, index) => (
                      <SearchMatchCard
                        key={bm.id}
                        bookmark={bm}
                        isFavorite={true}
                        isSelected={index === selectedFavoriteIndex}
                        onToggleFavorite={handleToggleFavorite}
                        onEdit={setEditingBookmark}
                        onOpen={openUrlFromSearch}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <BookmarkIcon size={14} />
                    <span>Other Bookmarks ({otherMatches.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {otherMatches.map((bm, index) => (
                      <SearchMatchCard
                        key={bm.id}
                        bookmark={bm}
                        isFavorite={false}
                        isSelected={favoritesMatches.length + index === selectedFavoriteIndex}
                        onToggleFavorite={handleToggleFavorite}
                        onEdit={setEditingBookmark}
                        onOpen={openUrlFromSearch}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedMatches.map((bm, index) => (
                  <SearchMatchCard
                    key={bm.id}
                    bookmark={bm}
                    isFavorite={bm.tags?.some(t => t.name.toLowerCase() === 'favorites')}
                    isSelected={index === selectedFavoriteIndex}
                    onToggleFavorite={handleToggleFavorite}
                    onEdit={setEditingBookmark}
                    onOpen={openUrlFromSearch}
                  />
                ))}
              </div>
            )
          ) : (
            searchFilterTab === 'all' && favoritesMatches.length > 0 && otherMatches.length > 0 ? (
              <div className="max-w-4xl mx-auto space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-rose-400">
                    <Heart size={14} className="fill-rose-500 text-rose-500" />
                    <span>Favorites ({favoritesMatches.length})</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {favoritesMatches.map((bm, index) => (
                      <SearchMatchRow
                        key={bm.id}
                        bookmark={bm}
                        isFavorite={true}
                        isSelected={index === selectedFavoriteIndex}
                        onToggleFavorite={handleToggleFavorite}
                        onEdit={setEditingBookmark}
                        onOpen={openUrlFromSearch}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <BookmarkIcon size={14} />
                    <span>Other Bookmarks ({otherMatches.length})</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {otherMatches.map((bm, index) => (
                      <SearchMatchRow
                        key={bm.id}
                        bookmark={bm}
                        isFavorite={false}
                        isSelected={favoritesMatches.length + index === selectedFavoriteIndex}
                        onToggleFavorite={handleToggleFavorite}
                        onEdit={setEditingBookmark}
                        onOpen={openUrlFromSearch}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-w-4xl mx-auto">
                {displayedMatches.map((bm, index) => (
                  <SearchMatchRow
                    key={bm.id}
                    bookmark={bm}
                    isFavorite={bm.tags?.some(t => t.name.toLowerCase() === 'favorites')}
                    isSelected={index === selectedFavoriteIndex}
                    onToggleFavorite={handleToggleFavorite}
                    onEdit={setEditingBookmark}
                    onOpen={openUrlFromSearch}
                  />
                ))}
              </div>
            )
          )}
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          No favorite bookmarks found. Tag bookmarks as &ldquo;Favorites&rdquo; to display them here.
        </div>
      ) : (
        <div ref={gridRef}>
          <ResponsiveGridLayout
            key="all-favorites"
            className="layout"
            layouts={layouts}
            onLayoutChange={onLayoutChange}
            onBreakpointChange={(bp) => setBreakpoint(bp as keyof typeof cols)}
            breakpoints={breakpoints}
            cols={cols}
            rowHeight={120}
            width={gridWidth}
          >
            {favorites.map((fav, index) => {
              const currentLayout = layouts[breakpoint] || layouts.lg || [];
              const layoutItem = currentLayout.find(l => String(l.i) === String(fav.id));
              return (
                <div key={String(fav.id)}>
                  <FavoriteBookmarkCard
                    bookmark={fav}
                    width={layoutItem?.w || 2}
                    height={layoutItem?.h || 1}
                    isEditMode={isEditMode}
                    onRemoveFavorite={handleRemoveFavorite}
                    onEdit={setEditingBookmark}
                    isSelected={index === selectedFavoriteIndex}
                  />
                </div>
              );
            })}
          </ResponsiveGridLayout>
        </div>
      )}
      <KeyboardShortcutsModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
      <SettingsModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentLimit={50}
        currentTheme={theme}
        currentTileSize={280}
        currentShowUrl={true}
        currentSearchOpenNewTab={searchOpenNewTab}
        currentTileOpacity={tileOpacity}
        onSave={handleConfigSave}
        onOpenPageBgModal={() => setIsPageBgModalOpen(true)}
      />
      <PageBackgroundModal
        isOpen={isPageBgModalOpen}
        onClose={() => setIsPageBgModalOpen(false)}
        pageName="Favorites Dashboard"
        currentConfig={bgConfig}
        onSave={saveBgConfig}
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
