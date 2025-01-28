import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { TokenResponse } from './types';
import { AuthError } from './types';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID) {
  throw new Error('VITE_GOOGLE_CLIENT_ID environment variable is not set');
}

if (!CLIENT_SECRET) {
  throw new Error('VITE_GOOGLE_CLIENT_SECRET environment variable is not set');
}

export function AuthCallback() {
  const navigate = useNavigate();
  const { updateAuthState } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        // Only set error if there's an actual error parameter
        if (error) {
          throw new Error(`Google OAuth error: ${error}`);
        }

        // Verify state parameter to prevent CSRF
        const storedState = sessionStorage.getItem('oauth_state');
        sessionStorage.removeItem('oauth_state');

        if (!state || state !== storedState) {
          throw new Error(AuthError.AUTH_FAILED);
        }

        if (!code) {
          throw new Error(AuthError.AUTH_FAILED);
        }

        // Exchange code for tokens directly with Google
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
            redirect_uri: `${window.location.origin}/auth/callback`,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({}));
          throw new Error(errorData.error_description || AuthError.AUTH_FAILED);
        }

        const tokens: TokenResponse = await tokenResponse.json();
        updateAuthState(tokens);

        // On success, redirect immediately
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        const errorMessage = error instanceof Error ? error.message : AuthError.AUTH_FAILED;
        setError(errorMessage);
        
        // Only show error state for actual errors
        setTimeout(() => {
          navigate('/', { 
            replace: true,
            state: { error: errorMessage }
          });
        }, 5000);
      }
    };

    handleCallback();
  }, [navigate, updateAuthState]);

  // Only show error screen for actual errors
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-600 mb-4">
            <svg
              className="w-16 h-16 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-center mb-2">Authentication Error</h2>
            <p className="text-center text-gray-600">{error}</p>
          </div>
          <p className="text-center text-sm text-gray-500">
            Redirecting to home page in 5 seconds...
          </p>
        </div>
      </div>
    );
  }

  // Show a more positive loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500" />
            <h2 className="text-xl font-semibold">Completing Sign In...</h2>
          </div>
          <p className="text-gray-600 text-center">
            Almost there! Setting up your account...
          </p>
        </div>
      </div>
    </div>
  );
}