import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import type { AuthContextType, AuthState, TokenResponse } from './types';
import { AUTH_STORAGE_KEY, AuthError } from './types';
import { useDebug } from '../DebugConsole';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID) {
  throw new Error('VITE_GOOGLE_CLIENT_ID environment variable is not set');
}

if (!CLIENT_SECRET) {
  throw new Error('VITE_GOOGLE_CLIENT_SECRET environment variable is not set');
}

// Only need youtube.readonly for playlists, watch later, and history
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly'
].join(' ');

const AuthContext = createContext<AuthContextType | null>(null);

const loadStoredAuth = (): AuthState => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const auth: AuthState = JSON.parse(stored);
      // Check if token is expired
      if (auth.expiresAt && auth.expiresAt > Date.now()) {
        return auth;
      }
    }
  } catch (error) {
    console.error('Error loading auth state:', error);
  }
  return {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    isAuthenticated: false,
  };
};

const saveAuthState = (state: AuthState) => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving auth state:', error);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(loadStoredAuth);
  const { addLog } = useDebug();

  const updateAuthState = useCallback((tokenResponse: TokenResponse) => {
    addLog('Updating auth state with new token', 'info', 'Auth');
    const newState: AuthState = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || authState.refreshToken,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      isAuthenticated: true,
    };
    setAuthState(newState);
    saveAuthState(newState);
  }, [authState.refreshToken, addLog]);

  const login = useCallback(async () => {
    try {
      addLog('Initiating login process', 'info', 'Auth');
      
      // Générer un state plus robuste
      const state = crypto.randomUUID();
      
      // Stocker le state avec un timestamp
      const stateData = {
        value: state,
        timestamp: Date.now(),
      };
      sessionStorage.setItem('oauth_state', JSON.stringify(stateData));

      // Construire l'URL OAuth
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', CLIENT_ID);
      authUrl.searchParams.append('redirect_uri', `${window.location.origin}/auth/callback`);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', SCOPES);
      authUrl.searchParams.append('access_type', 'offline');
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('prompt', 'consent');

      addLog('Redirecting to Google OAuth', 'info', 'Auth');
      window.location.href = authUrl.toString();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Login error: ${errorMessage}`, 'error', 'Auth');
      throw new Error(AuthError.AUTH_FAILED);
    }
  }, [addLog]);

  const logout = useCallback(() => {
    addLog('User logged out', 'info', 'Auth');
    setAuthState({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      isAuthenticated: false,
    });
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, [addLog]);

  const refreshAccessToken = useCallback(async () => {
    if (!authState.refreshToken) {
      throw new Error(AuthError.TOKEN_EXPIRED);
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: authState.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Token refresh error:', errorData);
        throw new Error(
          `Token refresh failed: ${errorData.error || response.statusText}`
        );
      }

      const data: TokenResponse = await response.json();
      updateAuthState(data);
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      throw error;
    }
  }, [authState.refreshToken, logout, updateAuthState]);

  // Auto refresh token when it's close to expiring
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.expiresAt) return;

    const timeUntilExpiry = authState.expiresAt - Date.now();
    const refreshBuffer = 5 * 60 * 1000; // 5 minutes

    if (timeUntilExpiry < refreshBuffer) {
      refreshAccessToken().catch(console.error);
      return;
    }

    const timeoutId = setTimeout(() => {
      refreshAccessToken().catch(console.error);
    }, timeUntilExpiry - refreshBuffer);

    return () => clearTimeout(timeoutId);
  }, [authState.isAuthenticated, authState.expiresAt, refreshAccessToken]);

  const handleCallback = useCallback(async () => {
    try {
      addLog('Processing OAuth callback', 'info', 'Auth');
      
      // Get URL parameters
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      
      // Verify state to prevent CSRF
      const storedStateData = sessionStorage.getItem('oauth_state');
      sessionStorage.removeItem('oauth_state');
      
      if (!storedStateData || !state) {
        throw new Error(AuthError.INVALID_STATE);
      }

      const { value: storedState, timestamp } = JSON.parse(storedStateData);
      
      // Vérifier si le state est expiré (15 minutes max)
      if (Date.now() - timestamp > 15 * 60 * 1000) {
        throw new Error(AuthError.STATE_EXPIRED);
      }

      if (state !== storedState) {
        throw new Error(AuthError.INVALID_STATE);
      }
      
      if (!code) {
        throw new Error(AuthError.NO_CODE);
      }

      // Exchange code for tokens
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${window.location.origin}/auth/callback`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Token exchange failed: ${errorData.error || response.statusText}`);
      }

      const data: TokenResponse = await response.json();
      updateAuthState(data);
      addLog('Successfully processed OAuth callback', 'info', 'Auth');
    } catch (error) {
      addLog(`Callback error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'Auth');
      throw error;
    }
  }, [updateAuthState, addLog]);

  const value = {
    isAuthenticated: authState.isAuthenticated,
    accessToken: authState.accessToken,
    login,
    logout,
    refreshAccessToken,
    updateAuthState,
    handleCallback,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}