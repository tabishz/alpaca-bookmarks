import React from 'react';
import { Bookmark } from '../api/types';
import { ExternalLink, Trash2, Tag as TagIcon, Pencil } from 'lucide-react';

interface Props {
  bookmark: Bookmark;
  viewMode: 'grid' | 'list';
  onDelete: (id: number) => void;
  onEdit: (bookmark: Bookmark) => void;
}

export const BookmarkCard: React.FC<Props> = ({ bookmark, viewMode, onDelete, onEdit }) => {
  // Use Google's favicon service
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=64`;

  if (viewMode === 'list') {
    return (
      <div className="group mb-2 flex items-center justify-between rounded-md bg-surface p-3 shadow-sm transition-colors hover:bg-opacity-80">
        <div className="flex items-center gap-4 overflow-hidden">
          <img src={faviconUrl} alt="icon" className="h-6 w-6 rounded-sm" />

          <div className="min-w-0">
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-primary hover:underline">
              {bookmark.title || bookmark.url}
            </a>
            <div className="flex gap-2 text-xs text-gray-400">
              {bookmark.tags.map(t => <span key={t.id}>#{t.name}</span>)}
            </div>
          </div>
        </div>

        {/* BUTTON GROUP: Wrapped in a div to keep them together on the right */}
        <div className="ml-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => onEdit(bookmark)} className="text-gray-400 hover:text-primary" title="Edit">
            <Pencil size={18} />
          </button>
          <button onClick={() => onDelete(bookmark.id)} className="text-gray-400 hover:text-red-400" title="Delete">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Grid Mode
  return (
    <div className="group relative flex flex-col rounded-lg bg-surface p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-4 flex items-start justify-between">
        <img src={faviconUrl} alt="icon" className="h-10 w-10 rounded-md bg-white p-1" />

        {/* BUTTON GROUP: This div ensures both buttons stay on the right side */}
        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
           <button onClick={() => onEdit(bookmark)} className="text-gray-500 hover:text-primary" title="Edit">
            <Pencil size={18} />
          </button>
          <button onClick={() => onDelete(bookmark.id)} className="text-gray-500 hover:text-red-400" title="Delete">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <h3 className="mb-2 truncate text-lg font-bold text-text" title={bookmark.title}>
        {bookmark.title || 'Untitled'}
      </h3>

      <p className="mb-4 flex-1 text-sm text-gray-400 line-clamp-2">
        {bookmark.description || bookmark.url}
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {bookmark.tags.map((tag) => (
          <span key={tag.id} className="flex items-center rounded bg-background px-2 py-1 text-xs text-primary">
            <TagIcon size={10} className="mr-1" /> {tag.name}
          </span>
        ))}
      </div>

      <a href={bookmark.url} target="_blank" rel="noopener noreferrer"
        className="mt-auto flex items-center justify-center rounded bg-background py-2 text-sm font-semibold text-primary hover:bg-opacity-80">
        Visit <ExternalLink size={14} className="ml-2" />
      </a>
    </div>
  );
};
