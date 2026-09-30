'use client';

// Auth is delegated entirely to the API (src/server/data/auth.ts): passwords
// are hashed there with bcrypt and sessions are signed JWTs, never checked or
// stored in plaintext client-side.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, clearSession, getAuthToken, getStoredUser, storeSession } from './api';
import type { AuthUser, SignupData } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  /** False until localStorage has been read on the client (avoids SSR/hydration mismatch). */
  ready: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (data: SignupData) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [ready, setReady] = useState(false);

  // localStorage only exists on the client, so the stored session is read after
  // mount; reading it during render would mismatch the server-rendered HTML.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getStoredUser());
    setHasToken(!!getAuthToken());
    setReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user, token } = await authApi.login(email, password);
    storeSession(user, token);
    setUser(user);
    setHasToken(true);
    return user;
  }, []);

  const signup = useCallback(async (data: SignupData) => {
    const { user } = await authApi.signup(data);
    return user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setHasToken(false);
  }, []);

  const value = useMemo(
    () => ({ user, ready, isLoggedIn: hasToken, login, signup, logout }),
    [user, ready, hasToken, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
