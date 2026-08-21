import { Toaster } from 'react-hot-toast';
import { PlaylistProvider } from './components/youtube/PlaylistContext';
import { PlaylistDetector } from './components/youtube/PlaylistDetector';
import { PlaylistRouter } from './components/youtube/PlaylistRouter';

function App() {
  return (
    <PlaylistProvider>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Selection-based playlist auto-detection. URL params (?list=)
            and the /playlist/:id route are handled directly by
            PlaylistContext/PlaylistRouter. */}
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
