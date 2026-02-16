import React, { useState } from 'react';
import { KanbanCard } from '../../api/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, X, Edit3, Trash2 } from 'lucide-react';

interface DraggableCardProps {
  card: KanbanCard;
  onDelete: (cardId: number) => void;
  onUpdate: (cardId: number, title: string) => void;
}

export const DraggableCard: React.FC<DraggableCardProps> = ({
  card,
  onDelete,
  onUpdate,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    disabled: false,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDeleteClick = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(card.id);
  };

  const handleEditClick = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsEditing(true);
    setEditTitle(card.title);
  };

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== card.title) {
      onUpdate(card.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(card.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
    e.stopPropagation();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-surface border border-gray-600 rounded-lg p-3 hover:shadow-lg transition-shadow group ${isEditing ? '' : 'cursor-move'}`}
      {...(isEditing ? {} : { ...attributes, ...listeners })}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  handleKeyDown(e);
                  handleInputKeyDown(e);
                }}
                className="flex-1 bg-background border border-gray-600 rounded px-2 py-1 text-text text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleSave(); }}
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                className="p-1 text-green-400 hover:text-green-300"
              >
                <Check size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleCancel(); }}
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                className="p-1 text-muted hover:text-text"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <h4 className="font-medium text-text mb-1">{card.title}</h4>
              {card.description && (
                <p className="text-sm text-muted">{card.description}</p>
              )}
            </>
          )}
        </div>
        {!isEditing && (
          <div className="flex gap-1 ml-2">
            <button
              onClick={handleEditClick}
              onPointerDown={handleEditClick}
              className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-primary transition-all pointer-events-auto"
              data-dndkit-disabled
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={handleDeleteClick}
              onPointerDown={handleDeleteClick}
              className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-red-400 transition-all pointer-events-auto"
              data-dndkit-disabled
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
