import { StrictMode } from 'react';
import { Video } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDebug, DebugConsole } from './components/DebugConsole';
import { AuthCallback } from './components/auth/AuthCallback';
import { PlaylistSelector } from './components/youtube/PlaylistSelector';

// Create VideoPlayer component since it's missing
const VideoPlayer = ({ videoId, onClose }: { videoId: string; onClose: () => void }) => {
  return (
    <div className="relative aspect-video">
      <iframe
        className="w-full h-full rounded-lg"
        src={`https://www.youtube.com/embed/${videoId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:bg-gray-100"
      >
        ✕
      </button>
    </div>
  );
};

function AppContent() {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const { addLog } = useDebug();

  const handleVideoSelect = (videoId: string) => {
    addLog(`Selected video: ${videoId}`, 'info', 'VideoSelection');
    setSelectedVideoId(videoId);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Video className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-800">
              Free Youtube Picture in Picture
            </h1>
          </div>

          <div className="grid gap-8 md:grid-cols-[2fr,1fr]">
            <div>
              {selectedVideoId ? (
                <VideoPlayer
                  videoId={selectedVideoId}
                  onClose={() => {
                    addLog('Closed video player', 'info', 'VideoPlayer');
                    setSelectedVideoId(null);
                  }}
                />
              ) : (
                <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Select a video from your playlists</p>
                </div>
              )}
            </div>
            <div className="order-first md:order-last">
              <PlaylistSelector onVideoSelect={handleVideoSelect} />
            </div>
          </div>
        </div>
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
