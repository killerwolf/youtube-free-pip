import { Filter, MessageCircle, Search, Trash2, X } from 'lucide-react';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'error' | 'warn' | 'debug';
  source?: string;
}

interface DebugContextType {
  logs: LogEntry[];
  addLog: (message: string, type?: LogEntry['type'], source?: string) => void;
  clearLogs: () => void;
  isDebugMode: boolean;
  toggleDebugMode: () => void;
}

const DebugContext = createContext<DebugContextType>({
  logs: [],
  addLog: () => {},
  clearLogs: () => {},
  isDebugMode: false,
  toggleDebugMode: () => {},
});

const STORAGE_KEY = 'youtube-pip-debug-state';
const MAX_LOGS = 1000;

// Helper function to get initial debug state
const getInitialDebugState = (): boolean => {
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

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  } catch (error) {
    console.warn('Error loading debug state:', error);
    return false;
  }
};

function DebugProvider({ children }: { children: React.ReactNode }) {
  const [isDebugMode, setIsDebugMode] = useState(getInitialDebugState);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback(
    (message: string, type: LogEntry['type'] = 'info', source?: string) => {
      if (!isDebugMode) return;

      setLogs((prev) => {
        const newLogs = [
          {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            message,
            type,
            source,
          },
          ...prev,
        ].slice(0, MAX_LOGS);

        try {
          localStorage.setItem(
            'debug_logs',
            JSON.stringify(newLogs.slice(0, 100))
          );
        } catch (error) {
          console.warn('Failed to save debug logs:', error);
        }

        return newLogs;
      });
    },
    [isDebugMode]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.removeItem('debug_logs');
  }, []);

  const toggleDebugMode = useCallback(() => {
    setIsDebugMode((prev) => {
      const newValue = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(newValue));
      } catch (error) {
        console.warn('Failed to save debug state:', error);
      }
      return newValue;
    });
  }, []);

  // Load persisted logs on mount
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem('debug_logs');
      if (savedLogs) {
        setLogs(JSON.parse(savedLogs));
      }
    } catch (error) {
      console.warn('Failed to load debug logs:', error);
    }
  }, []);

  const value = {
    logs,
    addLog,
    clearLogs,
    isDebugMode,
    toggleDebugMode,
  };

  return (
    <DebugContext.Provider value={value}>{children}</DebugContext.Provider>
  );
}

function DebugConsole() {
  const { isDebugMode, logs: contextLogs, clearLogs } = useDebug();
  const [isConsoleVisible, setIsConsoleVisible] = useState(false);
  const [filter, setFilter] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<LogEntry['type']>>(
    new Set(['info', 'error', 'warn', 'debug'])
  );

  const filteredLogs = useMemo(() => {
    return contextLogs.filter(
      (log) =>
        activeTypes.has(log.type) &&
        (filter === '' ||
          log.message.toLowerCase().includes(filter.toLowerCase()) ||
          log.source?.toLowerCase().includes(filter.toLowerCase()))
    );
  }, [contextLogs, filter, activeTypes]);

  if (!isDebugMode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsConsoleVisible((prev) => !prev)}
        className="p-2 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
      >
        <MessageCircle size={24} />
      </button>

      {isConsoleVisible && (
        <div className="fixed bottom-16 right-4 w-96 h-96 bg-gray-800 rounded-lg shadow-xl flex flex-col">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-semibold">Debug Console</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={clearLogs}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Clear logs"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setIsConsoleVisible(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-2 border-b border-gray-700 flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-2 top-2.5 text-gray-500"
              />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-8 pr-4 py-2 bg-gray-700 text-white rounded-md text-sm"
              />
            </div>
            <button
              onClick={() =>
                setActiveTypes(new Set(['info', 'error', 'warn', 'debug']))
              }
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Reset filters"
            >
              <Filter size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-2 border-b border-gray-700 ${
                  log.type === 'error'
                    ? 'bg-red-900/20'
                    : log.type === 'warn'
                      ? 'bg-yellow-900/20'
                      : ''
                }`}
              >
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  {log.source && <span>{log.source}</span>}
                </div>
                <p className="text-sm text-white mt-1">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const useDebug = () => useContext(DebugContext);

export { DebugProvider, DebugConsole, useDebug };
