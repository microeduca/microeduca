// Vimeo OAuth and Upload Helper Functions

const VIMEO_TOKEN_KEY = 'vimeo_auth_token';
const VIMEO_REFRESH_KEY = 'vimeo_refresh_token';
const VIMEO_EXPIRY_KEY = 'vimeo_token_expiry';

export interface VimeoAuthToken {
  access_token: string;
  token_type: string;
  scope: string;
  app?: {
    name: string;
    uri: string;
  };
  user?: {
    uri: string;
    name: string;
  };
  refresh_token?: string;
  expires_in?: number;
}

export interface VimeoUploadResponse {
  uploadLink: string;
  videoId: string;
  embedUrl: string;
  videoData: any;
}

// Store Vimeo tokens securely in localStorage
export const storeVimeoToken = (tokenData: VimeoAuthToken) => {
  localStorage.setItem(VIMEO_TOKEN_KEY, tokenData.access_token);
  if (tokenData.refresh_token) {
    localStorage.setItem(VIMEO_REFRESH_KEY, tokenData.refresh_token);
  }
  if (tokenData.expires_in) {
    const expiryTime = Date.now() + (tokenData.expires_in * 1000);
    localStorage.setItem(VIMEO_EXPIRY_KEY, expiryTime.toString());
  }
};

// Get stored Vimeo access token
export const getVimeoToken = (): string | null => {
  const token = localStorage.getItem(VIMEO_TOKEN_KEY);
  const expiry = localStorage.getItem(VIMEO_EXPIRY_KEY);
  
  if (token && expiry) {
    const expiryTime = parseInt(expiry, 10);
    if (Date.now() < expiryTime) {
      return token;
    }
  }
  
  return token;
};

// Get stored refresh token
export const getVimeoRefreshToken = (): string | null => {
  return localStorage.getItem(VIMEO_REFRESH_KEY);
};

// Clear Vimeo tokens
export const clearVimeoTokens = () => {
  localStorage.removeItem(VIMEO_TOKEN_KEY);
  localStorage.removeItem(VIMEO_REFRESH_KEY);
  localStorage.removeItem(VIMEO_EXPIRY_KEY);
};

// Check if token needs refresh (with 5 minute buffer)
export const tokenNeedsRefresh = (): boolean => {
  const expiry = localStorage.getItem(VIMEO_EXPIRY_KEY);
  if (!expiry) return false;
  
  const expiryTime = parseInt(expiry, 10);
  const bufferTime = 5 * 60 * 1000; // 5 minutes
  return Date.now() > (expiryTime - bufferTime);
};

// Get Supabase URL (Edge Functions base)
export const getBackendUrl = (): string => {
  const api = (import.meta as any).env?.VITE_API_URL || 'https://microeduca.up.railway.app/api';
  return api;
};

// Generate state parameter for OAuth
export const generateState = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Upload file to Vimeo using TUS protocol
export const uploadToVimeo = async (
  file: File,
  uploadUrl: string,
  onProgress?: (percentage: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    let uploadedBytes = 0;

    const uploadChunk = async (start: number) => {
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      try {
        const response = await fetch(uploadUrl, {
          method: 'PATCH',
          headers: {
            'Tus-Resumable': '1.0.0',
            'Upload-Offset': start.toString(),
            'Content-Type': 'application/offset+octet-stream',
          },
          body: chunk,
        });

        if (!response.ok && response.status !== 204) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        uploadedBytes = end;
        const percentage = Math.round((uploadedBytes / file.size) * 100);
        
        if (onProgress) {
          onProgress(percentage);
        }

        if (uploadedBytes < file.size) {
          // Continue uploading next chunk
          await uploadChunk(uploadedBytes);
        } else {
          // Upload complete
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    };

    // Start upload from beginning
    uploadChunk(0);
  });
};