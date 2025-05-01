import { useState } from 'react';
import { usePlaylist } from './PlaylistContext';
import { formatDuration } from '../../utils/formatDuration';

// Calculate progress percentage based on current time and duration
const calculateProgress = (currentTime: number, duration: number): number => {
  if (duration <= 0) return 0;
  return Math.min(100, (currentTime / duration) * 100);
};

// Progress bar component
const VideoProgress = ({ videoId }: { videoId: string }) => {
  const progress = (() => {
    try {
      const saved = localStorage.getItem('youtube-pip-video-progress');
      if (saved) {
        const progressData = JSON.parse(saved);
        const currentTime = progressData[videoId] || 0;
        // Get video duration from the playlist context
        const video = usePlaylist().videos.find((v) => v.id === videoId);
        if (video) {
          return calculateProgress(currentTime, video.lengthSeconds);
        }
      }
    } catch (error) {
      console.warn('Failed to load video progress:', error);
    }
    return 0;
  })();

  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
      <div className="h-full bg-red-600" style={{ width: `${progress}%` }} />
    </div>
  );
};

export const PlaylistSelector = () => {
  const { videos, currentVideo, watchedVideos, setCurrentVideo } =
    usePlaylist();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return <div className="p-4">Loading playlist...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-2 p-4 overflow-y-auto">
      {videos.map((video) => (
        <div
          key={video.id}
          className={`flex gap-4 p-2 rounded-lg cursor-pointer relative ${
            currentVideo?.id === video.id
              ? 'bg-blue-50 ring-2 ring-blue-500'
              : 'hover:bg-gray-50'
          }`}
          onClick={() => setCurrentVideo(video)}
        >
          <div className="relative w-40 h-24 flex-shrink-0">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover rounded"
            />
            <VideoProgress videoId={video.id} />
            <div className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1 rounded">
              {formatDuration(video.lengthSeconds)}
            </div>
            {currentVideo?.id === video.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-sm font-medium">
                NOW PLAYING
              </div>
            )}
          </div>
          <div className="flex flex-col flex-grow">
            <h3
              className={`font-medium line-clamp-2 ${
                currentVideo?.id === video.id ? 'text-blue-600' : ''
              }`}
            >
              {video.title}
            </h3>
            <p className="text-sm text-gray-600">{video.channelTitle}</p>
            {watchedVideos.has(video.id) && (
              <span className="text-xs text-gray-500 mt-1">Watched</span>
            )}
          </div>
          {currentVideo?.id === video.id && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
          )}
        </div>
      ))}
    </div>
  );
};
