export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'cliente';
  assignedCategories: string[];
  createdAt: Date;
  isActive?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  createdAt: Date;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  thumbnail?: string;
  categoryId: string; // principal (compat)
  categoryIds?: string[]; // múltiplas categorias
  duration: number; // in seconds
  uploadedBy: string;
  uploadedAt: Date;
  vimeoId?: string;
  vimeoEmbedUrl?: string;
  moduleId?: string; // novo: vínculo ao módulo/submódulo
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
}

export interface ViewHistory {
  userId: string;
  videoId: string;
  watchedDuration: number; // in seconds
  completed: boolean;
  lastWatchedAt: Date;
}

export interface VideoProgress {
  videoId: string;
  currentTime: number;
  duration: number;
  completed: boolean;
}

export interface Module {
  id: string;
  categoryId: string;
  parentId?: string | null;
  title: string;
  description?: string;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
  children?: Module[];
}