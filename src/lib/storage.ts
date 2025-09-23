import { Comment, VideoProgress, ViewHistory, User, Category, Video } from '@/types';
import { mockUsers, mockCategories, mockVideos, mockViewHistory } from '@/lib/mockData';

const COMMENTS_KEY = 'edustream_comments';
const PROGRESS_KEY = 'edustream_progress';
const HISTORY_KEY = 'edustream_history';
const USERS_KEY = 'edustream_users';
const CATEGORIES_KEY = 'edustream_categories';
const VIDEOS_KEY = 'edustream_videos';

// Comments Management
export const getComments = (videoId: string): Comment[] => {
  const stored = localStorage.getItem(COMMENTS_KEY);
  if (stored) {
    try {
      const allComments = JSON.parse(stored) as Comment[];
      return allComments.filter(c => c.videoId === videoId);
    } catch {
      return [];
    }
  }
  return [];
};

export const addComment = (comment: Omit<Comment, 'id' | 'createdAt'>): Comment => {
  const stored = localStorage.getItem(COMMENTS_KEY);
  let comments: Comment[] = [];
  
  if (stored) {
    try {
      comments = JSON.parse(stored);
    } catch {
      comments = [];
    }
  }
  
  const newComment: Comment = {
    ...comment,
    id: `com-${Date.now()}`,
    createdAt: new Date(),
  };
  
  comments.push(newComment);
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  
  return newComment;
};

// Video Progress Management
export const getVideoProgress = (videoId: string): VideoProgress | null => {
  const stored = localStorage.getItem(PROGRESS_KEY);
  if (stored) {
    try {
      const allProgress = JSON.parse(stored) as Record<string, VideoProgress>;
      return allProgress[videoId] || null;
    } catch {
      return null;
    }
  }
  return null;
};

export const saveVideoProgress = (progress: VideoProgress) => {
  const stored = localStorage.getItem(PROGRESS_KEY);
  let allProgress: Record<string, VideoProgress> = {};
  
  if (stored) {
    try {
      allProgress = JSON.parse(stored);
    } catch {
      allProgress = {};
    }
  }
  
  allProgress[progress.videoId] = progress;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
};

// User Management
export const getUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as User[];
    } catch {
      localStorage.setItem(USERS_KEY, JSON.stringify(mockUsers));
      return mockUsers;
    }
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(mockUsers));
  return mockUsers;
};

export const addUser = (user: User): void => {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const updateUser = (updatedUser: User): void => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === updatedUser.id);
  if (index >= 0) {
    users[index] = updatedUser;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

export const deleteUser = (userId: string): void => {
  const users = getUsers();
  const filteredUsers = users.filter(u => u.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(filteredUsers));
};

// Category Management
export const getCategories = (): Category[] => {
  const stored = localStorage.getItem(CATEGORIES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as Category[];
    } catch {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(mockCategories));
      return mockCategories;
    }
  }
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(mockCategories));
  return mockCategories;
};

export const addCategory = (category: Category): void => {
  const categories = getCategories();
  categories.push(category);
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
};

export const updateCategory = (updatedCategory: Category): void => {
  const categories = getCategories();
  const index = categories.findIndex(c => c.id === updatedCategory.id);
  if (index >= 0) {
    categories[index] = updatedCategory;
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }
};

export const deleteCategory = (categoryId: string): void => {
  const categories = getCategories();
  const filteredCategories = categories.filter(c => c.id !== categoryId);
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(filteredCategories));
};

// Video Management
export const getVideos = (): Video[] => {
  const stored = localStorage.getItem(VIDEOS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as Video[];
    } catch {
      localStorage.setItem(VIDEOS_KEY, JSON.stringify(mockVideos));
      return mockVideos;
    }
  }
  localStorage.setItem(VIDEOS_KEY, JSON.stringify(mockVideos));
  return mockVideos;
};

export const addVideo = (video: Video): void => {
  const videos = getVideos();
  videos.push(video);
  localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));
};

export const updateVideo = (updatedVideo: Video): void => {
  const videos = getVideos();
  const index = videos.findIndex(v => v.id === updatedVideo.id);
  if (index >= 0) {
    videos[index] = updatedVideo;
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));
  }
};

export const deleteVideo = (videoId: string): void => {
  const videos = getVideos();
  const filteredVideos = videos.filter(v => v.id !== videoId);
  localStorage.setItem(VIDEOS_KEY, JSON.stringify(filteredVideos));
};

// View History Management - Modified to work with or without userId
export const getViewHistory = (userId?: string): ViewHistory[] => {
  const stored = localStorage.getItem(HISTORY_KEY);
  if (stored) {
    try {
      const allHistory = JSON.parse(stored) as ViewHistory[];
      return userId ? allHistory.filter(h => h.userId === userId) : allHistory;
    } catch {
      // Initialize with mock data if parsing fails
      const initialHistory = mockViewHistory || [];
      localStorage.setItem(HISTORY_KEY, JSON.stringify(initialHistory));
      return userId ? initialHistory.filter(h => h.userId === userId) : initialHistory;
    }
  }
  // Initialize with mock data if no stored data
  const initialHistory = mockViewHistory || [];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(initialHistory));
  return userId ? initialHistory.filter(h => h.userId === userId) : initialHistory;
};

export const addToHistory = (history: Omit<ViewHistory, 'id'>): ViewHistory => {
  const stored = localStorage.getItem(HISTORY_KEY);
  let allHistory: ViewHistory[] = [];
  
  if (stored) {
    try {
      allHistory = JSON.parse(stored);
    } catch {
      allHistory = [];
    }
  }
  
  // Check if entry already exists
  const existingIndex = allHistory.findIndex(
    h => h.userId === history.userId && h.videoId === history.videoId
  );
  
  const newHistory: ViewHistory = {
    ...history,
    id: existingIndex >= 0 ? allHistory[existingIndex].id : `hist-${Date.now()}`,
  };
  
  if (existingIndex >= 0) {
    allHistory[existingIndex] = newHistory;
  } else {
    allHistory.push(newHistory);
  }
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(allHistory));
  
  return newHistory;
};