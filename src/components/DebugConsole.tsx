import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

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

// No-op provider for production
const ProductionDebugProvider = ({ children }: { children: React.ReactNode }) => (
  <DebugContext.Provider 
    value={{ 
      logs: [], 
      addLog: () => {}, 
      clearLogs: () => {} 
    }}
  >
    {children}
  </DebugContext.Provider>
);

export function DebugProvider({ children }: { children: React.ReactNode }) {
  // If not in development, use the no-op provider
  if (!import.meta.env.DEV) {
    return <ProductionDebugProvider>{children}</ProductionDebugProvider>;
  }

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback(
    (message: string, type: 'info' | 'error' = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      const formattedMessage = `[${timestamp}] ${type === 'error' ? '🔴' : '🔵'} ${message}`;
      setLogs((prev) => [...prev, formattedMessage]);
    },
    []
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
  return context;
}

export function DebugConsole() {
  // Only render in development mode
  if (!import.meta.env.DEV) return null;

  const { logs, clearLogs } = useDebug();
  const [isExpanded, setIsExpanded] = useState(false);

  if (logs.length === 0) return null;

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
