import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { resolveEntry } from '../../utils/playlistEntry';
import { SplitView } from './SplitView';

/**
 * /playlist/<id> is the old link shape. ?list=<id> is canonical — it is what
 * the README documents and what the share button emits — so this redirects
 * rather than loading the playlist a second way. Links already sent keep
 * working, and anything else on the query string rides along.
 */
const PlaylistPathRedirect = () => {
  const location = useLocation();
  const entry = resolveEntry(location);
  const invalid = entry === null;

  useEffect(() => {
    if (invalid) {
      toast.error('Invalid playlist ID in URL', {
        duration: 5000,
        position: 'bottom-center',
      });
    }
  }, [invalid]);

  if (invalid) return <Navigate to="/" replace />;

  const params = new URLSearchParams(location.search);
  params.set('list', entry.playlistId);
  return <Navigate to={`/?${params.toString()}`} replace />;
};

export const PlaylistRouter = () => {
  return (
    <Routes>
      <Route path="/playlist/:playlistId" element={<PlaylistPathRedirect />} />
      {/* SplitView reads the link through PlaylistContext. */}
      <Route path="/*" element={<SplitView />} />
    </Routes>
  );
};
