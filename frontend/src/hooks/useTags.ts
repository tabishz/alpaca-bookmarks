import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export const useTags = () => {
  const [allTags, setAllTags] = useState<string[]>([]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await api.get<{ name: string }[]>('/tags');
      const tagNames = res.data.map((t) => t.name);
      setAllTags(tagNames);
    } catch {
      console.error("Failed to load tags");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchTags();
    };
    init();
  }, [fetchTags]);

  return { allTags, fetchTags };
};
