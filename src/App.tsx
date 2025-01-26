import { Video } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { DebugConsole, useDebug } from './components/DebugConsole';
import { AuthCallback } from './components/auth/AuthCallback';
import { PlaylistSelector } from './components/youtube/PlaylistSelector';

function VideoPlayer({
  videoId,
  onClose,
}: {
  videoId: string;
  onClose: () => void;
}) {
  const debug = useDebug();
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isEnteringFullscreen = useRef(false);
  const attemptCount = useRef(0);
  const [fullscreenActivated, setFullscreenActivated] = useState(false);
  const maxAttempts = 5;

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  const enterFullscreen = useCallback(async () => {
    if (!videoContainerRef.current || isEnteringFullscreen.current || fullscreenActivated) return;

    try {
      isEnteringFullscreen.current = true;
      const isMobile = isMobileDevice();

      if (document.fullscreenEnabled) {
        if (isMobile && iframeRef.current) {
          try {
            await iframeRef.current.requestFullscreen();
            setFullscreenActivated(true);
            if (import.meta.env.DEV) {
              debug.addLog('Entered fullscreen mode (iframe)');
            }
            return;
          } catch (error) {
            if (import.meta.env.DEV) {
              debug.addLog('Failed to enter fullscreen on iframe, trying container');
            }
          }
        }

        await videoContainerRef.current.requestFullscreen();
        setFullscreenActivated(true);
        if (import.meta.env.DEV) {
          debug.addLog('Entered fullscreen mode (container)');
        }
      } else {
        if (import.meta.env.DEV) {
          debug.addLog('Fullscreen not supported', 'error');
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        debug.addLog(
          'Error entering fullscreen: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
          'error'
        );
      }

      if (attemptCount.current < maxAttempts) {
        const delay = Math.pow(2, attemptCount.current) * 500;
        attemptCount.current++;
        if (import.meta.env.DEV) {
          debug.addLog(`Retrying fullscreen in ${delay}ms (attempt ${attemptCount.current})`);
        }
        setTimeout(enterFullscreen, delay);
      }
    } finally {
      isEnteringFullscreen.current = false;
    }
  }, [debug, fullscreenActivated]);

  useEffect(() => {
    if (videoId && !fullscreenActivated) {
      attemptCount.current = 0;
      const initialDelay = isMobileDevice() ? 2000 : 1000;
      const timeoutId = setTimeout(enterFullscreen, initialDelay);
      return () => clearTimeout(timeoutId);
    }
  }, [videoId, enterFullscreen, fullscreenActivated]);

  useEffect(() => {
    setFullscreenActivated(false);
  }, [videoId]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <div 
          ref={videoContainerRef}
          className="aspect-video w-full relative bg-black rounded-lg overflow-hidden"
        >
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=0`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const handleVideoSelect = (videoId: string) => {
    setSelectedVideoId(videoId);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Video className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-800">
              Free Youtube Picture in Picture
            </h1>
          </div>

          <div className="grid gap-8 md:grid-cols-[2fr,1fr]">
            <div>
              {selectedVideoId ? (
                <VideoPlayer
                  videoId={selectedVideoId}
                  onClose={() => setSelectedVideoId(null)}
                />
              ) : (
                <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Select a video from your playlists</p>
                </div>
              )}
            </div>
            <div className="order-first md:order-last">
              <PlaylistSelector onVideoSelect={handleVideoSelect} />
            </div>
          </div>
        </div>
      </div>
      <DebugConsole />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<AppContent />} />
    </Routes>
  );
}

export default App;
