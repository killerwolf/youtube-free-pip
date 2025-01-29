import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useDebug } from '../DebugConsole';

export function AuthCallback() {
  const navigate = useNavigate();
  const { handleCallback } = useAuth();
  const { addLog } = useDebug();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    handleCallback()
      .then(() => {
        addLog('Auth callback successful', 'info', 'Auth');
        navigate('/', { replace: true });
      })
      .catch((error) => {
        addLog(`Auth callback failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'Auth');
        navigate('/', { replace: true });
      });
  }, [handleCallback, navigate, addLog]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
    </div>
  );
}