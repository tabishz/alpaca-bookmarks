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
