export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'cliente';
  assignedCategories: string[];
  assignedModules?: string[];
  createdAt: Date;
  isActive?: boolean;
}

export interface SupportFile {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size?: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  createdAt: Date;
  releaseAt?: Date | null;
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
  supportFiles?: SupportFile[];
  releaseAt?: Date | null;
  contentType?: 'video' | 'file';
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
  releaseAt?: Date | null;
  evaluationUrl?: string | null;
  children?: Module[];
}
