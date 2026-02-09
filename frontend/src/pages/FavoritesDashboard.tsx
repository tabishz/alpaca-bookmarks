import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { Responsive as ResponsiveGridLayout, type Layout, type LayoutItem } from 'react-grid-layout';
import { Home, Edit, Save, Info, ListTodo } from 'lucide-react';
import { FavoriteBookmarkCard } from '../components/FavoriteBookmarkCard';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useTheme } from '../hooks/useTheme';
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal';

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
  const [favorites, setFavorites] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [layouts, setLayouts] = useState<Layouts>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [breakpoint, setBreakpoint] = useState<keyof typeof cols>('lg');
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(1200);
  const layoutChanges = useRef<Layouts | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

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
      if (e.key === 'Escape' && !isTyping) {
        if (isInfoModalOpen) { setIsInfoModalOpen(false); }
      }
      if (e.key === 'i' && !isTyping) {
        if (isInfoModalOpen) { setIsInfoModalOpen(false); }
        else { setIsInfoModalOpen(true); }
      }
      if (e.key === 'd' && !isTyping) {
        e.preventDefault();
        navigate('/todos');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, isInfoModalOpen]);

  const onLayoutChange = useCallback((_layout: Layout, allLayouts: Layouts) => {
    layoutChanges.current = allLayouts;
    // We update state so the grid knows the "current" positions
    // and doesn't snap back on the next render
    setLayouts(allLayouts);
  }, []);

  const handleEnterEditMode = () => {
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
  }

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

  return (
    <div className="p-4 bg-background min-h-screen">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Favorites Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-text hover:bg-primary hover:text-white transition-colors">
            <Home size={20} />
            <span>Dashboard</span>
          </Link>

          <Link to="/todos" className="flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-text hover:bg-primary hover:text-white transition-colors">
            <ListTodo size={20} />
            <span>Todo List</span>
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
              onClick={(e) => { e.stopPropagation(); setIsInfoModalOpen(true); }}
              className="p-2 rounded-md text-gray-400 hover:text-white transition-colors"
            >
              <Info size={28} />
            </button>
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
                  />
                </div>
              );
            })}
          </ResponsiveGridLayout>
        </div>
      )}
      <KeyboardShortcutsModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </div>
  );
};
