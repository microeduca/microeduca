import { User } from '@/types';
import { mockUsers } from './mockData';

const AUTH_KEY = 'edustream_auth';

export const login = (email: string, password: string): User | null => {
  // Mock authentication - in production, this would be a real API call
  const user = mockUsers.find(u => u.email === email);
  
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  }
  
  return null;
};

export const logout = () => {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = '/';
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};