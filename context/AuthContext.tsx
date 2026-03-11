import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  TokenResponse,
  apiLogin,
  apiRegister,
  apiLogout,
  apiGetProfile,
  apiRefreshToken,
  apiUpdateProfile,
  setAuthSession,
  clearAuthSession,
} from '@/lib/authApi';

const TOKEN_KEY = 'auth_tokens';

interface AuthState {
  user: User | null;
  tokens: TokenResponse | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isLoading: true,
  });

  // Helper: wire tokens into the auto-refresh interceptor
  function connectSession(tokens: TokenResponse, user: User) {
    setAuthSession(
      tokens,
      (newTokens) => {
        AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(newTokens));
        setState((prev) => ({ ...prev, tokens: newTokens }));
      },
      () => {
        AsyncStorage.removeItem(TOKEN_KEY);
        setState({ user: null, tokens: null, isLoading: false });
      }
    );
    setState({ user, tokens, isLoading: false });
  }

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const raw = await AsyncStorage.getItem(TOKEN_KEY);
      if (!raw) return;
      const tokens: TokenResponse = JSON.parse(raw);
      // Try to get profile with stored token
      try {
        const user = await apiGetProfile(tokens.accessToken);
        connectSession(tokens, user);
        return;
      } catch {
        // Access token expired – try refresh
        try {
          const newTokens = await apiRefreshToken(tokens.refreshToken);
          const user = await apiGetProfile(newTokens.accessToken);
          await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(newTokens));
          connectSession(newTokens, user);
          return;
        } catch {
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
      }
    } catch {
      // ignore
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  const login = useCallback(async (username: string, password: string) => {
    const { user, tokens } = await apiLogin({ username, password });
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    connectSession(tokens, user);
  }, []);

  const register = useCallback(
    async (payload: {
      email: string;
      username: string;
      password: string;
      displayName?: string;
    }) => {
      const { user, tokens } = await apiRegister(payload);
      await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
      connectSession(tokens, user);
    },
    []
  );

  const logout = useCallback(async () => {
    if (state.tokens?.accessToken) {
      try {
        await apiLogout(state.tokens.accessToken);
      } catch {
        // ignore – clear locally anyway
      }
    }
    clearAuthSession();
    await AsyncStorage.removeItem(TOKEN_KEY);
    setState({ user: null, tokens: null, isLoading: false });
  }, [state.tokens]);

  const updateUser = useCallback((partial: Partial<User>) => {
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...partial } : prev.user,
    }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
