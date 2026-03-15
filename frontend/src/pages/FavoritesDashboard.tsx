import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { Responsive as ResponsiveGridLayout, type Layout, type LayoutItem } from 'react-grid-layout';
import { Home, Edit, Save, Info, ListTodo, Layout as LucideLayout, Settings, Sliders, ArrowRightLeft, Tags, LogOut } from 'lucide-react';
import { FavoriteBookmarkCard } from '../components/FavoriteBookmarkCard';
import { SettingsModal } from '../components/SettingsModal';
import { DataImportExportModal } from '../components/DataImportExportModal';
import { useTheme, Theme } from '../hooks/useTheme';
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal';
import { useAuthStore } from '../store/authStore';

type Layouts = Partial<Record<string, readonly LayoutItem[]>>;

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
        console.error("Failed to fetch layouts from server", e);
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
  const { logout } = useAuthStore();
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (['Backspace', 'f', 'h'].includes(e.key) && !isTyping) {
        e.preventDefault();
        navigate('/');
      }
      if (e.key === 'Escape' && !isTyping) {
        if (isInfoModalOpen) { setIsInfoModalOpen(false); }
        else if (isEditMode) { setIsEditMode(false); }
        else if (isSettingsMenuOpen) { setIsSettingsMenuOpen(false); }
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
      if (e.key === 'e' && !isTyping) {
        e.preventDefault();
        if (isEditMode) {
          setIsEditMode(false);
        } else {
          handleEnterEditMode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, isInfoModalOpen, isEditMode, isSettingsMenuOpen, handleEnterEditMode]);

  const onLayoutChange = useCallback((_layout: Layout, allLayouts: Layouts) => {
    layoutChanges.current = allLayouts;
    // We update state so the grid knows the "current" positions
    // and doesn't snap back on the next render
    setLayouts(allLayouts);
  }, []);

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

  const handleConfigSave = async (newLimit: number, newTheme: Theme, newTileSize: number, newShowUrl: boolean) => {
    localStorage.setItem('bookmarks_limit', newLimit.toString());
    localStorage.setItem('tile_size', newTileSize.toString());
    localStorage.setItem('show_url', newShowUrl.toString());
    setLimit(newLimit);
    setTheme(newTheme);
    setTileSize(newTileSize);
    setShowUrl(newShowUrl);
  };

  return (
    <div className="p-4 bg-background min-h-screen" onClick={() => setIsSettingsMenuOpen(false)}>
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
          <button
            onClick={(e) => { e.stopPropagation(); setIsInfoModalOpen(true); }}
            className="p-2 rounded-md text-gray-400 hover:text-white transition-colors"
          >
            <Info size={28} />
          </button>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsSettingsMenuOpen(!isSettingsMenuOpen); }}
              className={`p-2 rounded-md transition-colors ${isSettingsMenuOpen ? 'bg-surface text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Settings size={28} />
            </button>
            {isSettingsMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-md border border-gray-600 bg-surface shadow-xl">
                <button onClick={() => { setSettingsStartView('settings'); setIsConfigModalOpen(true); setIsSettingsMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted hover:bg-primary hover:text-white"><Sliders size={16} /> Preferences</button>
                <button onClick={() => { setIsDataImportExportModalOpen(true); setIsSettingsMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted hover:bg-primary hover:text-white"><ArrowRightLeft size={16} /> Data Import / Export</button>
                <button onClick={() => { setSettingsStartView('tags'); setIsConfigModalOpen(true); setIsSettingsMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted hover:bg-primary hover:text-white"><Tags size={16} /> Organize Tags</button>
                <div className="my-1 border-t border-gray-700"></div>
                <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-400 hover:bg-red-400/10"><LogOut size={16} /> Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>
      {loading ? (
        <div className="text-center text-text">Loading Favorites...</div>
      ) : (
        <div ref={gridRef}>
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            onLayoutChange={onLayoutChange}
            onBreakpointChange={(bp) => setBreakpoint(bp as keyof typeof cols)}
            breakpoints={breakpoints}
            cols={cols}
            rowHeight={120}
            width={gridWidth}
          >
            {favorites.map(fav => {
              const currentLayout = layouts[breakpoint] || layouts.lg || [];
              const layoutItem = currentLayout.find(l => String(l.i) === String(fav.id));
              return (
                <div key={String(fav.id)} >
                  <FavoriteBookmarkCard
                    bookmark={fav}
                    width={layoutItem?.w || 2}
                    height={layoutItem?.h || 1}
                    isEditMode={isEditMode}
                    onRemoveFavorite={handleRemoveFavorite}
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
        currentLimit={limit}
        currentTheme={theme}
        currentTileSize={tileSize}
        currentShowUrl={showUrl}
        onSave={handleConfigSave}
        initialView={settingsStartView}
      />
      <DataImportExportModal
        isOpen={isDataImportExportModalOpen}
        onClose={() => setIsDataImportExportModalOpen(false)}
        onImportSuccess={() => {}}
      />
    </div>
  );
};
