import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { extractPlaylistId, normalizePlaylistUrl } from '../../utils/youtube';
import { usePlaylist } from './PlaylistContext';

// Interface for future loading state tracking
// interface URLLoadingState {
//   loading: boolean;
//   error: string | null;
//   source: 'url-param' | 'clipboard' | 'manual';
// }

interface URLPlaylistLoaderProps {
  onPlaylistDetected?: (url: string) => void;
}

export const URLPlaylistLoader = ({
  onPlaylistDetected,
}: URLPlaylistLoaderProps) => {
  const { playlistUrl } = usePlaylist();
  const location = useLocation();
  const lastProcessedUrl = useRef<string | null>(null);
  const hasShownFeedback = useRef(false);

  useEffect(() => {
    const checkUrlParameters = () => {
      // Avoid processing the same URL multiple times
      const currentLocationKey = `${location.pathname}${location.search}`;
      if (lastProcessedUrl.current === currentLocationKey) {
        return;
      }
      lastProcessedUrl.current = currentLocationKey;

      const searchParams = new URLSearchParams(location.search);
      const playlistIdParam = searchParams.get('list');
      const fullUrlParam = searchParams.get('url');

      // Only show feedback if there are URL parameters
      if (playlistIdParam || fullUrlParam) {
        try {
          let detectedPlaylistUrl: string | null = null;

          // Priority 1: Direct playlist ID parameter
          if (playlistIdParam) {
            const normalizedUrl = normalizePlaylistUrl(playlistIdParam);
            if (normalizedUrl) {
              detectedPlaylistUrl = normalizedUrl;
            } else {
              throw new Error('Invalid playlist ID format');
            }
          }
          // Priority 2: Full YouTube URL parameter
          else if (fullUrlParam) {
            const extractedId = extractPlaylistId(fullUrlParam);
            if (extractedId) {
              detectedPlaylistUrl = normalizePlaylistUrl(fullUrlParam);
            } else {
              throw new Error('No valid playlist found in URL');
            }
          }

          if (detectedPlaylistUrl && !hasShownFeedback.current) {
            hasShownFeedback.current = true;

            // Show loading feedback
            toast.loading('Loading playlist from URL...', {
              position: 'bottom-center',
              duration: 2000,
            });

            // Call callback if provided
            onPlaylistDetected?.(detectedPlaylistUrl);

            // Check if playlist loaded successfully after a short delay
            setTimeout(() => {
              if (playlistUrl === detectedPlaylistUrl) {
                toast.success('Playlist loaded successfully!', {
                  duration: 3000,
                  position: 'bottom-center',
                });
              }
            }, 1000);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Invalid playlist URL in parameters';

          toast.error(`URL Error: ${errorMessage}`, {
            duration: 5000,
            position: 'bottom-center',
          });

          console.error('URL playlist loading error:', error);
        }
      }
    };

    // Check URL parameters on mount or when location changes
    checkUrlParameters();
  }, [location.search, location.pathname, onPlaylistDetected, playlistUrl]);

  // This component renders nothing - it's a utility component
  return null;
};

// Helper function to generate shareable URLs (for future use)
export const generatePlaylistShareUrl = (
  playlistId: string,
  baseUrl?: string
): string => {
  const base = baseUrl || window.location.origin;
  return `${base}?list=${playlistId}`;
};

// Helper function to detect if current URL has playlist parameters
export const hasPlaylistUrlParams = (): boolean => {
  const searchParams = new URLSearchParams(window.location.search);
  return !!(searchParams.get('list') || searchParams.get('url'));
};
