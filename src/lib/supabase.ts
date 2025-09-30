import { api } from '@/lib/api';
import { getCurrentUser } from './auth';

// Categories
export async function getCategories() {
	try {
		return await api.getCategories();
	} catch (error) {
		console.error('Error fetching categories:', error);
		return [];
	}
}

export async function addCategory(category: { name: string; description: string; thumbnail?: string }) {
	return await api.addCategory(category);
}

export async function updateCategory(id: string, updates: Partial<{ name: string; description: string; thumbnail?: string }>) {
	return await api.updateCategory(id, updates);
}

export async function deleteCategory(id: string) {
	await api.deleteCategory(id);
}

// Videos
export async function getVideos() {
	try {
		return await api.getVideos();
	} catch (error) {
		console.error('Error fetching videos:', error);
		return [];
	}
}

export async function getVideoById(id: string) {
	const all = await getVideos();
	return all.find((v: any) => v.id === id) || null;
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
	return await api.addVideo(video);
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
	return await api.updateVideo(id, updates);
}

export async function deleteVideo(id: string) {
	await api.deleteVideo(id);
}

// Users/Profiles
export async function getProfiles() {
	try {
		return await api.getProfiles();
	} catch (error) {
		console.error('Error fetching profiles:', error);
		return [];
	}
}

export async function getCurrentProfile() {
	const user = getCurrentUser();
	if (!user) return null;
	const profiles = await getProfiles();
	return profiles.find((p: any) => p.email === user.email) || null;
}

export async function addProfile(profile: {
	email: string;
	name: string;
	role: 'admin' | 'user';
	assigned_categories?: string[];
	is_active?: boolean;
}) {
	return await api.addProfile(profile);
}

export async function updateProfile(id: string, updates: Partial<{
	name: string;
	role: 'admin' | 'user';
	assigned_categories?: string[];
	is_active?: boolean;
}>) {
	return await api.updateProfile(id, updates);
}

export async function deleteProfile(id: string) {
	await api.deleteProfile(id);
}

// View History
export async function getViewHistory(userId?: string) {
	return await api.getViewHistory(userId);
}

export async function addToHistory(history: {
	user_id: string;
	video_id: string;
	watched_duration: number;
	completed: boolean;
}) {
	return await api.addToHistory(history);
}

// Comments
export async function getComments(videoId: string) {
	return await api.getComments(videoId);
}

export async function addComment(comment: {
	video_id: string;
	user_id: string;
	content: string;
}) {
	return await api.addComment(comment);
}

// Video Progress
export async function getVideoProgress(_userId: string, _videoId: string) {
	return null;
}

export async function saveVideoProgress(_progress: {
	user_id: string;
	video_id: string;
	time_watched: number;
	duration: number;
	completed: boolean;
}) {
	throw new Error('Not implemented');
}