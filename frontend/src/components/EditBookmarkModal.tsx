import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import api from '../api/client';
import { Bookmark } from '../api/types';
import { TagInput } from './TagInput';

interface Props {
  bookmark: Bookmark | null;
  onClose: () => void;
  onSuccess: (updatedBookmark: Bookmark) => void;
  existingTags: string[];
}

export const EditBookmarkModal: React.FC<Props> = ({ bookmark, onClose, onSuccess, existingTags }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (bookmark) {
      setUrl(bookmark.url);
      setTitle(bookmark.title);
      setDescription(bookmark.description);
      setTags(bookmark.tags.map(t => t.name));
      setCustomIconUrl('');
    }
  }, [bookmark]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (bookmark) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [bookmark, onClose]);

  if (!bookmark) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Update bookmark details
      const res = await api.put<Bookmark>(`/bookmarks/${bookmark.id}`, {
        url,
        title,
        description,
        tags
      });

      let updatedBookmark = res.data;

      // 2. Update icon if a custom URL was provided
      if (customIconUrl.trim()) {
        try {
          await api.post(`/bookmarks/${bookmark.id}/icon`, { icon_url: customIconUrl.trim() });
          // If icon was updated, we might want to refetch to get the new icon data URI
          const refreshRes = await api.get<Bookmark>(`/bookmarks/${bookmark.id}`);
          updatedBookmark = refreshRes.data;
        } catch (iconErr) {
          console.error("Failed to update custom icon:", iconErr);
          alert("Bookmark updated, but custom icon failed to load. Please check the icon URL.");
        }
      }

      onSuccess(updatedBookmark);
      onClose();
    } catch {
      alert("Failed to update bookmark");
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

        <h2 className="mb-6 text-2xl font-bold">Edit Bookmark</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">URL</label>
            <input
              required
              type="url"
              className="w-full rounded border border-gray-600 bg-background p-2 text-text focus:border-primary focus:outline-none"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">Title</label>
            <input
              type="text"
              className="w-full rounded border border-gray-600 bg-background p-2 text-text focus:border-primary focus:outline-none"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">Description</label>
            <textarea
              className="w-full rounded border border-gray-600 bg-background p-2 text-text focus:border-primary focus:outline-none"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400 flex items-center gap-2">
              <ImageIcon size={14} /> Custom Icon URL
            </label>
            <input
              type="text"
              className="w-full rounded border border-gray-600 bg-background p-2 text-text focus:border-primary focus:outline-none"
              placeholder="https://example.com/icon.png"
              value={customIconUrl}
              onChange={e => setCustomIconUrl(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">Provide a direct link to an image to override the default icon.</p>
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
