import React, { useState, useMemo, useEffect } from 'react';
import { Bookmark } from '../api/types';
import { ExternalLink, Trash2, Tag as TagIcon, Pencil, Globe, Heart } from 'lucide-react';
import api from '../api/client';

interface Props {
  bookmark: Bookmark;
  viewMode: 'grid' | 'list';
  onDelete: (id: number) => void;
  onEdit: (bookmark: Bookmark) => void;
  onTagClick: (tagName: string) => void;
  onToggleFavorite: (bookmark: Bookmark, isFavorite: boolean) => void;
}

const Icon: React.FC<{ bookmark: Bookmark; className: string }> = ({ bookmark, className }) => {
  const [iconSrc, setIconSrc] = useState<string | null>(bookmark.icon || null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const needsFetch = !bookmark.icon_last_fetched || new Date(bookmark.icon_last_fetched).getTime() < Date.now() - 2592000000;
    if (needsFetch) {
      api.get(`/bookmarks/${bookmark.id}/icon`, { responseType: 'blob' })
        .then(response => {
          if (response.status === 200) {
            const blob = response.data;
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result;
              setIconSrc(base64data as string);
            };
            reader.readAsDataURL(blob);
          } else {
            setHasError(true);
          }
        })
        .catch(() => {
          setHasError(true);
        });
    }
  }, [bookmark.id, bookmark.icon, bookmark.icon_last_fetched]);

  if (hasError || !iconSrc) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-700 text-gray-400 shrink-0`}>
        <Globe size="60%" />
      </div>
    );
  }

  return (
    <img
      src={iconSrc}
      alt="icon"
      className={`${className} bg-white object-contain p-0.5 shrink-0`}
      loading="lazy"
    />
  );
}

export const BookmarkCard: React.FC<Props> = ({ bookmark, viewMode, onDelete, onEdit, onTagClick, onToggleFavorite }) => {

  const handleTagClick = (e: React.MouseEvent, tagName: string) => {
    e.preventDefault(); e.stopPropagation();
    onTagClick(tagName);
  };

  const tags = bookmark.tags || [];
  const isFavorite = useMemo(() => tags.some(t => t.name.toLowerCase() === 'favorites'), [tags]);
  
  const truncateUrl = (url: string, length: number) => {
    if (url.length <= length) {
      return url;
    }
    return url.substring(0, length) + '...';
  };

  if (viewMode === 'list') {
    return (
      <div className="group mb-2 flex items-center justify-between rounded-md bg-surface p-3 shadow-sm transition-colors hover:bg-opacity-80">
        <div className="flex items-center gap-4 overflow-hidden">
          <Icon bookmark={bookmark} className="h-6 w-6 rounded-sm shrink-0" />

          <div className="min-w-0">
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="block font-medium text-primary hover:underline break-words">
              {bookmark.title || truncateUrl(bookmark.url, 100)}
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
          <button onClick={() => onToggleFavorite(bookmark, isFavorite)} className={`text-gray-400 hover:text-red-400 ${isFavorite ? 'text-red-400' : ''}`} title="Favorite">
            <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => onEdit(bookmark)} className="text-gray-400 hover:text-primary" title="Edit"><Pencil size={18} /></button>
          <button onClick={() => onDelete(bookmark.id)} className="text-gray-400 hover:text-red-400" title="Delete"><Trash2 size={18} /></button>
        </div>
      </div>
    );
  }

  // Grid Mode
  return (
    <div className="group relative flex flex-col rounded-lg bg-surface p-5 shadow-md transition-all hover:shadow-xl">
      <div className="mb-4 flex items-start justify-between">
        <Icon bookmark={bookmark} className="h-10 w-10 rounded-md" />

        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => onToggleFavorite(bookmark, isFavorite)} className={`text-gray-500 hover:text-red-400 ${isFavorite ? 'text-red-400' : ''}`} title="Favorite">
            <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => onEdit(bookmark)} className="text-gray-500 hover:text-primary" title="Edit"><Pencil size={18} /></button>
          <button onClick={() => onDelete(bookmark.id)} className="text-gray-500 hover:text-red-400" title="Delete"><Trash2 size={18} /></button>
        </div>
      </div>

      <h3 className="mb-2 text-lg font-bold text-text break-words" title={bookmark.title}>{bookmark.title || 'Untitled'}</h3>
      <p className="mb-4 flex-1 text-sm text-gray-400 break-words">{bookmark.description || truncateUrl(bookmark.url, 100)}</p>

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
