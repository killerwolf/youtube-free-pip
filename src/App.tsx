import { LogOut, Video } from 'lucide-react';
import { StrictMode } from 'react';
import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { DebugConsole, useDebug } from './components/DebugConsole';
import { AuthCallback } from './components/auth/AuthCallback';
import { useAuth } from './components/auth/AuthContext';
import { PlaylistSelector } from './components/youtube/PlaylistSelector';
import { VideoPlayer } from './components/youtube/VideoPlayer';
import { extractYouTubeVideoId } from './utils/youtube';

function AppContent() {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const { addLog } = useDebug();
  const { isAuthenticated, logout } = useAuth();

  const handleVideoSelect = (videoId: string) => {
    addLog(`Selected video: ${videoId}`, 'info', 'VideoSelection');
    setSelectedVideoId(videoId);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setVideoUrl(url);

    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      handleVideoSelect(videoId);
      // Optional: clear input after successful load
      // setVideoUrl('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 z-10 bg-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <Video className="w-5 h-5 text-red-600" />
            {isAuthenticated && (
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded-full hover:bg-gray-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            )}
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={videoUrl}
              onChange={handleUrlChange}
              placeholder="Paste a YouTube video URL here..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="aspect-video bg-white rounded-lg shadow-sm">
            {selectedVideoId ? (
              <VideoPlayer
                videoId={selectedVideoId}
                onClose={() => {
                  addLog('Closed video player', 'info', 'VideoPlayer');
                  setSelectedVideoId(null);
                  setVideoUrl('');
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">Video player will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <PlaylistSelector onVideoSelect={handleVideoSelect} />
      </div>
      <DebugConsole />
    </div>
  );
}

function App() {
  return (
    <StrictMode>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={<AppContent />} />
      </Routes>
    </StrictMode>
  );
}

export default App;
