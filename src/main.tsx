import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { DebugProvider } from './components/DebugConsole';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DebugProvider>
      <App />
    </DebugProvider>
  </StrictMode>
);
