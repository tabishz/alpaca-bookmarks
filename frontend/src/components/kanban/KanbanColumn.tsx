import React, { useState, useEffect } from 'react';
import { KanbanColumn as KanbanColumnType } from '../../api/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { DraggableCard } from './DraggableCard';

interface KanbanColumnProps {
  column: KanbanColumnType;
  onAddCard: (columnId: number, title: string) => void;
  onDeleteColumn: (columnId: number) => void;
  onUpdateColumn: (columnId: number, title: string) => void;
  onDeleteCard: (cardId: number) => void;
  onUpdateCard: (cardId: number, title: string) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  onAddCard,
  onDeleteColumn,
  onUpdateColumn,
  onDeleteCard,
  onUpdateCard,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `col-${column.id}`,
    disabled: isEditing || isAddingCard,
    data: {
      type: 'column',
      column,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== column.title) {
      onUpdateColumn(column.id, editTitle);
    }
    setIsEditing(false);
  };

  const handleStartAddCard = () => {
    setIsAddingCard(true);
    setNewCardTitle('');
  };

  const handleSaveNewCard = () => {
    if (newCardTitle.trim()) {
      onAddCard(column.id, newCardTitle.trim());
    }
    setIsAddingCard(false);
    setNewCardTitle('');
  };

  const handleCancelNewCard = () => {
    setIsAddingCard(false);
    setNewCardTitle('');
  };

  const handleNewCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveNewCard();
    } else if (e.key === 'Escape') {
      handleCancelNewCard();
    }
  };

  // Listen for keyboard shortcut to add card
  useEffect(() => {
    const handleAddCardEvent = (e: CustomEvent) => {
      if (e.detail.columnId === column.id) {
        handleStartAddCard();
      }
    };
    window.addEventListener('kanban-add-card', handleAddCardEvent as EventListener);
    return () => window.removeEventListener('kanban-add-card', handleAddCardEvent as EventListener);
  }, [column.id]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-surface/50 rounded-lg p-4 min-w-[280px] max-w-[280px] flex flex-col"
      {...attributes}
    >
      {/* Column Header with drag handle */}
      <div className="flex items-center justify-between mb-3">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyPress={(e) => e.key === 'Enter' && handleSaveTitle()}
            className="flex-1 bg-background border border-gray-600 rounded px-2 py-1 text-text mr-2"
            autoFocus
          />
        ) : (
          <h3 className="font-semibold text-text flex-1">{column.title}</h3>
        )}
        <div className="flex gap-1 items-center">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 text-muted hover:text-text"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => onDeleteColumn(column.id)}
            className="p-1 text-muted hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
          <div
            className="p-1 cursor-move text-muted hover:text-text"
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
      </div>

      {/* Cards area - no inner DndContext, just render cards */}
      <div className="space-y-2 min-h-[100px] rounded-lg flex-1">
        {column.cards.sort((a, b) => a.position - b.position).map((card) => (
          <DraggableCard key={card.id} card={card} onDelete={onDeleteCard} onUpdate={onUpdateCard} />
        ))}
      </div>

      {/* Add card button/form */}
      {isAddingCard ? (
        <div className="mt-3 bg-surface border border-gray-600 rounded-lg p-3">
          <input
            type="text"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            onKeyDown={handleNewCardKeyDown}
            placeholder="Enter card title..."
            className="w-full bg-background border border-gray-600 rounded px-2 py-1 text-text text-sm mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveNewCard}
              className="flex-1 px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary/80"
            >
              Add
            </button>
            <button
              onClick={handleCancelNewCard}
              className="px-3 py-1 text-muted hover:text-text text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleStartAddCard}
          className="w-full mt-3 p-2 border-2 border-dashed border-gray-600 rounded-lg text-muted hover:border-primary hover:text-primary transition-colors"
        >
          <Plus size={16} className="inline mr-1" /> Add Card
        </button>
      )}
    </div>
  );
};
