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
  handleCallback: () => Promise<void>;
}

export enum AuthError {
  AUTH_FAILED = 'Authentication failed',
  TOKEN_EXPIRED = 'Token has expired',
  INVALID_STATE = 'Invalid state parameter',
  NO_CODE = 'No authorization code received',
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
export const AUTH_STORAGE_KEY = 'auth_state';