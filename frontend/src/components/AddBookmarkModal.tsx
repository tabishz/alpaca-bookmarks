import React, { useState, useEffect } from 'react';
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

// Update component signature to accept existingTags
export const AddBookmarkModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, existingTags, initialData }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Listen for initial data changes
  useEffect(() => {
    if (isOpen && initialData) {
      setUrl(initialData.url || '');
      if (initialData.title) {
        setTitle(initialData.title);
      } else if (initialData.url) {
        const fetchAndSetTitle = async () => {
          const fetchedTitle = await getTitle(initialData.url);
          if (fetchedTitle) {
            setTitle(fetchedTitle);
          }
        };
        fetchAndSetTitle();
      }
    } else if (!isOpen) {
      // Reset when closed
      setUrl('');
      setTitle('');
      setDescription('');
      setTags([]);
    }
  }, [isOpen, initialData]);

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

  const getTitle = async (url: string): Promise<string | undefined> => {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const htmlText = await response.text();

      // Use DOMParser to turn the string into a searchable document
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");
      const title = doc.querySelector("title")?.innerText;

      return title || undefined;
    } catch (error) {
      console.error("Failed to fetch page title:", error);
      return undefined;
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
