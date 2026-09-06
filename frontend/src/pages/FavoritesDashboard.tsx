import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { Responsive as ResponsiveGridLayout, type Layout, type LayoutItem } from 'react-grid-layout';
import { Home, Edit, Save, Info, ListTodo, Layout as LucideLayout, Search, X, Settings } from 'lucide-react';
import { FavoriteBookmarkCard } from '../components/FavoriteBookmarkCard';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useTheme, Theme } from '../hooks/useTheme';
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal';
import { SettingsModal } from '../components/SettingsModal';
import { useAuthStore } from '../store/authStore';
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

  // Search bar states & refs
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFavoriteIndex, setSelectedFavoriteIndex] = useState<number>(-1);
  const [searchOpenNewTab, setSearchOpenNewTab] = useState(() => {
    return localStorage.getItem('search_open_new_tab') === 'true';
  });
  const [defaultEngine, setDefaultEngine] = useState(() => {
    return localStorage.getItem('alpaca_default_search_engine') || 'Google';
  });
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedFavoriteIndex(-1);
  }, [searchQuery]);

  useEffect(() => {
    const handleStorageChange = () => {
      setSearchOpenNewTab(localStorage.getItem('search_open_new_tab') === 'true');
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
        const [favRes, savedLayouts] = await Promise.all([
          api.get<Bookmark[]>('/bookmarks?tag=Favorites'),
          getLayoutsFromServer()
        ]);

        const favoritesData = favRes.data;
        setFavorites(favoritesData);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (['Backspace', 'f', 'h'].includes(e.key) && !isTyping) {
        e.preventDefault();
        navigate('/');
      }
      if (e.key === 'Escape') {
        if (isInfoModalOpen) { setIsInfoModalOpen(false); }
        if (isConfigModalOpen) { setIsConfigModalOpen(false); }
        if (isContextMenuOpen) { setIsContextMenuOpen(false); }
        if (searchQuery) { setSearchQuery(''); }
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
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
  }, [navigate, isInfoModalOpen, isConfigModalOpen, isContextMenuOpen, searchQuery]);

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

  const handleEnterEditMode = () => {
    setSearchQuery(''); // Ensure all tiles are visible when editing layout
    layoutChanges.current = null;
    const editableLayout: Layouts = {};
    for (const bp of Object.keys(layouts)) {
        if (layouts[bp]) {
            editableLayout[bp] = layouts[bp]!.map(item => ({
                ...item,
                static: false,
            }));
        }
    }
    setLayouts(editableLayout);
    setIsEditMode(true);
  };

  const handleSave = async () => {
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
  };

  const handleRemoveFavorite = async (id: number) => {
    const bookmark = favorites.find(f => f.id === id);
    if (!bookmark) return;

    const newTags = bookmark.tags.filter(t => t.name !== 'Favorites').map(t => t.name);

    try {
      await api.put(`/bookmarks/${id}`, {
        ...bookmark,
        tags: newTags
      });
      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error("Failed to remove from favorites", error);
      alert("Failed to remove from favorites");
    }
  };

  const handleConfigSave = async (
    newLimit: number,
    newTheme: Theme,
    newTileSize: number,
    newShowUrl: boolean,
    newSearchOpenNewTab: boolean
  ) => {
    localStorage.setItem('bookmarks_limit', newLimit.toString());
    localStorage.setItem('tile_size', newTileSize.toString());
    localStorage.setItem('show_url', newShowUrl.toString());
    localStorage.setItem('search_open_new_tab', newSearchOpenNewTab.toString());
    setTheme(newTheme);
    setSearchOpenNewTab(newSearchOpenNewTab);
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFavoriteIndex >= 0 && selectedFavoriteIndex < filteredFavorites.length) {
      openUrlFromSearch(filteredFavorites[selectedFavoriteIndex].url);
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
      } else if (selectedFavoriteIndex >= 0 && selectedFavoriteIndex < filteredFavorites.length) {
        openUrlFromSearch(filteredFavorites[selectedFavoriteIndex].url);
      }
      return;
    }

    if (searchQuery.trim() && filteredFavorites.length > 0) {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedFavoriteIndex(prev => (prev <= 0 ? filteredFavorites.length - 1 : prev - 1));
        } else {
          setSelectedFavoriteIndex(prev => (prev + 1) % filteredFavorites.length);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedFavoriteIndex(prev => (prev + 1) % filteredFavorites.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedFavoriteIndex(prev => (prev <= 0 ? filteredFavorites.length - 1 : prev - 1));
      } else if (e.key === 'Enter') {
        if (selectedFavoriteIndex >= 0 && selectedFavoriteIndex < filteredFavorites.length) {
          e.preventDefault();
          openUrlFromSearch(filteredFavorites[selectedFavoriteIndex].url);
        }
      } else if (e.key === 'Escape') {
        setSelectedFavoriteIndex(-1);
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

  // Filter favorites based on search query
  const filteredFavorites = favorites.filter(fav => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      fav.title.toLowerCase().includes(q) ||
      fav.url.toLowerCase().includes(q) ||
      (fav.description && fav.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 bg-background min-h-screen">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Alpaca Favorites</h1>
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-text hover:bg-primary hover:text-white transition-colors">
            <Home size={20} />
            <span>Dashboard</span>
          </Link>

          <Link to="/todos" className="flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-text hover:bg-primary hover:text-white transition-colors">
            <ListTodo size={20} />
            <span>Todo List</span>
          </Link>

          <Link to="/kanban" className="flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-text hover:bg-primary hover:text-white transition-colors">
            <LucideLayout size={20} />
            <span>Kanban</span>
          </Link>

          {isEditMode ? (
            <button onClick={handleSave} className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 transition-colors">
              <Save size={20} />
              <span>Save</span>
            </button>
          ) : (
            <button onClick={handleEnterEditMode} className="flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 transition-colors">
              <Edit size={20} />
              <span>Edit</span>
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-white transition-colors"
              title="Settings"
            >
              <Settings size={22} />
            </button>
          </div>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsInfoModalOpen(true); }}
              className="p-2 rounded-md text-gray-400 hover:text-white transition-colors"
              title="Keyboard Shortcuts"
            >
              <Info size={28} />
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
              placeholder={`Search ${defaultEngine} or filter favorites (Right-click to change engine)...`}
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
      ) : filteredFavorites.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          {favorites.length === 0
            ? 'No favorite bookmarks found. Tag bookmarks as "Favorites" to display them here.'
            : 'No favorites match your search filter.'}
        </div>
      ) : (
        <div ref={gridRef}>
          <ResponsiveGridLayout
            key={searchQuery.trim() ? `search-${searchQuery.trim()}` : 'all-favorites'}
            className="layout"
            layouts={layouts}
            onLayoutChange={onLayoutChange}
            onBreakpointChange={(bp) => setBreakpoint(bp as keyof typeof cols)}
            breakpoints={breakpoints}
            cols={cols}
            rowHeight={120}
            width={gridWidth}
          >
            {filteredFavorites.map((fav, index) => {
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
        onSave={handleConfigSave}
      />
    </div>
  );
};
