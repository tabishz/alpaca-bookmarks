import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../api/client';
import { Bookmark } from '../api/types';

interface UseBookmarksProps {
  limit: number;
  search: string;
  selectedTag: string;
}

export const useBookmarks = ({ limit, search, selectedTag }: UseBookmarksProps) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBookmarks = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    } else {
      if (loadingRef.current) return;
    }

    loadingRef.current = true;
    setLoading(true);
    setFetchError(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isRefresh) setBookmarks([]);

    try {
      let url = `/bookmarks?page=${pageNum}&limit=${limit}`;
      if (selectedTag) url += `&tag=${encodeURIComponent(selectedTag)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await api.get<Bookmark[]>(url, { signal: controller.signal });
      const newData = res.data;
      const total = parseInt(res.headers['x-total-count'] || '0', 10);
      setTotalCount(total);

      if (isRefresh) {
        setBookmarks(newData);
      } else {
        setBookmarks(prev => {
          const existingIds = new Set(prev.map(b => b.id));
          const uniqueNewData = newData.filter(b => !existingIds.has(b.id));
          return [...prev, ...uniqueNewData];
        });
      }

      setHasMore(newData.length >= limit);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'Canceled') {
        console.error("Failed to load bookmarks", err);
        setFetchError("Could not connect to the server. Please try again later.");
        setHasMore(false);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [limit, selectedTag, search]);

  // Reset Trigger when search/tag/limit changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      setHasMore(true);
      fetchBookmarks(1, true);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search, selectedTag, limit, fetchBookmarks]);

  return {
    bookmarks,
    setBookmarks,
    loading,
    page,
    setPage,
    hasMore,
    fetchError,
    totalCount,
    fetchBookmarks
  };
};