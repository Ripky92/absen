import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axiosClient, { TOKEN_KEY, UNAUTHORIZED_EVENT } from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Cek sesi ke /me saat aplikasi dibuka
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (user) return;

    let active = true;
    axiosClient
      .get('/me')
      .then((res) => active && setUser(res.data.data))
      .catch(() => active && clearAuth())
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [token, user, clearAuth]);

  // Dipicu interceptor saat menerima 401
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, clearAuth);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, clearAuth);
  }, [clearAuth]);

  const login = useCallback(async (email, password) => {
    const res = await axiosClient.post('/login', { email, password });
    const { token: newToken, user: newUser } = res.data.data;
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axiosClient.post('/logout');
    } catch {
      // token mungkin sudah kedaluwarsa; tetap bersihkan sesi lokal
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const updateUser = useCallback((updatedData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : updatedData));
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      updateUser,
      isAdmin: user?.role === 'admin',
    }),
    [user, token, loading, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
