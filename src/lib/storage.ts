import { Comment, VideoProgress, ViewHistory, User, Category, Video } from '@/types';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

// Helpers de conversão DB -> UI
const mapCategory = (row: any): Category => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  thumbnail: row.thumbnail || undefined,
  createdAt: row.created_at ? new Date(row.created_at) : new Date(),
});

const mapVideo = (row: any): Video => ({
  id: row.id,
  title: row.title,
  description: row.description || '',
  videoUrl: row.video_url || row.videoUrl || '',
  thumbnail: row.thumbnail || row.thumb || undefined,
  categoryId: row.category_id || row.categoryId,
  categoryIds: row.category_ids || row.categoryIds || undefined,
  duration: row.duration || 0,
  uploadedBy: row.uploaded_by || row.uploadedBy || 'admin',
  uploadedAt: row.uploaded_at ? new Date(row.uploaded_at) : (row.uploadedAt ? new Date(row.uploadedAt) : new Date()),
  vimeoId: row.vimeo_id || row.vimeoId || undefined,
  vimeoEmbedUrl: row.vimeo_embed_url || row.vimeoEmbedUrl || undefined,
});

const toDbVideo = (v: Video) => ({
  title: v.title,
  description: v.description,
  video_url: v.videoUrl,
  thumbnail: v.thumbnail,
  category_id: v.categoryId,
  category_ids: v.categoryIds,
  duration: v.duration,
  uploaded_by: v.uploadedBy,
  vimeo_id: v.vimeoId,
  vimeo_embed_url: v.vimeoEmbedUrl,
});

const mapUser = (row: any): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  assignedCategories: row.assigned_categories || [],
  createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  isActive: row.is_active,
});

// Comments
export const getComments = (videoId: string): Promise<Comment[]> =>
  api.getComments(videoId).then((rows: any[]) =>
    rows.map((r) => ({
      id: r.id,
      videoId: r.video_id,
      userId: r.user_id,
      userName: r.user_name || '',
      content: r.content,
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
    }))
  );

export const addComment = async (comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> => {
  const row = await api.addComment({
    video_id: comment.videoId,
    user_id: comment.userId,
    content: comment.content,
  });
  return {
    id: row.id,
    videoId: row.video_id,
    userId: row.user_id,
    userName: row.user_name || '',
    content: row.content,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  };
};

export const deleteComment = async (id: string): Promise<void> => {
  await api.deleteComment(id);
};

// Video Progress
export const getVideoProgress = async (videoId: string): Promise<VideoProgress | null> => {
  const user = getCurrentUser();
  if (!user) return null;
  const row = await api.getVideoProgress(user.id, videoId);
  if (!row) return null;
  return {
    videoId: row.video_id,
    currentTime: Math.max(0, row.time_watched || 0),
    duration: Math.max(row.time_watched || 0, row.duration || 0),
    completed: !!row.completed,
  };
};

export const saveVideoProgress = async (progress: VideoProgress) => {
  const user = getCurrentUser();
  if (!user) return;
  await api.saveVideoProgress({
    user_id: user.id,
    video_id: progress.videoId,
    time_watched: Math.floor(Math.max(0, progress.currentTime)),
    duration: Math.floor(Math.max(0, progress.duration, progress.currentTime)),
    completed: !!progress.completed,
  });
};

// Users (Profiles)
export const getUsers = async (): Promise<User[]> => {
  const rows = await api.getProfiles();
  return rows.map(mapUser);
};

export const addUser = async (user: User, password?: string): Promise<void> => {
  await api.addProfile({
    email: user.email,
    name: user.name,
    role: user.role,
    assigned_categories: user.assignedCategories,
    is_active: user.isActive !== false,
    password: password || undefined,
  });
};

export const updateUser = async (updatedUser: User): Promise<void> => {
  await api.updateProfile(updatedUser.id, {
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
    assigned_categories: updatedUser.assignedCategories,
    is_active: updatedUser.isActive !== false,
  });
};

export const deleteUser = async (_userId: string): Promise<void> => {
  await api.deleteProfile(_userId);
};

// Categories
export const getCategories = async (): Promise<Category[]> => {
  const rows = await api.getCategories();
  return rows.map(mapCategory);
};

export const addCategory = async (category: Category): Promise<void> => {
  await api.addCategory({ name: category.name, description: category.description, thumbnail: category.thumbnail });
};

export const updateCategory = async (updatedCategory: Category): Promise<void> => {
  await api.updateCategory(updatedCategory.id, { name: updatedCategory.name, description: updatedCategory.description, thumbnail: updatedCategory.thumbnail });
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  await api.deleteCategory(categoryId);
};

// Videos
export const getVideos = async (): Promise<Video[]> => {
  const rows = await api.getVideos();
  return rows.map(mapVideo);
};

export const addVideo = async (video: Video): Promise<void> => {
  await api.addVideo(toDbVideo(video));
};

export const updateVideo = async (updatedVideo: Video): Promise<void> => {
  await api.updateVideo(updatedVideo.id, toDbVideo(updatedVideo));
};

export const deleteVideo = async (videoId: string): Promise<void> => {
  await api.deleteVideo(videoId);
};

// View History
export const getViewHistory = async (userId?: string): Promise<ViewHistory[]> => {
  const rows = await api.getViewHistory(userId);
  return rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    videoId: r.video_id,
    watchedDuration: r.watched_duration || 0,
    completed: !!r.completed,
    lastWatchedAt: r.last_watched_at ? new Date(r.last_watched_at) : new Date(),
  }));
};

export const getRecentViews = async (limit = 10) => {
  const rows = await api.getRecentViews(limit);
  return rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    videoId: r.video_id,
    videoTitle: r.video_title,
    videoThumbnail: r.video_thumbnail,
    videoVimeoId: r.video_vimeo_id,
    videoUrl: r.video_url,
    videoCategoryId: r.video_category_id,
    watchedDuration: r.watched_duration || 0,
    completed: !!r.completed,
    lastWatchedAt: r.last_watched_at ? new Date(r.last_watched_at) : new Date(),
  }));
};

export const addToHistory = async (history: Omit<ViewHistory, 'id'>): Promise<ViewHistory> => {
  const row = await api.addToHistory({
    user_id: history.userId,
    video_id: history.videoId,
    watched_duration: history.watchedDuration,
    completed: history.completed,
  });
  return {
    id: row.id,
    userId: row.user_id,
    videoId: row.video_id,
    watchedDuration: row.watched_duration || 0,
    completed: !!row.completed,
    lastWatchedAt: row.last_watched_at ? new Date(row.last_watched_at) : new Date(),
  };
};