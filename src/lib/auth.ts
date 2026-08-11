import { User } from '@/types';
import { API_URL } from '@/lib/api';

const AUTH_KEY = 'microeduca_auth';

export const login = (email: string, password: string): User | null => {
	// Usa a mesma origem do restante da aplicação; fixar a URL aqui fazia
	// qualquer ambiente autenticar contra a produção.
	const API = API_URL;
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

export const isCliente = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'cliente';
};