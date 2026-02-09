export interface Tag {
  id: number;
  name: string;
}

export interface Bookmark {
  id: number;
  url: string;
  title: string;
  description: string;
  icon?: string;
  icon_last_fetched?: string;
  tags: Tag[];
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  role?: string;
  theme?: string;
  created_at?: string;
}

export interface TodoItem {
  id: number;
  todo_list_id: number;
  content: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TodoList {
  id: number;
  user_id: number;
  title: string;
  items: TodoItem[];
  created_at: string;
  updated_at: string;
}

export interface KanbanCard {
  id: number;
  column_id: number;
  title: string;
  description: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: number;
  board_id: number;
  title: string;
  color: string;
  position: number;
  cards: KanbanCard[];
  created_at: string;
  updated_at: string;
}

export interface KanbanBoard {
  id: number;
  user_id: number;
  title: string;
  description: string;
  position: number;
  columns: KanbanColumn[];
  created_at: string;
  updated_at: string;
}
