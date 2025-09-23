export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
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
  videoUrl: string;
  thumbnail?: string;
  categoryId: string;
  duration: number; // in seconds
  uploadedBy: string;
  uploadedAt: Date;
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
  id: string;
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