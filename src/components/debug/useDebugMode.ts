import { createContext, useContext, useEffect, useState } from 'react';
import type { DebugModeContext } from './types';

const STORAGE_KEY = 'youtube-pip-debug-state';

// Create context with a default value
const DebugContext = createContext<DebugModeContext>({
  isDebugMode: false,
  toggleDebug: () => {},
  setFromQueryParam: () => {},
});

// Hook to access debug mode context
export const useDebugMode = () => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebugMode must be used within a DebugProvider');
  }
  return context;
};

// Load debug state from localStorage
const loadDebugState = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  } catch (error) {
    console.warn('Error loading debug state:', error);
    return false;
  }
};

// Save debug state to localStorage
const saveDebugState = (isDebugMode: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY, String(isDebugMode));
  } catch (error) {
    console.warn('Error saving debug state:', error);
  }
};

// Parse URL query parameters
const getQueryParam = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('debug');
};

// Custom hook for managing debug state
export const useDebugModeState = (defaultValue = false) => {
  // Initialize from localStorage, then check URL params
  const [isDebugMode, setIsDebugMode] = useState(() => {
    // First check URL parameters
    const debugParam = getQueryParam();
    if (debugParam !== null) {
      const debugValue = debugParam === '1';
      saveDebugState(debugValue);
      return debugValue;
    }
    // Then fall back to localStorage
    return loadDebugState() || defaultValue;
  });

  // Effect to handle URL parameter changes
  useEffect(() => {
    const handleUrlChange = () => {
      const debugParam = getQueryParam();
      if (debugParam !== null) {
        const newValue = debugParam === '1';
        setIsDebugMode(newValue);
        saveDebugState(newValue);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const toggleDebug = (force?: boolean) => {
    setIsDebugMode((prev) => {
      const newValue = force !== undefined ? force : !prev;
      saveDebugState(newValue);
      return newValue;
    });
  };

  const setFromQueryParam = (value: string | null) => {
    if (value !== null) {
      const newValue = value === '1';
      setIsDebugMode(newValue);
      saveDebugState(newValue);
    }
  };

  return {
    isDebugMode,
    toggleDebug,
    setFromQueryParam,
  };
};

export { DebugContext };