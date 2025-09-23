import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from './auth';

// Categories
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  
  return data || [];
}

export async function addCategory(category: { name: string; description: string; thumbnail?: string }) {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();
  
  if (error) {
    console.error('Error adding category:', error);
    throw error;
  }
  
  return data;
}

export async function updateCategory(id: string, updates: Partial<{ name: string; description: string; thumbnail?: string }>) {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating category:', error);
    throw error;
  }
  
  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}

// Videos
export async function getVideos() {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
  
  return data || [];
}

export async function getVideoById(id: string) {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching video:', error);
    return null;
  }
  
  return data;
}

export async function addVideo(video: {
  title: string;
  description: string;
  video_url?: string;
  thumbnail?: string;
  category_id: string;
  duration: number;
  uploaded_by?: string;
  vimeo_id?: string;
  vimeo_embed_url?: string;
}) {
  const { data, error } = await supabase
    .from('videos')
    .insert({
      ...video,
      uploaded_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding video:', error);
    throw error;
  }
  
  return data;
}

export async function updateVideo(id: string, updates: Partial<{
  title: string;
  description: string;
  video_url?: string;
  thumbnail?: string;
  category_id: string;
  duration: number;
  vimeo_id?: string;
  vimeo_embed_url?: string;
}>) {
  const { data, error } = await supabase
    .from('videos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating video:', error);
    throw error;
  }
  
  return data;
}

export async function deleteVideo(id: string) {
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting video:', error);
    throw error;
  }
}

// Users/Profiles
export async function getProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
  
  return data || [];
}

export async function getCurrentProfile() {
  const user = getCurrentUser();
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', user.email)
    .single();
  
  if (error) {
    console.error('Error fetching current profile:', error);
    return null;
  }
  
  return data;
}

export async function addProfile(profile: {
  email: string;
  name: string;
  role: 'admin' | 'user';
  assigned_categories?: string[];
  is_active?: boolean;
}) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      ...profile,
      assigned_categories: profile.assigned_categories || []
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding profile:', error);
    throw error;
  }
  
  return data;
}

export async function updateProfile(id: string, updates: Partial<{
  name: string;
  role: 'admin' | 'user';
  assigned_categories?: string[];
  is_active?: boolean;
}>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
  
  return data;
}

export async function deleteProfile(id: string) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting profile:', error);
    throw error;
  }
}

// View History
export async function getViewHistory(userId?: string) {
  let query = supabase
    .from('view_history')
    .select(`
      *,
      video:videos(*),
      user:profiles(*)
    `)
    .order('last_watched_at', { ascending: false });
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching view history:', error);
    return [];
  }
  
  return data || [];
}

export async function addToHistory(history: {
  user_id: string;
  video_id: string;
  watched_duration: number;
  completed: boolean;
}) {
  const { data: existing } = await supabase
    .from('view_history')
    .select('*')
    .eq('user_id', history.user_id)
    .eq('video_id', history.video_id)
    .single();
  
  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('view_history')
      .update({
        watched_duration: Math.max(existing.watched_duration, history.watched_duration),
        completed: existing.completed || history.completed,
        last_watched_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating view history:', error);
      throw error;
    }
    
    return data;
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('view_history')
      .insert({
        ...history,
        last_watched_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding to view history:', error);
      throw error;
    }
    
    return data;
  }
}

// Comments
export async function getComments(videoId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:profiles(*)
    `)
    .eq('video_id', videoId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
  
  return data || [];
}

export async function addComment(comment: {
  video_id: string;
  user_id: string;
  content: string;
}) {
  const { data, error } = await supabase
    .from('comments')
    .insert(comment)
    .select(`
      *,
      user:profiles(*)
    `)
    .single();
  
  if (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
  
  return data;
}

// Video Progress
export async function getVideoProgress(userId: string, videoId: string) {
  const { data, error } = await supabase
    .from('video_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('video_id', videoId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // Ignore not found errors
    console.error('Error fetching video progress:', error);
    return null;
  }
  
  return data;
}

export async function saveVideoProgress(progress: {
  user_id: string;
  video_id: string;
  time_watched: number;
  duration: number;
  completed: boolean;
}) {
  const { data: existing } = await supabase
    .from('video_progress')
    .select('*')
    .eq('user_id', progress.user_id)
    .eq('video_id', progress.video_id)
    .single();
  
  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('video_progress')
      .update({
        time_watched: progress.time_watched,
        duration: progress.duration,
        completed: progress.completed
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating video progress:', error);
      throw error;
    }
    
    return data;
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('video_progress')
      .insert(progress)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving video progress:', error);
      throw error;
    }
    
    return data;
  }
}