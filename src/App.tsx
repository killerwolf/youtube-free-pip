import { Toaster } from 'react-hot-toast';
import { PlaylistProvider } from './components/youtube/PlaylistContext';
import { PlaylistDetector } from './components/youtube/PlaylistDetector';
import { SplitView } from './components/youtube/SplitView';

function App() {
  return (
    <PlaylistProvider>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Playlist auto-detection */}
        <PlaylistDetector />

        {/* Main content */}
        <SplitView />

        {/* Toast notifications */}
        <Toaster />
      </div>
    </PlaylistProvider>
  );
}

export default App;
