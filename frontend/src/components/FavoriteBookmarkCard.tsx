import React, { useEffect, useState } from 'react';
import { Bookmark } from '../api/types';
import { Globe } from 'lucide-react';
import api from '../api/client';

interface Props {
  bookmark: Bookmark;
  width: number;
  height: number;
}

export const FavoriteBookmarkCard: React.FC<Props> = ({ bookmark, width, height }) => {
  const isSmall = width === 1 && height === 1;
  const [iconSrc, setIconSrc] = useState<string | null>(null);
  const [iconError, setIconError] = useState(false);

  useEffect(() => {
    let objectUrl: string;

    const fetchIcon = async () => {
      if (!bookmark.id) return;

      try {
        const response = await api.get(`/bookmarks/${bookmark.id}/icon`, {
          responseType: 'blob',
        });
        
        if (response.data.size > 0) {
          objectUrl = URL.createObjectURL(response.data);
          setIconSrc(objectUrl);
        } else {
            setIconError(true);
        }
      } catch (error) {
        console.error('Failed to fetch icon:', error);
        setIconError(true);
      }
    };

    fetchIcon();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [bookmark.id]);

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

  return (
    <a
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
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