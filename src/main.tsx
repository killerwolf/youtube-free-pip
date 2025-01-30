import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './components/auth/AuthContext';
import { YouTubeProvider } from './components/youtube/YouTubeContext';
import { DebugProvider } from './components/DebugConsole';
import './index.css';

// Validate environment variables
if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
  throw new Error('VITE_GOOGLE_CLIENT_ID is not set in environment variables');
}

if (!import.meta.env.VITE_GOOGLE_API_KEY) {
  throw new Error('VITE_GOOGLE_API_KEY is not set in environment variables');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DebugProvider>
        <AuthProvider>
          <YouTubeProvider>
            <App />
          </YouTubeProvider>
        </AuthProvider>
      </DebugProvider>
    </BrowserRouter>
  </StrictMode>
);
