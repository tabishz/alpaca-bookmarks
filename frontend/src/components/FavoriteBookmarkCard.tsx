import React, { useEffect, useState, useRef } from 'react';
import { Bookmark } from '../api/types';
import { Globe, Image as ImageIcon, Check, X } from 'lucide-react';
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

  // Context Menu & Custom Icon State
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [isInputMode, setIsInputMode] = useState(false);
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const touchTimer = useRef<number | null>(null);

  useEffect(() => {
    const fetchIcon = async () => {
      if (!bookmark.id || iconSrc || iconError) {
        return;
      }

      if (inFlightRequests.has(bookmark.id)) {
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

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

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setShowMenu(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isEditMode) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    touchTimer.current = window.setTimeout(() => {
      setMenuPos({ x, y });
      setShowMenu(true);
    }, 600); // long press duration
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  };

  const handleUpdateIcon = async () => {
    if (!customIconUrl.trim()) return;
    setIsUpdating(true);
    try {
      await api.post(`/bookmarks/${bookmark.id}/icon`, { icon_url: customIconUrl });
      // Refresh icon
      const response = await api.get(`/bookmarks/${bookmark.id}/icon`, {
        responseType: 'blob',
      });
      if (response.data.size > 0) {
        const objectUrl = URL.createObjectURL(response.data);
        setIconSrc(objectUrl);
        iconCache.set(bookmark.id, objectUrl);
        setIconError(false);
        failedIconCache.delete(bookmark.id);
      }
      setIsInputMode(false);
      setCustomIconUrl('');
    } catch (err) {
      console.error("Failed to update icon", err);
      alert("Failed to update icon. Please ensure the URL is valid.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="w-full h-full relative" onContextMenu={handleContextMenu} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        onDragStart={(e) => e.preventDefault()}
        className="group relative w-full h-full bg-surface rounded-lg shadow-md hover:shadow-xl transition-shadow flex flex-grow flex-col items-center justify-center p-2 overflow-hidden"
      >
        {isSmall ? (
          renderIcon()
        ) : (
          <>
            {renderIcon()}
            <h3 className="text-sm font-bold text-center text-text w-full break-words">{bookmark.title}</h3>
          </>
        )}

        {isInputMode && (
          <div
            className="absolute inset-0 bg-surface/95 flex flex-col items-center justify-center p-4 z-20 animate-in fade-in duration-200"
            onClick={(e) => e.preventDefault()}
          >
            <div className="flex w-full gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                autoFocus
                placeholder="Paste Icon URL..."
                value={customIconUrl}
                onChange={(e) => setCustomIconUrl(e.target.value)}
                className="flex-1 bg-background border border-gray-600 rounded px-2 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateIcon();
                  if (e.key === 'Escape') setIsInputMode(false);
                }}
              />
              <button
                onClick={handleUpdateIcon}
                disabled={isUpdating}
                className="p-1.5 bg-primary text-white rounded hover:opacity-80 transition-opacity"
              >
                {isUpdating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
              </button>
              <button
                onClick={() => setIsInputMode(false)}
                className="p-1.5 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">Supports .svg, .png, .jpg, .webp, .ico</p>
          </div>
        )}
      </a>

      {showMenu && (
        <div
          ref={menuRef}
          className="absolute z-[100] bg-surface border border-gray-700 rounded-lg shadow-2xl py-1 w-48 animate-in fade-in zoom-in duration-150"
          style={{ top: menuPos.y, left: menuPos.x }}
        >
          <button
            onClick={() => {
              setShowMenu(false);
              setIsInputMode(true);
            }}
            className="w-full text-left px-4 py-2 text-sm text-text hover:bg-primary hover:text-white flex items-center gap-3 transition-colors"
          >
            <ImageIcon size={16} />
            Provide custom icon
          </button>
        </div>
      )}
    </div>
  );
};
