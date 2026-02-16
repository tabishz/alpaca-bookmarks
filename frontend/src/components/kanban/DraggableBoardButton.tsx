import React from 'react';
import { KanbanBoard } from '../../api/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableBoardButtonProps {
  board: KanbanBoard;
  isSelected: boolean;
  onClick: () => void;
}

export const DraggableBoardButton: React.FC<DraggableBoardButtonProps> = ({
  board,
  isSelected,
  onClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `board-${board.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center rounded-lg transition-colors overflow-hidden ${
        isSelected
          ? 'bg-primary text-white'
          : 'bg-surface text-muted hover:text-text'
      }`}
      {...attributes}
    >
      <button
        onClick={onClick}
        className="px-3 py-2 flex-1 text-left cursor-pointer"
      >
        {board.title}
      </button>
      <div
        className="px-2 py-2 cursor-move hover:bg-white/10"
        {...listeners}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="6" cy="2" r="1.5" />
          <circle cx="10" cy="2" r="1.5" />
          <circle cx="2" cy="6" r="1.5" />
          <circle cx="6" cy="6" r="1.5" />
          <circle cx="10" cy="6" r="1.5" />
          <circle cx="2" cy="10" r="1.5" />
          <circle cx="6" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
        </svg>
      </div>
    </div>
  );
};
