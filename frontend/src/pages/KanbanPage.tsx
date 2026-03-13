import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { KanbanBoard, KanbanColumn as KanbanColumnType, KanbanCard } from '../api/types';
import { Plus, Trash2, Home, Settings, Heart, ListTodo, Info } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, rectIntersection, CollisionDetection } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { UndoToast } from '../components/UndoToast';
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal';
import { DraggableBoardButton, KanbanColumn } from '../components/kanban';

interface UndoToastData {
  id: string;
  message: string;
  type: 'board' | 'column' | 'card';
  data: KanbanBoard | KanbanColumnType | KanbanCard;
  boardId?: number;
  columnIndex?: number;
  cardIndex?: number;
}

const LAST_BOARD_KEY = 'kanban_last_board_id';

  // Custom collision detection that only considers column-to-column when dragging columns
  const customCollisionDetection: CollisionDetection = (args) => {
    const { active, droppableContainers } = args;
    
    // Check if we're dragging a column
    const isDraggingColumn = String(active.id).startsWith('col-');
    
    // Filter containers based on what's being dragged
    const filteredContainers = droppableContainers.filter(container => {
      const containerId = String(container.id);
      if (isDraggingColumn) {
        // When dragging a column, only consider other columns
        return containerId.startsWith('col-');
      } else {
        // When dragging a card, consider both columns (as drop targets) and other cards
        return containerId.startsWith('col-') || typeof container.id === 'number';
      }
    });
    
    // Use rectIntersection for both columns and cards for better area coverage
    // This ensures we can drop cards anywhere within a column's bounds, including near the Add Card button
    return rectIntersection({
      ...args,
      droppableContainers: filteredContainers,
    });
  };

export const KanbanPage: React.FC = () => {
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<KanbanBoard | null>(null);
  const [activeId, setActiveId] = useState<number | string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
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
      if (e.key === 'n' && selectedBoard) {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement?.tagName === 'INPUT' ||
                                activeElement?.tagName === 'TEXTAREA' ||
                                (activeElement as HTMLElement)?.isContentEditable;

        if (!isInputFocused && selectedBoard.columns.length > 0) {
          const leftMostColumn = selectedBoard.columns.sort((a, b) => a.position - b.position)[0];
          setAddingCardColumn(leftMostColumn.id);
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
      const boardId = parseInt(urlBoardId);
      const board = boards.find(b => b.id === boardId);
      if (board) {
        setSelectedBoard(board);
        localStorage.setItem(LAST_BOARD_KEY, boardId.toString());
      } else {
        // Board not found, redirect to first available board
        const sortedBoards = [...boards].sort((a, b) => a.position - b.position);
        if (sortedBoards.length > 0) {
          const firstBoard = sortedBoards[0];
          setSelectedBoard(firstBoard);
          navigate(`/kanban/${firstBoard.id}`, { replace: true });
          localStorage.setItem(LAST_BOARD_KEY, firstBoard.id.toString());
        }
      }
    } else {
      const lastBoardId = localStorage.getItem(LAST_BOARD_KEY);
      if (lastBoardId) {
        const boardId = parseInt(lastBoardId);
        const board = boards.find(b => b.id === boardId);
        if (board) {
          setSelectedBoard(board);
          navigate(`/kanban/${boardId}`, { replace: true });
        } else {
          setSelectedBoard(boards[0]);
          navigate(`/kanban/${boards[0].id}`, { replace: true });
          localStorage.setItem(LAST_BOARD_KEY, boards[0].id.toString());
        }
      } else {
        setSelectedBoard(boards[0]);
        if (boards.length > 0) {
          navigate(`/kanban/${boards[0].id}`, { replace: true });
          localStorage.setItem(LAST_BOARD_KEY, boards[0].id.toString());
        }
      }
    }
  }, [boards, urlBoardId, navigate]);

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

      await createColumn(newBoard.id, 'To Do', false);
      await createColumn(newBoard.id, 'In Progress', false);
      await createColumn(newBoard.id, 'Done', false);

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

    const tempCard: KanbanCard = {
      id: -Date.now(),
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

    const columnIndex = selectedBoard?.columns.findIndex(c => c.id === columnId);
    const columnToDelete = selectedBoard?.columns.find(c => c.id === columnId);

    if (!selectedBoard || !columnToDelete || columnIndex === -1) return;

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

    const boardIndex = boards.findIndex(b => b.id === boardId);
    if (boardIndex === -1) return;

    setBoards(prev => prev.filter(b => b.id !== boardId));

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
        setBoards(prev => {
          const newBoards = [...prev];
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

    if (!activeId.startsWith('board-') || !overId.startsWith('board-')) return;

    const activeBoardId = parseInt(activeId.replace('board-', ''));
    const overBoardId = parseInt(overId.replace('board-', ''));

    if (activeBoardId === overBoardId) return;

    const oldIndex = boards.findIndex(b => b.id === activeBoardId);
    const newIndex = boards.findIndex(b => b.id === overBoardId);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedBoards = arrayMove(boards, oldIndex, newIndex);
    const reorderedBoardsWithPositions = reorderedBoards.map((board, index) => ({
      ...board,
      position: index
    }));

    setBoards(reorderedBoardsWithPositions);

    try {
      await Promise.all(
        reorderedBoardsWithPositions.map((board, index) =>
          api.put(`/kanban/boards/${board.id}`, { position: index })
        )
      );
    } catch (error) {
      console.error('Failed to reorder boards:', error);
      fetchBoards();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id;
    if (typeof id === 'string' && id.startsWith('col-')) {
      setActiveColumnId(id);
    } else {
      setActiveId(id);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveColumnId(null);

    if (!over || !selectedBoard) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Handle column reordering
    if (activeIdStr.startsWith('col-')) {
      if (!overIdStr.startsWith('col-')) return;
      
      const activeColumnIdNum = parseInt(activeIdStr.replace('col-', ''));
      const overColumnIdNum = parseInt(overIdStr.replace('col-', ''));

      if (activeColumnIdNum === overColumnIdNum) return;

      const sortedColumns = [...selectedBoard.columns].sort((a, b) => a.position - b.position);
      const oldIndex = sortedColumns.findIndex(c => c.id === activeColumnIdNum);
      const newIndex = sortedColumns.findIndex(c => c.id === overColumnIdNum);

      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedColumns = arrayMove(sortedColumns, oldIndex, newIndex);
      const reorderedColumnsWithPositions = reorderedColumns.map((column, index) => ({
        ...column,
        position: index
      }));

      const updatedBoard = { ...selectedBoard, columns: reorderedColumnsWithPositions };
      setSelectedBoard(updatedBoard);
      setBoards(prev => prev.map(board =>
        board.id === selectedBoard.id
          ? updatedBoard
          : board
      ));

      try {
        await api.put(`/kanban/columns/${activeColumnIdNum}`, { position: newIndex });
      } catch (error) {
        console.error('Failed to reorder column:', error);
        if (selectedBoard) {
          fetchBoard(selectedBoard.id);
        }
      }
      return;
    }

    // Handle card operations
    const activeCardId = active.id as number;
    const overId = over.id as string | number;

    let activeCard: KanbanCard | null = null;
    let activeColumn: KanbanColumnType | null = null;

    for (const column of selectedBoard.columns) {
      const card = column.cards.find(c => c.id === activeCardId);
      if (card) {
        activeCard = card;
        activeColumn = column;
        break;
      }
    }

    if (!activeCard) return;

    // Dropping on a column (move card to different column)
    if (typeof overId === 'string' && overId.startsWith('col-')) {
      const targetColumnId = parseInt(overId.replace('col-', ''));
      const targetColumn = selectedBoard.columns.find(c => c.id === targetColumnId);

      if (targetColumn && activeCard.column_id !== targetColumn.id) {
        const updatedColumns = selectedBoard.columns.map(col => {
          if (col.id === activeCard!.column_id) {
            return { ...col, cards: col.cards.filter(c => c.id !== activeCardId) };
          } else if (col.id === targetColumn.id) {
            return {
              ...col,
              cards: [...col.cards, { ...activeCard!, column_id: targetColumn.id }]
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
          await api.put(`/kanban/cards/${activeCard.id}`, {
            column_id: targetColumn.id,
            position: targetColumn.cards.length
          });
        } catch (error) {
          console.error('Failed to move card:', error);
          fetchBoard(selectedBoard.id);
        }
      }
      return;
    }

    // Reordering within the same column
    if (typeof overId === 'number') {
      let overCard: KanbanCard | null = null;
      let overColumn: KanbanColumnType | null = null;

      for (const column of selectedBoard.columns) {
        const card = column.cards.find(c => c.id === overId);
        if (card) {
          overCard = card;
          overColumn = column;
          break;
        }
      }

      if (!overCard || activeCard.column_id !== overCard.column_id) return;

      const oldIndex = activeColumn!.cards.findIndex(c => c.id === activeCardId);
      const newIndex = overColumn!.cards.findIndex(c => c.id === overId);

      if (oldIndex === newIndex) return;

      const reorderedCards = arrayMove(activeColumn!.cards, oldIndex, newIndex);
      const reorderedCardsWithPositions = reorderedCards.map((card, index) => ({
        ...card,
        position: index
      }));

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

      try {
        await Promise.all(
          reorderedCards.map((card, index) =>
            api.put(`/kanban/cards/${card.id}`, { position: index })
          )
        );
      } catch (error) {
        console.error('Failed to reorder cards:', error);
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

  const removeToast = (toastId: string) => {
    setUndoToasts(currentToasts => currentToasts.filter(t => t.id !== toastId));
    if (undoTimersRef.current[toastId]) {
      clearTimeout(undoTimersRef.current[toastId]);
      delete undoTimersRef.current[toastId];
    }
  };

  const handleUndoDelete = (toast: UndoToastData) => {
    if (toast.type === 'board') {
      const boardIndex = boards.findIndex(b => b.id === toast.boardId!);
      setBoards(prev => [...prev.slice(0, boardIndex!), toast.data as KanbanBoard, ...prev.slice(boardIndex!)]);
      if (selectedBoard?.id === toast.boardId) {
        setSelectedBoard(toast.data as KanbanBoard);
      }
    } else if (toast.type === 'column') {
      setBoards(prev => prev.map(board =>
        board.id === toast.boardId
          ? {
              ...board,
              columns: [...board.columns.slice(0, toast.columnIndex!), toast.data as KanbanColumnType, ...board.columns.slice(toast.columnIndex! + 1)]
            }
          : board
      ));
      if (selectedBoard?.id === toast.boardId) {
        fetchBoard(toast.boardId!);
      }
    } else if (toast.type === 'card') {
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

      const numKey = parseInt(e.key);
      if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
        e.preventDefault();
        const sortedBoards = [...boards].sort((a, b) => a.position - b.position);
        const boardIndex = numKey - 1;
        if (boardIndex < sortedBoards.length) {
          const board = sortedBoards[boardIndex];
          fetchBoard(board.id);
        }
      }

      if (e.key === 'i') {
        e.preventDefault();
        setIsInfoModalOpen(prev => !prev);
      }

      if (e.key === 'Escape' && isInfoModalOpen) {
        setIsInfoModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, boards, isInfoModalOpen]);

  // Get active card or column for drag overlay
  const getActiveCard = () => {
    if (!selectedBoard || !activeId) return null;
    return selectedBoard.columns
      .flatMap(col => col.cards)
      .find(c => c.id === activeId);
  };

  const getActiveColumn = () => {
    if (!selectedBoard || !activeColumnId) return null;
    const columnId = parseInt(activeColumnId.replace('col-', ''));
    return selectedBoard.columns.find(c => c.id === columnId);
  };

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={(e) => { e.preventDefault(); createBoard(); }}
            className="bg-surface rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-700"
          >
            <h2 className="text-xl font-bold mb-4 text-text">Create New Board</h2>
            <input
              type="text"
              placeholder="Board title"
              required
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              className="w-full bg-background border border-gray-600 rounded px-3 py-2 mb-3 text-text focus:border-primary focus:outline-none"
              autoFocus
            />
            <textarea
              placeholder="Board description (optional)"
              value={newBoardDescription}
              onChange={(e) => setNewBoardDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  createBoard();
                }
              }}
              className="w-full bg-background border border-gray-600 rounded px-3 py-2 mb-4 text-text h-20 resize-none focus:border-primary focus:outline-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
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
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 font-bold"
              >
                Create Board
              </button>
            </div>
          </form>
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

          {/* Single DnD Context for columns and cards */}
          <DndContext
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
           {selectedBoard.columns && selectedBoard.columns.length > 0 ? (
                 selectedBoard.columns
                   .sort((a, b) => a.position - b.position)
                   .map((column) => (
                     <SortableContext
                       id={`col-${column.id}`}
                       key={column.id}
                       items={column.cards.map(card => card.id)}
                       strategy={verticalListSortingStrategy}
                     >
                       <KanbanColumn
                         column={column}
                         onAddCard={createCard}
                         onDeleteColumn={deleteColumn}
                         onUpdateColumn={updateColumn}
                         onDeleteCard={deleteCard}
                         onUpdateCard={updateCard}
                       />
                     </SortableContext>
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
<DragOverlay className="pointer-events-none">
  {activeColumnId ? (
    (() => {
      const column = getActiveColumn();
      return column ? (
        <div className="bg-surface/50 rounded-lg p-4 min-w-[280px] max-w-[280px] opacity-90 border-2 border-primary">
          <h3 className="font-semibold text-text">{column.title}</h3>
        </div>
      ) : null;
    })()
  ) : activeId ? (
    (() => {
      const card = getActiveCard();
      return card ? (
        <div className="bg-surface border border-primary rounded-lg p-3 opacity-90">
          <h4 className="font-medium text-text mb-1">{card.title}</h4>
          {card.description && (
            <p className="text-sm text-muted">{card.description}</p>
          )}
        </div>
      ) : null;
    })()
  ) : null}
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
