import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';
import { useDebugMode } from './debug';

interface DebugContextType {
  logs: string[];
  addLog: (message: string, type?: 'info' | 'error') => void;
  clearLogs: () => void;
}

const DebugContext = createContext<DebugContextType>({
  logs: [],
  addLog: () => {},
  clearLogs: () => {},
});

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<string[]>([]);
  const { isDebugMode } = useDebugMode();

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
    <DebugContext.Provider value={{ logs, addLog, clearLogs }}>
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
  const { isDebugMode } = useDebugMode();
  const { logs, clearLogs } = useDebug();
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
