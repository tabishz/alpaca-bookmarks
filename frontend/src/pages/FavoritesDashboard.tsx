import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { Responsive as ResponsiveGridLayout, type Layout, type LayoutItem } from 'react-grid-layout';
import { Home } from 'lucide-react';
import { FavoriteBookmarkCard } from '../components/FavoriteBookmarkCard';

type Layouts = Partial<Record<string, readonly LayoutItem[]>>;

const getLayoutsFromLocalStorage = (): Layouts => {
  try {
    const saved = localStorage.getItem('favorites_layout');
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
};

const saveLayoutsToLocalStorage = (layouts: Layouts) => {
  localStorage.setItem('favorites_layout', JSON.stringify(layouts));
};


export const FavoritesDashboard = () => {
  const [favorites, setFavorites] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [layouts, setLayouts] = useState<Layouts>(getLayoutsFromLocalStorage());
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
    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const res = await api.get<Bookmark[]>('/bookmarks?tag=Favorites');
        setFavorites(res.data);
      } catch (error) {
        console.error("Failed to fetch favorites", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  const generateLayouts = useCallback(() => {
    const savedLayouts = getLayoutsFromLocalStorage();
    const lgLayout: readonly LayoutItem[] = favorites.map((fav, i) => {
      const saved = savedLayouts.lg?.find((l: LayoutItem) => l.i === fav.id.toString());
      if (saved) return saved;
      return {
        i: fav.id.toString(),
        x: (i * 2) % 12,
        y: Math.floor(i / 6),
        w: 2,
        h: 1,
        minW: 1,
        minH: 1,
      };
    });
    setLayouts({ lg: lgLayout });
  }, [favorites]);

  useEffect(() => {
    if (favorites.length > 0) {
      generateLayouts();
    }
  }, [favorites, generateLayouts]);

  const onLayoutChange = (_layout: Layout, allLayouts: Layouts) => {
    saveLayoutsToLocalStorage(allLayouts);
    setLayouts(allLayouts);
  };

  return (
    <div className="p-4 bg-background min-h-screen">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Favorites Dashboard</h1>
        <Link to="/" className="flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-text hover:bg-primary hover:text-white transition-colors">
            <Home size={20} />
            <span>Dashboard</span>
        </Link>
      </header>
      {loading ? (
        <div className="text-center text-text">Loading Favorites...</div>
      ) : (
        <div ref={gridRef}>
            <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            onLayoutChange={onLayoutChange}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={120}
            width={gridWidth}
            // @ts-ignore
            draggableHandle=".drag-handle"
            >
            {favorites.map(fav => {
                const layoutItem = layouts.lg?.find((l: LayoutItem) => l.i === fav.id.toString());
                return (
                <div key={fav.id.toString()} className="drag-handle">
                    <FavoriteBookmarkCard
                    bookmark={fav}
                    width={layoutItem?.w || 2}
                    height={layoutItem?.h || 1}
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