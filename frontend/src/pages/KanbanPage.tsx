import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { KanbanBoard, KanbanColumn, KanbanCard } from '../api/types';
import { Plus, Trash2, Edit3, Home, Settings, Check, X, Heart, ListTodo, Info } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, closestCenter, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UndoToast } from '../components/UndoToast';
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal';

interface UndoToastData {
  id: string;
  message: string;
  type: 'board' | 'column' | 'card';
  data: KanbanBoard | KanbanColumn | KanbanCard;
  boardId?: number;
  columnIndex?: number;
  cardIndex?: number;
}

// Draggable Board Button Component
const DraggableBoardButton: React.FC<{
  board: KanbanBoard;
  isSelected: boolean;
  onClick: () => void;
}> = ({ board, isSelected, onClick }) => {
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
    <button
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg transition-colors cursor-move ${
        isSelected
          ? 'bg-primary text-white'
          : 'bg-surface text-muted hover:text-text'
      }`}
      {...attributes}
      {...listeners}
    >
      {board.title}
    </button>
  );
};

// Draggable Card Component
const DraggableCard: React.FC<{
  card: KanbanCard;
  onDelete: (cardId: number) => void;
  onUpdate: (cardId: number, title: string) => void;
}> = ({ card, onDelete, onUpdate }) => {
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
    // Stop propagation for all keys when editing to prevent dnd-kit interference
    e.stopPropagation();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    // Allow spacebar to work normally in the input
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

// Column Component
const KanbanColumnComponent: React.FC<{
  column: KanbanColumn;
  onAddCard: (columnId: number, title: string) => void;
  onDeleteColumn: (columnId: number) => void;
  onUpdateColumn: (columnId: number, title: string) => void;
  onDeleteCard: (cardId: number) => void;
  onUpdateCard: (cardId: number, title: string) => void;
}> = ({ column, onAddCard, onDeleteColumn, onUpdateColumn, onDeleteCard, onUpdateCard }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
  });

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
  React.useEffect(() => {
    const handleAddCardEvent = (e: CustomEvent) => {
      if (e.detail.columnId === column.id) {
        handleStartAddCard();
      }
    };
    window.addEventListener('kanban-add-card', handleAddCardEvent as EventListener);
    return () => window.removeEventListener('kanban-add-card', handleAddCardEvent as EventListener);
  }, [column.id]);

  return (
    <div className="bg-surface/50 rounded-lg p-4 min-w-[280px] max-w-[280px]">
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
        <div className="flex gap-1">
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
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[100px] rounded-lg transition-colors ${
          isOver ? 'bg-primary/20 border-2 border-dashed border-primary' : ''
        }`}
      >
        <SortableContext items={column.cards.map(card => card.id)} strategy={verticalListSortingStrategy}>
          {column.cards.sort((a, b) => a.position - b.position).map((card) => (
            <DraggableCard key={card.id} card={card} onDelete={onDeleteCard} onUpdate={onUpdateCard} />
          ))}
        </SortableContext>
      </div>

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

const LAST_BOARD_KEY = 'kanban_last_board_id';

export const KanbanPage: React.FC = () => {
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<KanbanBoard | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [isAddingBoard, setIsAddingBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);
  const [undoToasts, setUndoToasts] = useState<UndoToastData[]>([]);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const undoTimersRef = useRef<{ [key: string]: number }>({});
  const navigate = useNavigate();
  const { boardId: urlBoardId } = useParams();

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    const timers = undoTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  // Keyboard shortcut: 'n' to create new card in left-most column
  const addingCardColumnRef = useRef<number | null>(null);
  const setAddingCardColumn = (columnId: number | null) => {
    addingCardColumnRef.current = columnId;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if 'n' is pressed and no input/textarea is focused
      if (e.key === 'n' && selectedBoard) {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement?.tagName === 'INPUT' ||
                               activeElement?.tagName === 'TEXTAREA' ||
                               (activeElement as HTMLElement)?.isContentEditable;

        if (!isInputFocused && selectedBoard.columns.length > 0) {
          // Get left-most column (first in the sorted array)
          const leftMostColumn = selectedBoard.columns.sort((a, b) => a.position - b.position)[0];
          setAddingCardColumn(leftMostColumn.id);
          // Trigger a custom event to notify columns
          window.dispatchEvent(new CustomEvent('kanban-add-card', { detail: { columnId: leftMostColumn.id } }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBoard]);

  // Handle initial board selection based on URL or localStorage
  useEffect(() => {
    if (boards.length === 0) return;

    if (urlBoardId) {
      // If URL has boardId, select that board
      const boardId = parseInt(urlBoardId);
      const board = boards.find(b => b.id === boardId);
      if (board) {
        setSelectedBoard(board);
        localStorage.setItem(LAST_BOARD_KEY, boardId.toString());
      } else {
        // Board not found, navigate to base /kanban
        navigate('/kanban', { replace: true });
      }
    } else {
      // No boardId in URL, check localStorage
      const lastBoardId = localStorage.getItem(LAST_BOARD_KEY);
      if (lastBoardId) {
        const boardId = parseInt(lastBoardId);
        const board = boards.find(b => b.id === boardId);
        if (board) {
          setSelectedBoard(board);
          navigate(`/kanban/${boardId}`, { replace: true });
        } else {
          // Last board not found, default to first
          setSelectedBoard(boards[0]);
          navigate(`/kanban/${boards[0].id}`, { replace: true });
          localStorage.setItem(LAST_BOARD_KEY, boards[0].id.toString());
        }
      } else {
        // No last board in storage, default to first
        setSelectedBoard(boards[0]);
        if (boards.length > 0) {
          navigate(`/kanban/${boards[0].id}`, { replace: true });
          localStorage.setItem(LAST_BOARD_KEY, boards[0].id.toString());
        }
      }
    }
  }, [boards, urlBoardId]);

  const fetchBoards = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/kanban/boards');
      setBoards(response.data);
    } catch (error) {
      console.error('Failed to fetch boards:', error);
      setError('Failed to fetch boards');
    } finally {
      setIsLoading(false);
    }
  };

  // Select board by ID and update URL
  const selectBoard = (board: KanbanBoard | null) => {
    if (board) {
      setSelectedBoard(board);
      localStorage.setItem(LAST_BOARD_KEY, board.id.toString());
      navigate(`/kanban/${board.id}`, { replace: true });
    } else {
      setSelectedBoard(null);
      localStorage.removeItem(LAST_BOARD_KEY);
      navigate('/kanban', { replace: true });
    }
  };

  const fetchBoard = async (boardId: number) => {
    try {
      const response = await api.get(`/kanban/boards/${boardId}`);
      selectBoard(response.data);
      setBoards(prev => prev.map(board => board.id === boardId ? response.data : board));
    } catch (error) {
      console.error('Failed to fetch board:', error);
      setError('Failed to fetch board');
    }
  };

  const createBoard = async () => {
    if (!newBoardTitle.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post('/kanban/boards', {
        title: newBoardTitle,
        description: newBoardDescription
      });
      const newBoard = response.data;
      setBoards([...boards, newBoard]);
      setNewBoardTitle('');
      setNewBoardDescription('');
      setIsAddingBoard(false);

      // Create default columns and wait for all to complete
      await Promise.all([
        createColumn(newBoard.id, 'To Do', false),
        createColumn(newBoard.id, 'In Progress', false),
        createColumn(newBoard.id, 'Done', false)
      ]);

      // Now fetch the complete board with columns
      await fetchBoard(newBoard.id);
    } catch (error) {
      console.error('Failed to create board:', error);
      setError('Failed to create board');
    } finally {
      setIsLoading(false);
    }
  };

  const createColumn = async (boardId: number, title: string, shouldFetch = true) => {
    try {
      await api.post(`/kanban/boards/${boardId}/columns`, {
        title,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
      });
      if (shouldFetch && selectedBoard && selectedBoard.id === boardId) {
        fetchBoard(boardId);
      }
    } catch (error) {
      console.error('Failed to create column:', error);
    }
  };

  const createCard = async (columnId: number, title: string) => {
    if (!title?.trim() || !selectedBoard) return;

    // Optimistically add card to UI
    const tempCard: KanbanCard = {
      id: -Date.now(), // Temporary negative ID
      column_id: columnId,
      title: title.trim(),
      description: '',
      position: selectedBoard.columns.find(c => c.id === columnId)?.cards.length || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updatedColumns = selectedBoard.columns.map(col => {
      if (col.id === columnId) {
        return { ...col, cards: [...col.cards, tempCard] };
      }
      return col;
    });

    setBoards(prev => prev.map(board =>
      board.id === selectedBoard.id
        ? { ...board, columns: updatedColumns }
        : board
    ));
    setSelectedBoard(prev => prev ? { ...prev, columns: updatedColumns } : null);

    try {
      const response = await api.post(`/kanban/columns/${columnId}/cards`, {
        title: title.trim(),
        description: ''
      });
      // Replace temp card with real card from server
      const realCard = response.data;
      const finalColumns = selectedBoard.columns.map(col => {
        if (col.id === columnId) {
          return {
            ...col,
            cards: [...col.cards.filter(c => c.id !== tempCard.id), realCard].sort((a, b) => a.position - b.position)
          };
        }
        return col;
      });
      setBoards(prev => prev.map(board =>
        board.id === selectedBoard.id
          ? { ...board, columns: finalColumns }
          : board
      ));
      setSelectedBoard(prev => prev ? { ...prev, columns: finalColumns } : null);
    } catch (error) {
      console.error('Failed to create card:', error);
      // Remove temp card on error
      fetchBoard(selectedBoard.id);
    }
  };

  const updateColumn = async (columnId: number, title: string) => {
    try {
      await api.put(`/kanban/columns/${columnId}`, { title });
      if (selectedBoard) {
        fetchBoard(selectedBoard.id);
      }
    } catch (error) {
      console.error('Failed to update column:', error);
    }
  };

  const deleteColumn = async (columnId: number) => {
    if (!confirm('Are you sure you want to delete this column and all its cards?')) return;

    // Find column and its index before deletion
    const columnIndex = selectedBoard?.columns.findIndex(c => c.id === columnId);
    const columnToDelete = selectedBoard?.columns.find(c => c.id === columnId);

    if (!selectedBoard || !columnToDelete || columnIndex === -1) return;

    // Remove from UI immediately - update both boards and selectedBoard
    const updatedColumns = selectedBoard.columns.filter(c => c.id !== columnId);
    setBoards(prev => prev.map(board =>
      board.id === selectedBoard.id
        ? { ...board, columns: updatedColumns }
        : board
    ));
    setSelectedBoard(prev => prev ? { ...prev, columns: updatedColumns } : null);

    const toastId = `column-undo-${Date.now()}`;
    const newToast: UndoToastData = {
      id: toastId,
      message: `Deleted column "${columnToDelete.title}" and its cards`,
      type: 'column',
      data: columnToDelete,
      boardId: selectedBoard.id,
      columnIndex
    };
    setUndoToasts(prev => [...prev, newToast]);

    const timer = window.setTimeout(() => {
      api.delete(`/kanban/columns/${columnId}`).catch(error => {
        console.error("Failed to permanently delete column", error);
        // Show error and restore from undo
        setBoards(prev => prev.map(board =>
          board.id === selectedBoard.id
            ? { ...board, columns: [...board.columns.slice(0, columnIndex), columnToDelete, ...board.columns.slice(columnIndex)] }
            : board
        ));
        setSelectedBoard(prev => prev ? { ...prev, columns: [...prev.columns.slice(0, columnIndex), columnToDelete, ...prev.columns.slice(columnIndex)] } : null);
        alert("Error: Could not delete column from server.");
      });
      removeToast(toastId);
    }, 10000);

    undoTimersRef.current[toastId] = timer;
  };

  const deleteCard = async (cardId: number) => {
    if (!selectedBoard) return;

    // Find card and its column/index before deletion
    let cardToDelete: KanbanCard | null = null;
    let columnIndex: number = -1;
    let cardIndex: number = -1;

    for (const column of selectedBoard.columns) {
      const card = column.cards.find(c => c.id === cardId);
      if (card) {
        cardToDelete = card;
        columnIndex = selectedBoard.columns.findIndex(c => c.id === column.id);
        cardIndex = column.cards.findIndex(c => c.id === cardId);
        break;
      }
    }

    if (!cardToDelete || columnIndex === -1) return;

    // Remove from UI immediately - update both boards and selectedBoard
    const updatedColumns = selectedBoard.columns.map((col, idx) =>
      idx === columnIndex
        ? { ...col, cards: col.cards.filter(c => c.id !== cardId) }
        : col
    );

    setBoards(prev => prev.map(board =>
      board.id === selectedBoard.id
        ? { ...board, columns: updatedColumns }
        : board
    ));
    setSelectedBoard(prev => prev ? { ...prev, columns: updatedColumns } : null);

    const toastId = `card-undo-${Date.now()}`;
    const newToast: UndoToastData = {
      id: toastId,
      message: `Deleted card "${cardToDelete.title}"`,
      type: 'card',
      data: cardToDelete,
      boardId: selectedBoard.id,
      columnIndex,
      cardIndex
    };
    setUndoToasts(prev => [...prev, newToast]);

    const timer = window.setTimeout(() => {
      api.delete(`/kanban/cards/${cardId}`).catch(error => {
        console.error("Failed to permanently delete card", error);
        // Show error and restore from undo
        const restoredColumns = selectedBoard.columns.map((col, idx) =>
          idx === columnIndex
            ? { ...col, cards: [...col.cards.slice(0, cardIndex), cardToDelete, ...col.cards.slice(cardIndex + 1)] }
            : col
        );
        setBoards(prev => prev.map(board =>
          board.id === selectedBoard.id
            ? { ...board, columns: restoredColumns }
            : board
        ));
        setSelectedBoard(prev => prev ? { ...prev, columns: restoredColumns } : null);
        alert("Error: Could not delete card from server.");
      });
      removeToast(toastId);
    }, 10000);

    undoTimersRef.current[toastId] = timer;
  };

  const updateCard = async (cardId: number, title: string) => {
    if (!selectedBoard || !title.trim()) return;

    // Find the card and its column
    let cardToUpdate: KanbanCard | null = null;
    let columnIndex: number = -1;

    for (let i = 0; i < selectedBoard.columns.length; i++) {
      const column = selectedBoard.columns[i];
      const card = column.cards.find(c => c.id === cardId);
      if (card) {
        cardToUpdate = card;
        columnIndex = i;
        break;
      }
    }

    if (!cardToUpdate || columnIndex === -1) return;

    // Optimistically update UI
    const updatedColumns = selectedBoard.columns.map((col, idx) =>
      idx === columnIndex
        ? { ...col, cards: col.cards.map(c => c.id === cardId ? { ...c, title } : c) }
        : col
    );

    setBoards(prev => prev.map(board =>
      board.id === selectedBoard.id
        ? { ...board, columns: updatedColumns }
        : board
    ));
    setSelectedBoard(prev => prev ? { ...prev, columns: updatedColumns } : null);

    try {
      await api.put(`/kanban/cards/${cardId}`, { title });
    } catch (error) {
      console.error('Failed to update card:', error);
      // Revert on error
      setBoards(prev => prev.map(board =>
        board.id === selectedBoard.id
          ? { ...board, columns: selectedBoard.columns }
          : board
      ));
      setSelectedBoard(prev => prev ? { ...prev, columns: selectedBoard.columns } : null);
      alert('Error: Could not update card on server.');
    }
  };

  const deleteBoard = async (boardId: number) => {
    const boardToDelete = boards.find(b => b.id === boardId);
    if (!boardToDelete) return;

    if (!confirm(`Are you sure you want to delete the board "${boardToDelete.title}" and all its Data?`)) return;

    // Find Board index
    const boardIndex = boards.findIndex(b => b.id === boardId);
    if (boardIndex === -1) return;

    // Remove from UI immediately
    setBoards(prev => prev.filter(b => b.id !== boardId));

    // If deleted board was selected, select a different board
    if (selectedBoard?.id === boardId) {
      const remainingBoards = boards.filter(b => b.id !== boardId);
      setSelectedBoard(remainingBoards.length > 0 ? remainingBoards[0] : null);
    }

    const toastId = `board-undo-${Date.now()}`;
    const newToast: UndoToastData = {
      id: toastId,
      message: `Deleted board "${boardToDelete.title}"`,
      type: 'board',
      data: boardToDelete,
      boardId
    };
    setUndoToasts(prev => [...prev, newToast]);

    const timer = window.setTimeout(() => {
      api.delete(`/kanban/boards/${boardId}`).catch(error => {
        console.error("Failed to permanently delete board", error);
        // Restore from undo
        setBoards(prev => {
          const newBoards = [...prev];
          // Insert at original index, or at end if index is out of bounds
          if (boardIndex >= newBoards.length) {
            newBoards.push(boardToDelete);
          } else {
            newBoards.splice(boardIndex, 0, boardToDelete);
          }
          return newBoards;
        });
        if (selectedBoard?.id === boardId || !selectedBoard) {
          setSelectedBoard(boardToDelete);
        }
        alert("Error: Could not delete board from server.");
      });
      removeToast(toastId);
    }, 10000);

    undoTimersRef.current[toastId] = timer;
  };

  const handleBoardDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Check if we're dragging a board
    if (!activeId.startsWith('board-') || !overId.startsWith('board-')) return;

    const activeBoardId = parseInt(activeId.replace('board-', ''));
    const overBoardId = parseInt(overId.replace('board-', ''));

    if (activeBoardId === overBoardId) return;

    const oldIndex = boards.findIndex(b => b.id === activeBoardId);
    const newIndex = boards.findIndex(b => b.id === overBoardId);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder boards locally
    const reorderedBoards = arrayMove(boards, oldIndex, newIndex);

    // Update position values to match new order
    const reorderedBoardsWithPositions = reorderedBoards.map((board, index) => ({
      ...board,
      position: index
    }));

    setBoards(reorderedBoardsWithPositions);

    // Update positions in backend
    try {
      await Promise.all(
        reorderedBoardsWithPositions.map((board, index) =>
          api.put(`/kanban/boards/${board.id}`, { position: index })
        )
      );
    } catch (error) {
      console.error('Failed to reorder boards:', error);
      // Revert on error
      fetchBoards();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Handle drag over logic if needed
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !selectedBoard) return;

    const activeId = active.id as number;
    const overId = over.id as string | number;

    // Find the active card and its column
    let activeCard: KanbanCard | null = null;
    let activeColumn: KanbanColumn | null = null;

    for (const column of selectedBoard.columns) {
      const card = column.cards.find(c => c.id === activeId);
      if (card) {
        activeCard = card;
        activeColumn = column;
        break;
      }
    }

    if (!activeCard) return;

    // Check if we're dropping on a column (column IDs are strings like "column-1")
    if (typeof overId === 'string' && overId.startsWith('column-')) {
      const targetColumnId = parseInt(overId.replace('column-', ''));
      const targetColumn = selectedBoard.columns.find(c => c.id === targetColumnId);

      if (targetColumn) {
        // Moving card to a different column
        if (activeCard.column_id !== targetColumn.id) {
          // Optimistically update UI immediately
          const updatedColumns = selectedBoard.columns.map(col => {
            if (col.id === activeCard.column_id) {
              // Remove from source column
              return { ...col, cards: col.cards.filter(c => c.id !== activeId) };
            } else if (col.id === targetColumn.id) {
              // Add to target column with updated column_id
              return {
                ...col,
                cards: [...col.cards, { ...activeCard, column_id: targetColumn.id }]
              };
            }
            return col;
          });

          setBoards(prev => prev.map(board =>
            board.id === selectedBoard.id
              ? { ...board, columns: updatedColumns }
              : board
          ));
          setSelectedBoard(prev => prev ? { ...prev, columns: updatedColumns } : null);

          try {
            // Update card to move to new column
            await api.put(`/kanban/cards/${activeCard.id}`, {
              column_id: targetColumn.id,
              position: targetColumn.cards.length
            });
          } catch (error) {
            console.error('Failed to move card:', error);
            // Revert on error
            fetchBoard(selectedBoard.id);
          }
        }
        return;
      }
    }

    // Find over card for reordering within the same column
    if (typeof overId === 'number') {
      let overCard: KanbanCard | null = null;
      let overColumn: KanbanColumn | null = null;

      for (const column of selectedBoard.columns) {
        const card = column.cards.find(c => c.id === overId);
        if (card) {
          overCard = card;
          overColumn = column;
          break;
        }
      }

      if (!overCard || activeCard.column_id !== overCard.column_id) return;

      // Reordering within the same column
      const oldIndex = activeColumn!.cards.findIndex(c => c.id === activeId);
      const newIndex = overColumn!.cards.findIndex(c => c.id === overId);

      if (oldIndex === newIndex) return;

      const reorderedCards = arrayMove(activeColumn!.cards, oldIndex, newIndex);

      // Update position values to match new order
      const reorderedCardsWithPositions = reorderedCards.map((card, index) => ({
        ...card,
        position: index
      }));

      // Optimistically update UI immediately
      const updatedColumns = selectedBoard.columns.map(col => {
        if (col.id === activeColumn!.id) {
          return { ...col, cards: reorderedCardsWithPositions };
        }
        return col;
      });

      setBoards(prev => prev.map(board =>
        board.id === selectedBoard.id
          ? { ...board, columns: updatedColumns }
          : board
      ));
      setSelectedBoard(prev => prev ? { ...prev, columns: updatedColumns } : null);

      // Update positions in backend
      try {
        await Promise.all(
          reorderedCards.map((card, index) =>
            api.put(`/kanban/cards/${card.id}`, { position: index })
          )
        );
      } catch (error) {
        console.error('Failed to reorder cards:', error);
        // Revert on error
        fetchBoard(selectedBoard.id);
      }
    }
  };

  const addNewColumn = async () => {
    if (!newColumnTitle.trim() || !selectedBoard) return;

    await createColumn(selectedBoard.id, newColumnTitle);
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  // Undo toast functions
  const removeToast = (toastId: string) => {
    setUndoToasts(currentToasts => currentToasts.filter(t => t.id !== toastId));
    if (undoTimersRef.current[toastId]) {
      clearTimeout(undoTimersRef.current[toastId]);
      delete undoTimersRef.current[toastId];
    }
  };

  const handleUndoDelete = (toast: UndoToastData) => {
    if (toast.type === 'board') {
      // Restore board
      const boardIndex = boards.findIndex(b => b.id === toast.boardId!);
      setBoards(prev => [...prev.slice(0, boardIndex!), toast.data as KanbanBoard, ...prev.slice(boardIndex!)]);
      if (selectedBoard?.id === toast.boardId) {
        setSelectedBoard(toast.data as KanbanBoard);
      }
    } else if (toast.type === 'column') {
      // Restore column
      setBoards(prev => prev.map(board =>
        board.id === toast.boardId
          ? {
              ...board,
              columns: [...board.columns.slice(0, toast.columnIndex!), toast.data as KanbanColumn, ...board.columns.slice(toast.columnIndex! + 1)]
            }
          : board
      ));
      if (selectedBoard?.id === toast.boardId) {
        fetchBoard(toast.boardId!);
      }
    } else if (toast.type === 'card') {
      // Restore card - insert and then sort by position to ensure correct order
      const restoredColumns = (prevBoard: KanbanBoard) =>
        prevBoard.columns.map((col, idx) =>
          idx === toast.columnIndex!
            ? { ...col, cards: [...col.cards, toast.data as KanbanCard].sort((a, b) => a.position - b.position) }
            : col
        );

      setBoards(prev => prev.map(board =>
        board.id === toast.boardId
          ? { ...board, columns: restoredColumns(board) }
          : board
      ));

      if (selectedBoard?.id === toast.boardId) {
        setSelectedBoard(prev => prev ? { ...prev, columns: restoredColumns(prev) } : null);
      }
    }
    removeToast(toast.id);
  };

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as HTMLElement).isContentEditable;

      if (isTyping) return;

      if (e.key === 'h' || e.key === 'Backspace') {
        e.preventDefault();
        navigate('/');
      } else if (e.key === 'f') {
        e.preventDefault();
        navigate('/favorites');
      } else if (e.key === 'd') {
        e.preventDefault();
        navigate('/todos');
      }

      // Number keys 1-9 to select boards
      const numKey = parseInt(e.key);
      if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
        e.preventDefault();
        const sortedBoards = [...boards].sort((a, b) => a.position - b.position);
        const boardIndex = numKey - 1; // Convert to 0-based index
        if (boardIndex < sortedBoards.length) {
          const board = sortedBoards[boardIndex];
          fetchBoard(board.id);
        }
      }

      // Toggle info modal with 'i' key
      if (e.key === 'i') {
        e.preventDefault();
        setIsInfoModalOpen(prev => !prev);
      }

      // Close modal with Escape key
      if (e.key === 'Escape' && isInfoModalOpen) {
        setIsInfoModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, boards, isInfoModalOpen]);

  return (
    <div className="min-h-screen p-6 md:p-10 w-full">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Alpaca Kanban</h1>
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-text hover:bg-primary hover:text-white transition-colors">
            <Home size={20} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link to="/favorites" className="flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-text hover:bg-primary hover:text-white transition-colors">
            <Heart size={20} />
            <span className="hidden sm:inline">Favorites</span>
          </Link>
          <Link to="/todos" className="flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-text hover:bg-primary hover:text-white transition-colors">
            <ListTodo size={20} />
            <span className="hidden sm:inline">Todo List</span>
          </Link>
          <button
            onClick={() => setIsAddingBoard(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80"
          >
            <Plus size={20} /> New Board
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsInfoModalOpen(true); }}
            className="p-2 rounded-md text-gray-400 hover:text-white transition-colors"
          >
            <Info size={28} />
          </button>
        </div>
      </header>

      {/* Board Selection */}
      {boards.length > 0 && (
        <div className="mb-6">
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleBoardDragEnd}
          >
            <SortableContext
              items={boards.map(board => `board-${board.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-2 flex-wrap">
                {boards.sort((a, b) => a.position - b.position).map((board) => (
                  <DraggableBoardButton
                    key={board.id}
                    board={board}
                    isSelected={selectedBoard?.id === board.id}
                    onClick={() => fetchBoard(board.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* New Board Modal */}
      {isAddingBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Board</h2>
            <input
              type="text"
              placeholder="Board title"
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              className="w-full bg-background border border-gray-600 rounded px-3 py-2 mb-3 text-text"
              autoFocus
            />
            <textarea
              placeholder="Board description (optional)"
              value={newBoardDescription}
              onChange={(e) => setNewBoardDescription(e.target.value)}
              className="w-full bg-background border border-gray-600 rounded px-3 py-2 mb-4 text-text h-20 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsAddingBoard(false);
                  setNewBoardTitle('');
                  setNewBoardDescription('');
                }}
                className="px-4 py-2 text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                onClick={createBoard}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
              >
                Create Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {selectedBoard && !isLoading && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{selectedBoard.title}</h2>
              {selectedBoard.description && (
                <p className="text-muted">{selectedBoard.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsAddingColumn(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-600 rounded-lg hover:border-primary hover:text-primary"
              >
                <Plus size={16} /> Add Column
              </button>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBoardMenuOpen(!isBoardMenuOpen);
                  }}
                  className="p-2 rounded-lg border border-gray-600 hover:border-primary hover:text-primary"
                >
                  <Settings size={24} />
                </button>
                {isBoardMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface rounded-lg border border-gray-700 shadow-xl z-50">
                    <button
                      onClick={() => {
                        setIsBoardMenuOpen(false);
                        deleteBoard(selectedBoard.id);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-400/10 flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete Board
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* New Column Input */}
          {isAddingColumn && (
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Column title"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addNewColumn()}
                className="bg-background border border-gray-600 rounded px-3 py-2 text-text flex-1 max-w-xs"
                autoFocus
              />
              <button
                onClick={addNewColumn}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingColumn(false);
                  setNewColumnTitle('');
                }}
                className="px-4 py-2 text-muted hover:text-text"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Kanban Board */}
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {selectedBoard.columns && selectedBoard.columns.length > 0 ? (
                selectedBoard.columns
                  .sort((a, b) => a.position - b.position)
                  .map((column) => (
                    <div key={column.id} className="flex-shrink-0">
                      <SortableContext
                        items={[`column-${column.id}`, ...column.cards.map(card => card.id)]}
                        strategy={verticalListSortingStrategy}
                      >
                        <KanbanColumnComponent
                          column={column}
                          onAddCard={createCard}
                          onDeleteColumn={deleteColumn}
                          onUpdateColumn={updateColumn}
                          onDeleteCard={deleteCard}
                          onUpdateCard={updateCard}
                        />
                      </SortableContext>
                    </div>
                  ))
              ) : (
                <div className="text-center py-20 flex-1">
                  <div className="text-4xl mb-4">📝</div>
                  <h3 className="text-xl font-bold mb-2">No Columns Yet</h3>
                  <p className="text-muted mb-4">Add your first column to get started</p>
                  <button
                    onClick={() => setIsAddingColumn(true)}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80"
                  >
                    Add First Column
                  </button>
                </div>
              )}
            </div>
            <DragOverlay>
              {activeId && selectedBoard && (
                (() => {
                  const card = selectedBoard.columns
                    .flatMap(col => col.cards)
                    .find(c => c.id === activeId);
                  return card ? (
                    <div className="bg-surface border border-primary rounded-lg p-3 opacity-90">
                      <h4 className="font-medium text-text mb-1">{card.title}</h4>
                      {card.description && (
                        <p className="text-sm text-muted">{card.description}</p>
                      )}
                    </div>
                  ) : null;
                })()
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {error && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-red-400">Error</h2>
          <p className="text-muted mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchBoards();
            }}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/80"
          >
            Try Again
          </button>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold mb-2">Loading...</h2>
          <p className="text-muted">Please wait while we set up your board</p>
        </div>
      )}

      {!error && !isLoading && boards.length === 0 && !isAddingBoard && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold mb-2">No Kanban Boards Yet</h2>
          <p className="text-muted mb-6">Create your first Kanban board to start organizing your tasks</p>
          <button
            onClick={() => setIsAddingBoard(true)}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/80"
          >
            Create Your First Board
          </button>
        </div>
      )}

      <div className="fixed bottom-10 right-10 z-50 flex flex-col gap-3">
        {undoToasts.map(toast => (
          <UndoToast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            duration={10000}
            onUndo={() => handleUndoDelete(toast)}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <KeyboardShortcutsModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </div>
  );
};
