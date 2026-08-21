import { useEffect, useRef } from 'react';
import { type Toast, toast } from 'react-hot-toast';
import { findPlaylistInText, normalizePlaylistUrl } from '../../utils/youtube';
import { usePlaylist } from './PlaylistContext';

export const PlaylistDetector = () => {
  const { setPlaylistUrl } = usePlaylist();
  const lastDetectedUrl = useRef<string | null>(null);

  // Monitor clipboard
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        const playlistId = findPlaylistInText(text);

        if (playlistId) {
          const normalizedUrl = normalizePlaylistUrl(text);
          if (normalizedUrl && normalizedUrl !== lastDetectedUrl.current) {
            lastDetectedUrl.current = normalizedUrl;

            // Show toast with action
            toast.success(
              (t: Toast) => (
                <div className="flex items-center gap-4">
                  <span>Playlist detected! Load it?</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-2 py-1 bg-green-500 text-white rounded"
                      onClick={() => {
                        setPlaylistUrl(normalizedUrl);
                        toast.dismiss(t.id);
                      }}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 bg-gray-500 text-white rounded"
                      onClick={() => toast.dismiss(t.id)}
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              ),
              {
                duration: 5000,
                position: 'bottom-center',
              }
            );
          }
        }
      } catch (error) {
        console.warn('Could not access clipboard:', error);
      }
    };

    // Check clipboard when window gains focus
    const handleFocus = () => {
      checkClipboard();
    };

    // Check clipboard periodically when tab is active
    const interval = setInterval(() => {
      if (document.hasFocus()) {
        checkClipboard();
      }
    }, 2000);

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [setPlaylistUrl]);

  // Monitor text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()?.toString();
      if (selection) {
        const playlistId = findPlaylistInText(selection);
        if (playlistId) {
          const normalizedUrl = normalizePlaylistUrl(selection);
          if (normalizedUrl && normalizedUrl !== lastDetectedUrl.current) {
            lastDetectedUrl.current = normalizedUrl;

            // Show toast with action
            toast.success(
              (t: Toast) => (
                <div className="flex items-center gap-4">
                  <span>Playlist detected in selection! Load it?</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-2 py-1 bg-green-500 text-white rounded"
                      onClick={() => {
                        setPlaylistUrl(normalizedUrl);
                        toast.dismiss(t.id);
                      }}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 bg-gray-500 text-white rounded"
                      onClick={() => toast.dismiss(t.id)}
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              ),
              {
                duration: 5000,
                position: 'bottom-center',
              }
            );
          }
        }
      }
    };

    document.addEventListener('selectionchange', handleSelection);

    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [setPlaylistUrl]);

  return null; // This is a utility component with no UI
};
