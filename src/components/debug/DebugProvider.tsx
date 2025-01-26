import React from 'react';
import { DebugContext, useDebugModeState } from './useDebugMode';
import type { DebugProviderProps } from './types';

export function DebugProvider({ children, defaultValue = false }: DebugProviderProps) {
  const debugState = useDebugModeState(defaultValue);

  // Log initial debug state
  React.useEffect(() => {
    if (debugState.isDebugMode) {
      console.log('Debug mode is enabled');
    }
  }, [debugState.isDebugMode]);

  // Effect for handling URL parameter changes
  React.useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const debugParam = params.get('debug');
      debugState.setFromQueryParam(debugParam);
    };

    // Initial check
    handleUrlChange();

    // Listen for URL changes
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [debugState]);

  const value = React.useMemo(() => ({
    isDebugMode: debugState.isDebugMode,
    toggleDebug: debugState.toggleDebug,
    setFromQueryParam: debugState.setFromQueryParam,
  }), [debugState]);

  return (
    <DebugContext.Provider value={value}>
      {children}
    </DebugContext.Provider>
  );
}