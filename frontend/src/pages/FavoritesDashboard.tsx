import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { Responsive as ResponsiveGridLayout, type Layout, type LayoutItem } from 'react-grid-layout';
import { Home, Edit, Save } from 'lucide-react';
import { FavoriteBookmarkCard } from '../components/FavoriteBookmarkCard';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

type Layouts = Partial<Record<string, readonly LayoutItem[]>>;

const getLayoutsFromServer = async (): Promise<Layouts> => {
  try {
    const res = await api.get<Layouts | string>('/user/layout');
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

const saveLayoutsToServer = (layouts: Layouts) => {
  api.put('/user/layout', { layouts: JSON.stringify(layouts) });
};

export const FavoritesDashboard = () => {
  const [favorites, setFavorites] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [layouts, setLayouts] = useState<Layouts>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(1200);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setGridWidth(entries[0].contentRect.width);
      }
    });

    if (gridRef.current) {
      observer.observe(gridRef.current);
    }

    return () => {
      if (gridRef.current) {
        observer.unobserve(gridRef.current);
      }
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

        const newLayouts: Layouts = { ...savedLayouts };

        // Ensure all favorites have a layout entry, creating one if it doesn't exist
        const lgLayout = favoritesData.map((fav, i) => {
          const existingLayout = savedLayouts.lg?.find(l => l.i === fav.id.toString());
          if (existingLayout) {
            return { ...existingLayout, static: !isEditMode };
          }
          return {
            i: fav.id.toString(),
            x: (i * 2) % 12,
            y: Math.floor(i / 6),
            w: 2,
            h: 1,
            minW: 1,
            minH: 1,
            static: !isEditMode,
          };
        });

        newLayouts.lg = lgLayout;
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
    setLayouts(currentLayouts => {
      const newLayouts: Layouts = {};
      for (const bp of Object.keys(currentLayouts)) {
        if (currentLayouts[bp]) {
          newLayouts[bp] = currentLayouts[bp]!.map(item => ({
            ...item,
            static: !isEditMode,
          }));
        }
      }
      return newLayouts;
    });
  }, [isEditMode]);

  const onLayoutChange = (_layout: Layout, allLayouts: Layouts) => {
    // Only update layouts if there's an actual change to an item.
    // This prevents overwriting on initial load or resize.
    if (isEditMode) {
      setLayouts(allLayouts);
    }
  };

  const handleSave = () => {
    saveLayoutsToServer(layouts);
    setIsEditMode(false);
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
          {isEditMode ? (
            <button onClick={handleSave} className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 transition-colors">
              <Save size={20} />
              <span>Save</span>
            </button>
          ) : (
            <button onClick={() => setIsEditMode(true)} className="flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 transition-colors">
              <Edit size={20} />
              <span>Edit</span>
            </button>
          )}
        </div>
      </header>
      {loading ? (
        <div className="text-center text-text">Loading Favorites...</div>
      ) : (
        <div ref={gridRef}>
          <ResponsiveGridLayout
            key={isEditMode ? 'edit' : 'view'}
            className="layout"
            layouts={layouts}
            onLayoutChange={onLayoutChange}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={120}
            width={gridWidth}
          >
            {favorites.map(fav => {
              const layoutItem = layouts.lg?.find((l: LayoutItem) => l.i === fav.id.toString());
              const handleClasses = isEditMode ? 'drag-handle drag-handle-active' : '';
              return (
                <div key={fav.id.toString()} className={handleClasses}>
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
    </div>
  );
};
