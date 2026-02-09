import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Plus, Trash2, CheckCircle, Circle, ChevronRight, ChevronDown, ListTodo, Edit2, X, Save, Heart, Layout } from 'lucide-react';
import api from '../api/client';
import { TodoList, TodoItem } from '../api/types';
import { useTheme } from '../hooks/useTheme';

export const TodoListPage: React.FC = () => {
  useTheme();
  const navigate = useNavigate();
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLists, setExpandedLists] = useState<Set<number>>(new Set());
  const [newListTitle, setNewListTitle] = useState('');
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const [editingListTitle, setEditingListTitle] = useState('');

  const fetchTodoLists = async () => {
    try {
      const res = await api.get<TodoList[]>('/todos');
      setTodoLists(res.data);
      // Expand all by default initially or if only one list exists
      if (res.data.length === 1) {
        setExpandedLists(new Set([res.data[0].id]));
      }
    } catch (err) {
      console.error("Failed to fetch todo lists", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodoLists();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (isTyping) return;

      if (['h', 'Backspace', 'Escape'].includes(e.key)) {
        e.preventDefault();
        navigate('/');
      } else if (e.key === 'f') {
        e.preventDefault();
        navigate('/favorites');
      } else if (e.key === 'k') {
        e.preventDefault();
        navigate('/kanban');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const toggleListExpansion = (id: number) => {
    const newExpanded = new Set(expandedLists);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLists(newExpanded);
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    try {
      const res = await api.post<TodoList>('/todos', { title: newListTitle });
      setTodoLists([...todoLists, { ...res.data, items: [] }]);
      setNewListTitle('');
      setExpandedLists(new Set([...expandedLists, res.data.id]));
    } catch (err) {
      alert("Failed to create list");
    }
  };

  const handleDeleteList = async (id: number) => {
    if (!confirm("Delete this entire list and all its items?")) return;
    try {
      await api.delete(`/todos/${id}`);
      setTodoLists(todoLists.filter(l => l.id !== id));
    } catch (err) {
      alert("Failed to delete list");
    }
  };

  const handleUpdateListTitle = async (id: number) => {
    if (!editingListTitle.trim()) return;
    try {
      await api.put(`/todos/${id}`, { title: editingListTitle });
      setTodoLists(todoLists.map(l => l.id === id ? { ...l, title: editingListTitle } : l));
      setEditingListId(null);
    } catch (err) {
      alert("Failed to update title");
    }
  };

  const handleCreateItem = async (listId: number, content: string) => {
    if (!content.trim()) return;
    try {
      const res = await api.post<TodoItem>(`/todos/${listId}/items`, { content });
      setTodoLists(todoLists.map(l => {
        if (l.id === listId) {
          return { ...l, items: [...(l.items || []), res.data] };
        }
        return l;
      }));
    } catch (err) {
      alert("Failed to add item");
    }
  };

  const handleToggleItem = async (item: TodoItem) => {
    try {
      const res = await api.patch<TodoItem>(`/todos/items/${item.id}`, { completed: !item.completed });
      setTodoLists(todoLists.map(l => {
        if (l.id === item.todo_list_id) {
          return {
            ...l,
            items: l.items.map(i => i.id === item.id ? res.data : i)
          };
        }
        return l;
      }));
    } catch (err) {
      alert("Failed to update item");
    }
  };

  const handleDeleteItem = async (itemId: number, listId: number) => {
    try {
      await api.delete(`/todos/items/${itemId}`);
      setTodoLists(todoLists.map(l => {
        if (l.id === listId) {
          return { ...l, items: l.items.filter(i => i.id !== itemId) };
        }
        return l;
      }));
    } catch (err) {
      alert("Failed to delete item");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-10 w-full max-w-4xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListTodo size={32} className="text-primary" />
          <h1 className="text-3xl font-bold text-text">Alpaca Todo Lists</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-text hover:bg-primary hover:text-white transition-colors">
            <Home size={20} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link to="/favorites" className="flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-text hover:bg-primary hover:text-white transition-colors">
            <Heart size={20} />
            <span className="hidden sm:inline">Favorites</span>
          </Link>
          <Link to="/kanban" className="flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-text hover:bg-primary hover:text-white transition-colors">
            <Layout size={20} />
            <span className="hidden sm:inline">Kanban</span>
          </Link>
        </div>
      </header>

      <form onSubmit={handleCreateList} className="mb-8 flex gap-2">
        <input
          type="text"
          placeholder="New list title..."
          className="flex-1 rounded-md bg-surface p-3 text-text focus:outline-none focus:ring-2 focus:ring-primary"
          value={newListTitle}
          onChange={e => setNewListTitle(e.target.value)}
        />
        <button type="submit" className="rounded-md bg-primary px-6 py-2 font-bold text-white hover:opacity-90">
          <Plus size={24} />
        </button>
      </form>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading your tasks...</div>
      ) : (
        <div className="space-y-4">
          {todoLists.length === 0 ? (
            <div className="text-center py-20 bg-surface rounded-lg border border-dashed border-gray-700 text-gray-500">
              No todo lists yet. Create one to get started!
            </div>
          ) : (
            todoLists.map(list => (
              <div key={list.id} className="rounded-lg bg-surface shadow-md overflow-hidden border border-gray-700">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => toggleListExpansion(list.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                    {expandedLists.has(list.id) ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}

                    {editingListId === list.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          autoFocus
                          className="bg-background border border-primary rounded px-2 py-1 text-text w-full"
                          value={editingListTitle}
                          onChange={e => setEditingListTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleUpdateListTitle(list.id);
                            if (e.key === 'Escape') setEditingListId(null);
                          }}
                        />
                        <button onClick={() => handleUpdateListTitle(list.id)} className="text-green-500 hover:text-green-400"><Save size={18} /></button>
                        <button onClick={() => setEditingListId(null)} className="text-red-500 hover:text-red-400"><X size={18} /></button>
                      </div>
                    ) : (
                      <h2
                        className="text-xl font-bold text-text truncate"
                        onClick={() => toggleListExpansion(list.id)}
                      >
                        {list.title}
                        <span className="ml-3 text-xs font-normal text-gray-500 bg-black/20 px-2 py-0.5 rounded-full">
                          {list.items?.filter(i => i.completed).length || 0}/{list.items?.length || 0}
                        </span>
                      </h2>
                    )}
                  </div>

                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditingListId(list.id); setEditingListTitle(list.title); }}
                      className="p-2 text-gray-500 hover:text-primary transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {expandedLists.has(list.id) && (
                  <div className="border-t border-gray-700 bg-black/10 p-4">
                    <div className="space-y-2 mb-4">
                      {list.items && list.items.sort((a,b) => a.position - b.position).map(item => (
                        <div key={item.id} className="flex items-center gap-3 group">
                          <button
                            onClick={() => handleToggleItem(item)}
                            className={`shrink-0 transition-colors ${item.completed ? 'text-green-500' : 'text-gray-500 hover:text-primary'}`}
                          >
                            {item.completed ? <CheckCircle size={22} /> : <Circle size={22} />}
                          </button>
                          <span className={`flex-1 text-text ${item.completed ? 'line-through text-gray-500' : ''}`}>
                            {item.content}
                          </span>
                          <button
                            onClick={() => handleDeleteItem(item.id, list.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <TodoItemInput onAdd={(content) => handleCreateItem(list.id, content)} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const TodoItemInput: React.FC<{ onAdd: (content: string) => void }> = ({ onAdd }) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onAdd(content);
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="Add a task..."
        className="flex-1 bg-background border border-gray-700 rounded-md px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
        value={content}
        onChange={e => setContent(e.target.value)}
      />
      <button
        type="submit"
        className="bg-gray-700 text-white px-3 py-1.5 rounded-md text-sm font-bold hover:bg-primary transition-colors"
      >
        Add
      </button>
    </form>
  );
};
