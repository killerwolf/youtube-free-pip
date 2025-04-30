import { PlaylistProvider } from './components/youtube/PlaylistContext';
import { PlaylistDetector } from './components/youtube/PlaylistDetector';
import { SplitView } from './components/youtube/SplitView';
import { Toaster } from 'react-hot-toast';

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
