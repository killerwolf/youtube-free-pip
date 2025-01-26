import type React from 'react';
import { createContext, useCallback, useContext, useState, useEffect } from 'react';

interface DebugContextType {
  logs: string[];
  addLog: (message: string, type?: 'info' | 'error') => void;
  clearLogs: () => void;
  isDebugMode: boolean;
}

const DebugContext = createContext<DebugContextType>({
  logs: [],
  addLog: () => {},
  clearLogs: () => {},
  isDebugMode: false,
});

const STORAGE_KEY = 'youtube-pip-debug-state';

// Load debug state from localStorage or URL parameter
const getInitialDebugState = (): boolean => {
  // Check URL parameter first
  const params = new URLSearchParams(window.location.search);
  const debugParam = params.get('debug');
  if (debugParam !== null) {
    const debugValue = debugParam === '1';
    try {
      localStorage.setItem(STORAGE_KEY, String(debugValue));
    } catch (error) {
      console.warn('Error saving debug state:', error);
    }
    return debugValue;
  }

  // Then check localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  } catch (error) {
    console.warn('Error loading debug state:', error);
    return false;
  }
};

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isDebugMode, setIsDebugMode] = useState(getInitialDebugState);

  // Listen for URL parameter changes
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const debugParam = params.get('debug');
      if (debugParam !== null) {
        const debugValue = debugParam === '1';
        setIsDebugMode(debugValue);
        try {
          localStorage.setItem(STORAGE_KEY, String(debugValue));
        } catch (error) {
          console.warn('Error saving debug state:', error);
        }
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const addLog = useCallback(
    (message: string, type: 'info' | 'error' = 'info') => {
      if (!isDebugMode) return;
      const timestamp = new Date().toLocaleTimeString();
      const formattedMessage = `[${timestamp}] ${type === 'error' ? '🔴' : '🔵'} ${message}`;
      setLogs((prev) => [...prev, formattedMessage]);
      // Also log to console in development
      if (import.meta.env.DEV) {
        console.log(formattedMessage);
      }
    },
    [isDebugMode]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <DebugContext.Provider value={{ logs, addLog, clearLogs, isDebugMode }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}

export function DebugConsole() {
  const { logs, clearLogs, isDebugMode } = useDebug();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isDebugMode || logs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md bg-gray-900 text-white rounded-lg shadow-lg">
      <div
        className="flex items-center justify-between p-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-sm font-mono">Debug Console ({logs.length})</span>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearLogs();
            }}
            className="px-2 py-1 text-xs bg-red-600 rounded hover:bg-red-700"
          >
            Clear
          </button>
          <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>
      {isExpanded && (
        <div className="max-h-48 overflow-y-auto p-2 border-t border-gray-700">
          {logs.map((log, index) => (
            <div
              key={index}
              className="text-xs font-mono whitespace-pre-wrap mb-1"
            >
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
