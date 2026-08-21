import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { normalizePlaylistUrl } from '../../utils/youtube';
import { usePlaylist } from './PlaylistContext';
import { SplitView } from './SplitView';

// Component for handling /playlist/:playlistId route
const PlaylistPage = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { setPlaylistUrl } = usePlaylist();
  const navigate = useNavigate();

  useEffect(() => {
    if (playlistId) {
      // Validate and load the playlist
      const normalizedUrl = normalizePlaylistUrl(playlistId);
      if (normalizedUrl) {
        setPlaylistUrl(normalizedUrl);
        toast.success('Playlist loaded from URL!', {
          duration: 3000,
          position: 'bottom-center',
        });
      } else {
        toast.error('Invalid playlist ID in URL', {
          duration: 5000,
          position: 'bottom-center',
        });
        // Redirect to home page on invalid playlist ID
        navigate('/', { replace: true });
      }
    }
  }, [playlistId, setPlaylistUrl, navigate]);

  // Render the same SplitView component
  return <SplitView />;
};

// Main router component for playlist-related routes
export const PlaylistRouter = () => {
  return (
    <Routes>
      {/* Route for /playlist/:playlistId */}
      <Route path="/playlist/:playlistId" element={<PlaylistPage />} />
      {/* Default route - renders SplitView with URL parameter detection */}
      <Route path="/*" element={<SplitView />} />
    </Routes>
  );
};

// Helper function to generate clean playlist URLs
export const generateCleanPlaylistUrl = (
  playlistId: string,
  baseUrl?: string
): string => {
  const base = baseUrl || window.location.origin;
  return `${base}/playlist/${playlistId}`;
};

// Helper function to navigate to a playlist programmatically
export const navigateToPlaylist = (
  playlistId: string,
  navigate: ReturnType<typeof useNavigate>
) => {
  navigate(`/playlist/${playlistId}`);
};
