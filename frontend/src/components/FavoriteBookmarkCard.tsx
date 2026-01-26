import React from 'react';
import { Bookmark } from '../api/types';
import { Globe } from 'lucide-react';

interface Props {
  bookmark: Bookmark;
  width: number;
  height: number;
}

export const FavoriteBookmarkCard: React.FC<Props> = ({ bookmark, width, height }) => {
  const isSmall = width === 1 && height === 1;

  return (
    <a
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative w-full h-full bg-surface rounded-lg shadow-md hover:shadow-xl transition-shadow flex flex-col items-center justify-center p-2"
    >
      {isSmall ? (
        <img
          src={`/api/v1/bookmarks/${bookmark.id}/icon`}
          alt=""
          className="w-1/2 h-1/2 object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            // Can't render the Globe icon here easily without more state, but hiding is a start
          }}
        />
      ) : (
        <>
          <img
            src={`/api/v1/bookmarks/${bookmark.id}/icon`}
            alt=""
            className="w-10 h-10 object-contain mb-2"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <h3 className="text-sm font-bold text-center text-text truncate w-full">{bookmark.title}</h3>
        </>
      )}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Add edit/delete buttons here if needed */}
      </div>
    </a>
  );
};
