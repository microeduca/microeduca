import { User } from '@/types';
import { api, API_URL } from '@/lib/api';

const AUTH_KEY = 'microeduca_auth';

type StoredSession = User & { token: string };

export const login = async (email: string, password: string): Promise<User | null> => {
	try {
		const res = await fetch(`${API_URL}/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
		});
		if (!res.ok) return null;
		const session = (await res.json()) as StoredSession;
		if (!session?.token) return null;
		localStorage.setItem(AUTH_KEY, JSON.stringify(session));
		return session;
	} catch {
		return null;
	}
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

export const getToken = (): string | null => {
	try {
		const raw = localStorage.getItem(AUTH_KEY);
		return raw ? JSON.parse(raw)?.token || null : null;
	} catch {
		return null;
	}
};

/**
 * Revalida a sessão contra o servidor e atualiza os dados locais.
 * O que está no localStorage é conveniência de renderização, não autoridade:
 * quem decide o que o usuário vê é o backend.
 */
export const refreshCurrentUser = async (): Promise<User | null> => {
	const stored = getCurrentUser();
	if (!stored) return null;
	try {
		const fresh = await api.getMe();
		const merged = { ...fresh, token: getToken() };
		localStorage.setItem(AUTH_KEY, JSON.stringify(merged));
		return merged;
	} catch {
		return null;
	}
};

export const isAdmin = (): boolean => {
	const user = getCurrentUser();
	return user?.role === 'admin';
};

export const isCliente = (): boolean => {
	const user = getCurrentUser();
	return user?.role === 'cliente';
};
