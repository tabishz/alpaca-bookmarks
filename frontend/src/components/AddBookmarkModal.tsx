import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { TagInput } from './TagInput';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBookmark: Bookmark) => void;
  existingTags: string[];
  initialData?: { url: string; title?: string } | null;
}

export const AddBookmarkModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, existingTags, initialData }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMetadataDirectly = async (targetUrl: string) => {
    try {
      const response = await fetch(targetUrl);
      if (!response.ok) return null;
      
      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");
      
      return {
        title: doc.querySelector("title")?.innerText || "",
        description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || 
                     doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || ""
      };
    } catch (err) {
      console.warn("Frontend fallback fetch failed (likely CORS or unreachable):", err);
      return null;
    }
  };

  const fetchAndSetMetadata = useCallback(async (targetUrl: string, force = false) => {
    if (!targetUrl) return;

    try {
      // 1. Try Backend first (handles CORS for public sites)
      const response = await api.get<{ title: string, description: string }>(`/bookmarks/metadata?url=${encodeURIComponent(targetUrl)}`);
      
      if (force || !title) {
        if (response.data.title) setTitle(response.data.title);
      }
      if (force || !description) {
        if (response.data.description) setDescription(response.data.description);
      }
    } catch (error) {
      console.log("Backend metadata fetch failed, trying frontend fallback for LAN/local URLs...");
      
      // 2. Fallback to Frontend (might work for LAN sites if they have lax CORS or are on same network)
      const localData = await fetchMetadataDirectly(targetUrl);
      if (localData) {
        if (force || !title) setTitle(localData.title);
        if (force || !description) setDescription(localData.description);
      }
    }
  }, [title, description]);

  // Listen for initial data changes
  useEffect(() => {
    if (isOpen && initialData) {
      setUrl(initialData.url || '');
      if (initialData.title) {
        setTitle(initialData.title);
      }
      
      if (initialData.url) {
        fetchAndSetMetadata(initialData.url);
      }
    } else if (!isOpen) {
      setUrl('');
      setTitle('');
      setDescription('');
      setTags([]);
    }
  }, [isOpen, initialData, fetchAndSetMetadata]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleUrlBlur = () => {
    if (url) {
      fetchAndSetMetadata(url);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post<Bookmark>('/bookmarks', {
        url,
        title,
        description,
        tags
      });

      onSuccess(res.data);
      onClose();
    } catch {
      alert("Failed to save bookmark");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg bg-surface p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-text">
          <X size={24} />
        </button>

        <h2 className="mb-6 text-2xl font-bold">Add New Bookmark</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">URL</label>
            <input
              required
              type="url"
              className="w-full rounded border border-gray-600 bg-background p-2 text-text focus:border-primary focus:outline-none"
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onBlur={handleUrlBlur}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">Title</label>
            <input
              type="text"
              className="w-full rounded border border-gray-600 bg-background p-2 text-text focus:border-primary focus:outline-none"
              placeholder="My Awesome Link"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">Description</label>
            <textarea
              className="w-full rounded border border-gray-600 bg-background p-2 text-text focus:border-primary focus:outline-none"
              rows={3}
              placeholder="Why is this useful?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">Tags</label>
            <TagInput
              selectedTags={tags}
              onChange={setTags}
              availableTags={existingTags}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-400 hover:bg-background hover:text-text">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="rounded bg-primary px-6 py-2 font-bold text-white hover:opacity-90 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
