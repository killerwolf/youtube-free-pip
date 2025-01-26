export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  updateAuthState: (tokenResponse: TokenResponse) => void;
}

export enum AuthError {
  AUTH_FAILED = 'Authentication failed',
  TOKEN_EXPIRED = 'Token expired',
  NETWORK_ERROR = 'Network error',
  USER_CANCELLED = 'User cancelled authentication',
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

// Storage keys
export const AUTH_STORAGE_KEY = 'youtube-pip-auth';