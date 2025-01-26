import { Video } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { DebugConsole, useDebug } from './components/DebugConsole';

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const debug = useDebug();
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const isEnteringFullscreen = useRef(false);

  const enterFullscreen = useCallback(async () => {
    if (!videoContainerRef.current || isEnteringFullscreen.current) return;

    try {
      isEnteringFullscreen.current = true;
      if (document.fullscreenEnabled) {
        await videoContainerRef.current.requestFullscreen();
        if (import.meta.env.DEV) {
          debug.addLog('Entered fullscreen mode');
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
    } finally {
      isEnteringFullscreen.current = false;
    }
  }, [debug]);

  useEffect(() => {
    if (videoId) {
      // Small delay to ensure iframe is loaded
      const timeoutId = setTimeout(enterFullscreen, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [videoId, enterFullscreen]);

  const handleClipboardText = (text: string) => {
    if (import.meta.env.DEV) {
      debug.addLog('Processing clipboard text: ' + text);
    }
    
    if (text) {
      const extractedId = extractVideoId(text);
      if (import.meta.env.DEV) {
        debug.addLog('Extracted ID: ' + (extractedId || 'none'));
      }

      if (extractedId) {
        setVideoId(extractedId);
        setVideoUrl('');
        if (import.meta.env.DEV) {
          debug.addLog('Video ID set: ' + extractedId);
        }
      } else {
        setError('No valid YouTube URL found');
      }
    }
  };

  const extractVideoId = (url: string): string | false => {
    try {
      const regExp =
        /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      const match = url.match(regExp);
      return match && match[7].length === 11 ? match[7] : false;
    } catch (error) {
      if (import.meta.env.DEV) {
        debug.addLog(
          'Error extracting video ID: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
          'error'
        );
      }
      return false;
    }
  };

  const handleClear = () => {
    setVideoUrl('');
    setVideoId('');
    setError(null);
    if (import.meta.env.DEV) {
      debug.addLog('Form cleared');
    }

    // Exit fullscreen when clearing
    if (document.fullscreenElement) {
      document.exitFullscreen();
      if (import.meta.env.DEV) {
        debug.addLog('Exited fullscreen mode');
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    try {
      const text = e.clipboardData.getData('text');
      if (import.meta.env.DEV) {
        debug.addLog('Text pasted: ' + text);
      }
      setError(null);
      handleClipboardText(text);
    } catch (error) {
      if (import.meta.env.DEV) {
        debug.addLog(
          'Paste event error: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
          'error'
        );
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setVideoUrl(text);
    setError(null);
    
    if (text) {
      handleClipboardText(text);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Video className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-800">
              Free Youtube Picture in Picture
            </h1>
          </div>

          <div className="mb-8">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={videoUrl}
                onChange={handleChange}
                onPaste={handlePaste}
                placeholder="Paste YouTube URL here (Ctrl+V/Cmd+V)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                aria-label="YouTube URL"
              />
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Clear
              </button>
            </div>

            {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
          </div>

          {videoId && (
            <div className="space-y-4">
              <div 
                ref={videoContainerRef}
                className="aspect-square w-full relative bg-black rounded-lg overflow-hidden"
              >
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=0`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <DebugConsole />
    </div>
  );
}

export default App;
