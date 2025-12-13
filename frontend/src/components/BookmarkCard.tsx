import React, { useState } from 'react';
import { Bookmark } from '../api/types';
import { ExternalLink, Trash2, Tag as TagIcon, Pencil, Globe } from 'lucide-react';

interface Props {
  bookmark: Bookmark;
  viewMode: 'grid' | 'list';
  onDelete: (id: number) => void;
  onEdit: (bookmark: Bookmark) => void;
  onTagClick: (tagName: string) => void;
}

export const BookmarkCard: React.FC<Props> = ({ bookmark, viewMode, onDelete, onEdit, onTagClick }) => {
  const [imgError, setImgError] = useState(false);

  // Safe Hostname Extraction
  const getFaviconUrl = (urlStr: string) => {
    if (!urlStr) return ''; // Safety check for empty URL
    try {
      const url = new URL(urlStr);
      return `https://icons.duckduckgo.com/ip3/${url.hostname}.ico`;
    } catch (e) {
      return '';
    }
  };

  const faviconUrl = getFaviconUrl(bookmark.url);

  const handleTagClick = (e: React.MouseEvent, tagName: string) => {
    e.preventDefault(); e.stopPropagation();
    onTagClick(tagName);
  };

  // Safe Tags Accessor (Prevents crash if tags is null)
  const tags = bookmark.tags || [];

  const renderIcon = (className: string) => {
    if (imgError || !faviconUrl) {
      return (
        <div className={`${className} flex items-center justify-center bg-gray-700 text-gray-400`}>
          <Globe size="60%" />
        </div>
      );
    }
    return (
      <img
        src={faviconUrl}
        alt="icon"
        className={`${className} bg-white object-contain p-0.5`}
        onError={() => setImgError(true)}
      />
    );
  };

  if (viewMode === 'list') {
    return (
      <div className="group mb-2 flex items-center justify-between rounded-md bg-surface p-3 shadow-sm transition-colors hover:bg-opacity-80">
        <div className="flex items-center gap-4 overflow-hidden">
          {renderIcon("h-6 w-6 rounded-sm shrink-0")}

          <div className="min-w-0">
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-primary hover:underline">
              {bookmark.title || bookmark.url}
            </a>
            <div className="flex gap-2 text-xs text-gray-400">
              {/* SAFE MAP */}
              {tags.map(t => (
                <button key={t.id} onClick={(e) => handleTagClick(e, t.name)} className="hover:text-primary hover:underline cursor-pointer focus:outline-none">
                  #{t.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="ml-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => onEdit(bookmark)} className="text-gray-400 hover:text-primary" title="Edit"><Pencil size={18} /></button>
          <button onClick={() => onDelete(bookmark.id)} className="text-gray-400 hover:text-red-400" title="Delete"><Trash2 size={18} /></button>
        </div>
      </div>
    );
  }

  // Grid Mode
  return (
    <div className="group relative flex flex-col rounded-lg bg-surface p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-4 flex items-start justify-between">
        {renderIcon("h-10 w-10 rounded-md")}

        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => onEdit(bookmark)} className="text-gray-500 hover:text-primary" title="Edit"><Pencil size={18} /></button>
          <button onClick={() => onDelete(bookmark.id)} className="text-gray-500 hover:text-red-400" title="Delete"><Trash2 size={18} /></button>
        </div>
      </div>

      <h3 className="mb-2 truncate text-lg font-bold text-text" title={bookmark.title}>{bookmark.title || 'Untitled'}</h3>
      <p className="mb-4 flex-1 text-sm text-gray-400 line-clamp-2">{bookmark.description || bookmark.url}</p>

      <div className="mb-3 flex flex-wrap gap-2">
        {/* SAFE MAP */}
        {tags.map((tag) => (
          <button key={tag.id} onClick={(e) => handleTagClick(e, tag.name)} className="flex items-center rounded bg-background px-2 py-1 text-xs text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer">
            <TagIcon size={10} className="mr-1" /> {tag.name}
          </button>
        ))}
      </div>

      <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="mt-auto flex items-center justify-center rounded bg-background py-2 text-sm font-semibold text-primary hover:bg-opacity-80">
        Visit <ExternalLink size={14} className="ml-2" />
      </a>
    </div>
  );
};
