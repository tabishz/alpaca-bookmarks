import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { KanbanBoard, KanbanColumn, KanbanCard } from '../api/types';
import { Plus, Trash2, Edit3, ArrowLeft } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, closestCenter, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Draggable Card Component
const DraggableCard: React.FC<{ card: KanbanCard }> = ({ card }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-surface border border-gray-600 rounded-lg p-3 cursor-move hover:shadow-lg transition-shadow"
      {...attributes}
      {...listeners}
    >
      <h4 className="font-medium text-text mb-1">{card.title}</h4>
      {card.description && (
        <p className="text-sm text-muted">{card.description}</p>
      )}
    </div>
  );
};

// Column Component
const KanbanColumnComponent: React.FC<{
  column: KanbanColumn;
  onAddCard: (columnId: number) => void;
  onDeleteColumn: (columnId: number) => void;
  onUpdateColumn: (columnId: number, title: string) => void;
}> = ({ column, onAddCard, onDeleteColumn, onUpdateColumn }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
  });

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== column.title) {
      onUpdateColumn(column.id, editTitle);
    }
    setIsEditing(false);
  };

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
            <DraggableCard key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>

      <button
        onClick={() => onAddCard(column.id)}
        className="w-full mt-3 p-2 border-2 border-dashed border-gray-600 rounded-lg text-muted hover:border-primary hover:text-primary transition-colors"
      >
        <Plus size={16} className="inline mr-1" /> Add Card
      </button>
    </div>
  );
};

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
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/kanban/boards');
      console.log('Boards fetched:', response.data);
      setBoards(response.data);
      if (response.data.length > 0 && !selectedBoard) {
        setSelectedBoard(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch boards:', error);
      setError('Failed to fetch boards');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBoard = async (boardId: number) => {
    try {
      const response = await api.get(`/kanban/boards/${boardId}`);
      console.log('Board fetched:', response.data);
      setSelectedBoard(response.data);
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
      console.log('Board created:', newBoard);
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

  const createCard = async (columnId: number) => {
    const title = prompt('Enter card title:');
    if (!title?.trim()) return;

    try {
      await api.post(`/kanban/columns/${columnId}/cards`, {
        title,
        description: ''
      });
      if (selectedBoard) {
        fetchBoard(selectedBoard.id);
      }
    } catch (error) {
      console.error('Failed to create card:', error);
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

    try {
      await api.delete(`/kanban/columns/${columnId}`);
      if (selectedBoard) {
        fetchBoard(selectedBoard.id);
      }
    } catch (error) {
      console.error('Failed to delete column:', error);
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
          try {
            // Update card to move to new column
            await api.put(`/kanban/cards/${activeCard.id}`, {
              column_id: targetColumn.id,
              position: targetColumn.cards.length
            });
            fetchBoard(selectedBoard.id);
          } catch (error) {
            console.error('Failed to move card:', error);
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

      // Update positions in backend
      try {
        await Promise.all(
          reorderedCards.map((card, index) =>
            api.put(`/kanban/cards/${card.id}`, { position: index })
          )
        );
        fetchBoard(selectedBoard.id);
      } catch (error) {
        console.error('Failed to reorder cards:', error);
      }
    }
  };

  const addNewColumn = async () => {
    if (!newColumnTitle.trim() || !selectedBoard) return;

    await createColumn(selectedBoard.id, newColumnTitle);
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  return (
    <div className="min-h-screen p-6 md:p-10 w-full">
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted hover:text-text mb-4"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Kanban Boards</h1>
          <button
            onClick={() => setIsAddingBoard(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80"
          >
            <Plus size={20} /> New Board
          </button>
        </div>
      </div>

      {/* Board Selection */}
      {boards.length > 0 && (
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => fetchBoard(board.id)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedBoard?.id === board.id
                    ? 'bg-primary text-white'
                    : 'bg-surface text-muted hover:text-text'
                }`}
              >
                {board.title}
              </button>
            ))}
          </div>
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
            <button
              onClick={() => setIsAddingColumn(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-600 rounded-lg hover:border-primary hover:text-primary"
            >
              <Plus size={16} /> Add Column
            </button>
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
    </div>
  );
};
