import { Toaster } from 'react-hot-toast';
import { PlaylistProvider } from './components/youtube/PlaylistContext';
import { PlaylistDetector } from './components/youtube/PlaylistDetector';
import { PlaylistRouter } from './components/youtube/PlaylistRouter';
import { URLPlaylistLoader } from './components/youtube/URLPlaylistLoader';

function App() {
  return (
    <PlaylistProvider>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* URL-based playlist loading */}
        <URLPlaylistLoader />

        {/* Clipboard/selection playlist auto-detection */}
        <PlaylistDetector />

        {/* Main content with routing */}
        <PlaylistRouter />

        {/* Toast notifications */}
        <Toaster />
      </div>
    </PlaylistProvider>
  );
}

export default App;
