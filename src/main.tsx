import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DebugProvider as TooltipDebugProvider } from './components/debug';
import { DebugProvider as ConsoleDebugProvider } from './components/DebugConsole';
import './index.css';

// Get initial debug state from URL
const params = new URLSearchParams(window.location.search);
const initialDebug = params.get('debug') === '1';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipDebugProvider defaultValue={initialDebug}>
      <ConsoleDebugProvider>
        <App />
      </ConsoleDebugProvider>
    </TooltipDebugProvider>
  </StrictMode>
);
