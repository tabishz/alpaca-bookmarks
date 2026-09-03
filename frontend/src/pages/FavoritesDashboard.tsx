import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { Responsive as ResponsiveGridLayout, type Layout, type LayoutItem } from 'react-grid-layout';
import { Home, Edit, Save, Info, ListTodo, Layout as LucideLayout, Settings, Sliders, ArrowRightLeft, Tags, LogOut, Search } from 'lucide-react';
import { FavoriteBookmarkCard } from '../components/FavoriteBookmarkCard';
import { SettingsModal } from '../components/SettingsModal';
import { DataImportExportModal } from '../components/DataImportExportModal';
import { useTheme, Theme } from '../hooks/useTheme';
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal';
import { useAuthStore } from '../store/authStore';

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
  useTheme();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuthStore();
  const [favorites, setFavorites] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [layouts, setLayouts] = useState<Layouts>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [breakpoint, setBreakpoint] = useState<keyof typeof cols>('lg');
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(1200);
  const layoutChanges = useRef<Layouts | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isDataImportExportModalOpen, setIsDataImportExportModalOpen] = useState(false);
  const [settingsStartView, setSettingsStartView] = useState<'settings' | 'tags'>('settings');
  
  // Search bar states & refs
  const [searchQuery, setSearchQuery] = useState('');
  const [defaultEngine, setDefaultEngine] = useState(() => {
    return localStorage.getItem('alpaca_default_search_engine') || 'Google';
  });
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [limit, setLimit] = useState(() => {
    const saved = localStorage.getItem('bookmarks_limit');
    return saved ? parseInt(saved) : 50;
  });
  const [tileSize, setTileSize] = useState(() => {
    const saved = localStorage.getItem('tile_size');
    return saved ? parseInt(saved) : 280;
  });
  const [showUrl, setShowUrl] = useState(() => {
    const saved = localStorage.getItem('show_url');
    return saved ? saved === 'true' : true;
  });

  // Focus search bar on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Global keyboard shortcuts (e.g. / or Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in an input/textarea, ignore shortcut unless it is Escape
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      } else if (e.key === 'Escape') {
        setIsSettingsMenuOpen(false);
        setIsContextMenuOpen(false);
        setIsInfoModalOpen(false);
        setIsConfigModalOpen(false);
        setIsDataImportExportModalOpen(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const engine = SEARCH_ENGINES.find(se => se.name === defaultEngine) || SEARCH_ENGINES[0];
    window.location.href = engine.url + encodeURIComponent(searchQuery.trim());
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

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setIsContextMenuOpen(false);
    if (isContextMenuOpen) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isContextMenuOpen]);

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
        console.error('Failed to fetch favorites or layouts', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoritesAndLayouts();
  }, []);

  const handleEnterEditMode = useCallback(() => {
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
  }, [layouts]);

  const handleSaveLayouts = useCallback(async () => {
    const targetLayouts = layoutChanges.current || layouts;
    const staticLayouts: Layouts = {};
    for (const bp of Object.keys(targetLayouts)) {
        if (targetLayouts[bp]) {
            staticLayouts[bp] = targetLayouts[bp]!.map(item => ({
                ...item,
                static: true,
            }));
        }
    }
    setLayouts(staticLayouts);
    setIsEditMode(false);
    layoutChanges.current = null;
    try {
        await saveLayoutsToServer(staticLayouts);
    } catch (e) {
        console.error('Failed to save layouts', e);
    }
  }, [layouts]);

  const handleLayoutChange = (currentLayout: Layout, allLayouts: Layouts) => {
    layoutChanges.current = allLayouts;
  };

  const handleBreakpointChange = (newBreakpoint: keyof typeof cols) => {
    setBreakpoint(newBreakpoint);
  };

  return (
    <div className="min-h-screen bg-base-200 text-base-content flex flex-col transition-colors duration-300">
      {/* Top Navbar */}
      <div className="navbar bg-base-100 shadow-md px-4 lg:px-8 flex items-center justify-between">
        <div className="flex-1 flex items-center">
          <Link to="/" className="btn btn-ghost text-xl font-bold flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            <span>Alpaca Bookmarks</span>
          </Link>
        </div>
        <div className="flex-none flex items-center gap-2">
          <Link to="/todos" className="btn btn-ghost btn-sm gap-2 hidden sm:flex items-center">
            <ListTodo className="w-4 h-4" />
            <span>Todos</span>
          </Link>
          <Link to="/kanban" className="btn btn-ghost btn-sm gap-2 hidden sm:flex items-center">
            <LucideLayout className="w-4 h-4" />
            <span>Kanban</span>
          </Link>
          <Link to="/dashboard" className="btn btn-ghost btn-sm gap-2 hidden sm:flex items-center">
            <ArrowRightLeft className="w-4 h-4" />
            <span>All Bookmarks</span>
          </Link>

          {/* Settings Dropdown */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
              <Settings className="w-5 h-5" />
            </div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 mt-2">
              <li>
                <button onClick={() => { setSettingsStartView('settings'); setIsConfigModalOpen(true); }}>
                  <Sliders className="w-4 h-4" /> Settings
                </button>
              </li>
              <li>
                <button onClick={() => { setSettingsStartView('tags'); setIsConfigModalOpen(true); }}>
                  <Tags className="w-4 h-4" /> Manage Tags
                </button>
              </li>
              <li>
                <button onClick={() => setIsDataImportExportModalOpen(true)}>
                  <ArrowRightLeft className="w-4 h-4" /> Import / Export
                </button>
              </li>
              <li>
                <button onClick={() => setIsInfoModalOpen(true)}>
                  <Info className="w-4 h-4" /> About
                </button>
              </li>
              <div className="divider my-1"></div>
              <li>
                <button onClick={logout} className="text-error">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 lg:p-8 flex flex-col items-center">
        {/* Centered Search Bar Section */}
        <div className="w-full max-w-2xl my-8 flex flex-col items-center">
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <div className="relative flex items-center shadow-lg rounded-full overflow-hidden bg-base-100 border border-base-300 hover:border-primary transition-all duration-300">
              <div className="pl-5 text-primary">
                <Search className="w-5 h-5" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onContextMenu={handleContextMenu}
                placeholder={`Search ${defaultEngine} or filter favorites (Right-click to change engine)...`}
                className="w-full py-3.5 pl-3 pr-4 bg-transparent outline-none text-base-content placeholder-base-content/50"
              />
              <button type="submit" className="btn btn-primary rounded-r-full px-6 min-h-0 h-full">
                Search
              </button>
            </div>
            <div className="text-xs text-base-content/60 mt-1.5 text-center flex items-center justify-center gap-1">
              <span>Default engine: <strong className="text-primary">{defaultEngine}</strong></span>
              <span>•</span>
              <span className="italic">Right-click search bar to change</span>
            </div>
          </form>
        </div>

        {/* Context Menu for Choosing Search Engine */}
        {isContextMenuOpen && (
          <div
            className="fixed z-50 menu bg-base-100 rounded-box shadow-xl border border-base-300 w-48 p-2"
            style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          >
            <div className="menu-title text-xs font-semibold px-2 py-1 text-base-content/60">Select Search Engine</div>
            {SEARCH_ENGINES.map(engine => (
              <button
                key={engine.name}
                onClick={() => selectEngine(engine.name)}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-btn hover:bg-primary hover:text-primary-content transition-colors ${defaultEngine === engine.name ? 'font-bold text-primary bg-base-200' : ''}`}
              >
                <span>{engine.name}</span>
                {defaultEngine === engine.name && <span className="text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Dashboard Header & Edit Mode Toggle */}
        <div className="w-full max-w-7xl flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Favorite Bookmarks</h1>
          <div className="flex items-center gap-3">
            {!isEditMode ? (
              <button onClick={handleEnterEditMode} className="btn btn-sm btn-outline gap-2">
                <Edit className="w-4 h-4" /> Edit Layout
              </button>
            ) : (
              <button onClick={handleSaveLayouts} className="btn btn-sm btn-primary gap-2">
                <Save className="w-4 h-4" /> Save Layout
              </button>
            )}
          </div>
        </div>

        {/* Grid Area */}
        <div ref={gridRef} className="w-full max-w-7xl">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : filteredFavorites.length === 0 ? (
            <div className="text-center py-20 bg-base-100 rounded-box shadow-sm border border-base-300">
              <p className="text-base-content/70">
                {favorites.length === 0 ? 'No favorite bookmarks found. Tag bookmarks as "Favorites" to display them here.' : 'No favorites match your search filter.'}
              </p>
            </div>
          ) : (
            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              breakpoints={breakpoints}
              cols={cols}
              rowHeight={tileSize}
              width={gridWidth}
              isDraggable={isEditMode}
              isResizable={false}
              onLayoutChange={handleLayoutChange}
              onBreakpointChange={handleBreakpointChange}
            >
              {favorites.map((bookmark) => {
                const isVisible = filteredFavorites.some(f => f.id === bookmark.id);
                if (!isVisible && searchQuery.trim()) {
                  // Hide non-matching items during filter
                  return null;
                }
                return (
                  <div key={bookmark.id} className="h-full">
                    <FavoriteBookmarkCard bookmark={bookmark} showUrl={showUrl} />
                  </div>
                );
              })}
            </ResponsiveGridLayout>
          )}
        </div>
      </div>

      {/* Modals */}
      {isConfigModalOpen && (
        <SettingsModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          initialView={settingsStartView}
        />
      )}

      {isDataImportExportModalOpen && (
        <DataImportExportModal
          isOpen={isDataImportExportModalOpen}
          onClose={() => setIsDataImportExportModalOpen(false)}
        />
      )}

      {isInfoModalOpen && (
        <KeyboardShortcutsModal
          isOpen={isInfoModalOpen}
          onClose={() => setIsInfoModalOpen(false)}
        />
      )}
    </div>
  );
};
