import { Comment, VideoProgress, ViewHistory } from '@/types';

const COMMENTS_KEY = 'edustream_comments';
const PROGRESS_KEY = 'edustream_progress';
const HISTORY_KEY = 'edustream_history';

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

// View History Management
export const getViewHistory = (userId: string): ViewHistory[] => {
  const stored = localStorage.getItem(HISTORY_KEY);
  if (stored) {
    try {
      const allHistory = JSON.parse(stored) as ViewHistory[];
      return allHistory.filter(h => h.userId === userId);
    } catch {
      return [];
    }
  }
  return [];
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