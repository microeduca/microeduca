export const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.origin}/api`
    : 'https://microeduca.up.railway.app/api');

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  // Salvaguarda: garantir array quando a chamada espera lista
  if (options.method === 'GET' && Array.isArray(data) === false && /\/categories$|\/videos$|\/profiles$|\/comments$|\/view-history/.test(path)) {
    return [];
  }
  return data;
}

export const api = {
  // Categories
  getCategories: () => request('/categories', { method: 'GET' }),
  addCategory: (payload: any) => request('/categories', { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (id: string, payload: any) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCategory: (id: string) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Videos
  getVideos: () => request('/videos', { method: 'GET' }),
  addVideo: (payload: any) => request('/videos', { method: 'POST', body: JSON.stringify(payload) }),
  updateVideo: (id: string, payload: any) => request(`/videos/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteVideo: (id: string) => request(`/videos/${id}`, { method: 'DELETE' }),

  // Profiles
  getProfiles: () => request('/profiles', { method: 'GET' }),
  addProfile: (payload: any) => request('/profiles', { method: 'POST', body: JSON.stringify(payload) }),
  updateProfile: (id: string, payload: any) => request(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProfile: (id: string) => request(`/profiles/${id}`, { method: 'DELETE' }),

  // Vimeo
  vimeoAuth: (payload: any) => request('/vimeo-auth', { method: 'POST', body: JSON.stringify(payload) }),
  vimeoCreateUpload: (payload: any, fileSize: number) => request('/vimeo-upload', { method: 'POST', headers: { 'x-file-size': String(fileSize) }, body: JSON.stringify(payload) }),
  vimeoDelete: (videoId: string) => request(`/vimeo/${encodeURIComponent(videoId)}`, { method: 'DELETE' }),
  getVimeoTokenStatus: () => request('/vimeo-token/status', { method: 'GET' }),

  // View history
  getViewHistory: (userId?: string) => request(`/view-history${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, { method: 'GET' }),
  getRecentViews: (limit = 10) => request(`/view-history/recent?limit=${encodeURIComponent(String(limit))}`, { method: 'GET' }),
  addToHistory: (payload: any) => request('/view-history', { method: 'POST', body: JSON.stringify(payload) }),

  // Comments
  getComments: (videoId: string) => request(`/comments?videoId=${encodeURIComponent(videoId)}`, { method: 'GET' }),
  addComment: (payload: any) => request('/comments', { method: 'POST', body: JSON.stringify(payload) }),
  deleteComment: (id: string) => request(`/comments/${id}`, { method: 'DELETE' }),

  // Video progress
  getVideoProgress: (userId: string, videoId: string) => request(`/video-progress?userId=${encodeURIComponent(userId)}&videoId=${encodeURIComponent(videoId)}`, { method: 'GET' }),
  saveVideoProgress: (payload: any) => request('/video-progress', { method: 'POST', body: JSON.stringify(payload) }),
};
