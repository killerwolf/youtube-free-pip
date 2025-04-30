import { useEffect, useState } from 'react';
import { usePlaylist } from './PlaylistContext';
import { PlaylistInput } from './PlaylistInput';
import { fetchPlaylistData, type YouTubeVideo } from '../../utils/youtube';

interface PlaylistSelectorProps {
  onVideoSelect: (videoId: string) => void;
}

export function PlaylistSelector({ onVideoSelect }: PlaylistSelectorProps) {
  const { playlistUrl, clearPlaylist } = usePlaylist();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!playlistUrl) {
      setVideos([]);
      setError(null);
      return;
    }

    const loadPlaylist = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPlaylistData(playlistUrl);
        if (data.length === 0) {
          throw new Error('No videos found in this playlist. It might be private or empty.');
        }
        setVideos(data);
        setRetryCount(0); // Reset retry count on success
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error loading playlist:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlaylist();
  }, [playlistUrl, retryCount]); // Add retryCount to dependencies

  const handleRetry = () => {
    setRetryCount(count => count + 1);
  };

  if (!playlistUrl) {
    return <PlaylistInput />;
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Error Loading Playlist</h3>
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className="text-sm text-blue-600 hover:text-blue-800"
              disabled={loading}
            >
              {loading ? 'Retrying...' : 'Retry'}
            </button>
            <button
              onClick={clearPlaylist}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Try Another Playlist
            </button>
          </div>
        </div>
        <div className="text-red-600 mb-4">
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Loading Playlist</h3>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          <p className="text-gray-600">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Playlist Videos</h2>
        <button
          onClick={clearPlaylist}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Change Playlist
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {videos.map((video) => (
          <button
            key={video.id}
            onClick={() => onVideoSelect(video.id)}
            className="group aspect-video relative rounded-lg overflow-hidden hover:ring-2 hover:ring-red-500 focus:ring-2 focus:ring-red-500"
          >
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity" />
            <div className="absolute inset-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-sm font-medium line-clamp-2">
                {video.title}
              </p>
              <p className="text-xs mt-1 opacity-80">
                {video.channelTitle}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
