import { User } from '@/types';

const AUTH_KEY = 'microeduca_auth';

export const login = (email: string, password: string): User | null => {
	// Chamada para API do Railway
	const API = (import.meta as any).env?.VITE_API_URL || 'https://microeduca.up.railway.app/api';
	const xhr = new XMLHttpRequest();
	xhr.open('POST', `${API}/login`, false);
	xhr.setRequestHeader('Content-Type', 'application/json');
	try {
		xhr.send(JSON.stringify({ email, password }));
		if (xhr.status >= 200 && xhr.status < 300) {
			const user = JSON.parse(xhr.responseText) as User;
			localStorage.setItem(AUTH_KEY, JSON.stringify(user));
			return user;
		}
	} catch {}
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