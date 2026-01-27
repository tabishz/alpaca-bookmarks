import React, { useEffect, useState } from 'react';
import { Bookmark } from '../api/types';
import { Globe } from 'lucide-react';
import api from '../api/client';
import { failedIconCache, iconCache, inFlightRequests } from '../utils/cache';

interface Props {
  bookmark: Bookmark;
  width: number;
  height: number;
  isEditMode: boolean;
}

export const FavoriteBookmarkCard: React.FC<Props> = ({ bookmark, width, height, isEditMode }) => {
  const isSmall = width === 1 && height === 1;
  const [iconSrc, setIconSrc] = useState<string | null>(() => iconCache.get(bookmark.id) || null);
  const [iconError, setIconError] = useState(failedIconCache.has(bookmark.id));

  useEffect(() => {
    const fetchIcon = async () => {
      if (!bookmark.id || iconSrc || iconError) {
        return;
      }

      if (inFlightRequests.has(bookmark.id)) {
        // Another component is already fetching this icon.
        // We can wait for it to finish and then update the UI.
        const interval = setInterval(() => {
            if (iconCache.has(bookmark.id)) {
                setIconSrc(iconCache.get(bookmark.id)!);
                clearInterval(interval);
            } else if (failedIconCache.has(bookmark.id)) {
                setIconError(true);
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
      }

      try {
        inFlightRequests.add(bookmark.id);
        const response = await api.get(`/bookmarks/${bookmark.id}/icon`, {
          responseType: 'blob',
        });

        if (response.data.size > 0) {
          const objectUrl = URL.createObjectURL(response.data);
          setIconSrc(objectUrl);
          iconCache.set(bookmark.id, objectUrl);
        } else {
          setIconError(true);
          failedIconCache.add(bookmark.id);
        }
      } catch (error) {
        console.error('Failed to fetch icon:', error);
        setIconError(true);
        failedIconCache.add(bookmark.id);
      } finally {
        inFlightRequests.delete(bookmark.id);
      }
    };

    fetchIcon();
  }, [bookmark.id, iconSrc, iconError]);

  const renderIcon = () => {
    if (iconError || !iconSrc) {
      return <Globe className="w-1/2 h-1/2 text-gray-400" />;
    }

    return (
        <img
            src={iconSrc}
            alt=""
            className={isSmall ? "w-1/2 h-1/2 object-contain" : "w-10 h-10 object-contain mb-2"}
        />
    )
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isEditMode) {
      e.preventDefault();
    }
  };

  return (
    <a
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      onDragStart={(e) => e.preventDefault()}
      className="group relative w-full h-full bg-surface rounded-lg shadow-md hover:shadow-xl transition-shadow flex flex-col items-center justify-center p-2 flex-grow overflow-hidden"
    >
      {isSmall ? (
        renderIcon()
      ) : (
        <>
          {renderIcon()}
          <h3 className="text-sm font-bold text-center text-text w-full break-words">{bookmark.title}</h3>
        </>
      )}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Add edit/delete buttons here if needed */}
      </div>
    </a>
  );
};