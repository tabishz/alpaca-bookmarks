export interface Tag {
  id: number;
  name: string;
}

export interface Bookmark {
  id: number;
  url: string;
  title: string;
  description: string;
  tags: Tag[];
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  theme?: string; // Add this optional field
  created_at?: string;
}
