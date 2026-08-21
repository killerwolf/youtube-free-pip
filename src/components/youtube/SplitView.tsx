import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '../../utils/youtube';
import { usePlaylist } from './PlaylistContext';
import { PlaylistHeader } from './PlaylistHeader';
import { PlaylistInput } from './PlaylistInput';
import { VideoPlayer } from './VideoPlayer';

export const SplitView = () => {
  const { currentVideo, videos, watchedVideos, isLoading, error } =
    usePlaylist();
  const [isPlayerVisible, setIsPlayerVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-hide player on scroll down, show on scroll up.
  // The playlist section scrolls within its own overflow-y-auto container,
  // not the window, so the listener has to be attached there.
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      if (currentScrollY > lastScrollY.current) {
        setIsPlayerVisible(false);
      } else {
        setIsPlayerVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    scrollContainer.addEventListener('scroll', handleScroll, {
      passive: true,
    });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Separate videos into unwatched and watched
  const { unwatchedVideos, watchedVideosList } = videos.reduce(
    (acc, video) => {
      if (watchedVideos.has(video.id)) {
        acc.watchedVideosList.push(video);
      } else {
        acc.unwatchedVideos.push(video);
      }
      return acc;
    },
    { unwatchedVideos: [], watchedVideosList: [] } as {
      unwatchedVideos: typeof videos;
      watchedVideosList: typeof videos;
    }
  );

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Video Player Section */}
      <div
        className={`transition-all duration-300 ${
          isPlayerVisible && currentVideo ? 'h-2/5' : 'h-0'
        }`}
      >
        {currentVideo && (
          <div className="w-full h-full">
            <VideoPlayer />
          </div>
        )}
      </div>

      {/* Playlist Section */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto transition-all duration-300 ${
          isPlayerVisible && currentVideo ? 'h-3/5' : 'h-screen'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <p className="text-red-500 text-center mb-4">{error}</p>
            <PlaylistInput />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <PlaylistInput />
          </div>
        ) : (
          <>
            <PlaylistHeader />

            {/* Videos Section */}
            <div className="p-4 space-y-4">
              {unwatchedVideos.map((video) => (
                <VideoItem key={video.id} video={video} isWatched={false} />
              ))}
              {watchedVideosList.length > 0 && (
                <div className="opacity-60 space-y-4 mt-8">
                  {watchedVideosList.map((video) => (
                    <VideoItem key={video.id} video={video} isWatched={true} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface VideoItemProps {
  video: {
    id: string;
    title: string;
    thumbnail: string;
    lengthSeconds: number; // Changed from duration string to lengthSeconds number
    channelTitle: string;
  };
  isWatched: boolean;
}

const VideoItem = ({ video, isWatched }: VideoItemProps) => {
  const {
    setCurrentVideo,
    markVideoAsWatched,
    unmarkVideoAsWatched,
    currentVideo,
  } = usePlaylist();
  const [progress, setProgress] = useState(0);
  const isCurrentlyPlaying = currentVideo?.id === video.id;

  // Load saved progress on mount/video change, and keep refreshing it while
  // this video is the one currently playing — VideoPlayer saves progress to
  // localStorage every 5s while playing, so without this the bar would stay
  // frozen at whatever it was on mount until the page is reloaded.
  useEffect(() => {
    const loadProgress = () => {
      try {
        const saved = localStorage.getItem('youtube-pip-video-progress');
        if (saved) {
          const progressData = JSON.parse(saved);
          const videoProgress = progressData[video.id] || 0;
          if (video.lengthSeconds > 0) {
            setProgress((videoProgress / video.lengthSeconds) * 100);
          } else {
            setProgress(0);
          }
        }
      } catch (error) {
        console.warn('[Debug] Failed to load video progress:', error);
      }
    };

    loadProgress();

    if (!isCurrentlyPlaying) return;

    const interval = setInterval(loadProgress, 5000);
    return () => clearInterval(interval);
  }, [video.id, video.lengthSeconds, isCurrentlyPlaying]);

  const handleVideoSelect = () => {
    setCurrentVideo(video);
  };

  const handleToggleWatched = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWatched) {
      unmarkVideoAsWatched(video.id);
    } else {
      markVideoAsWatched(video.id);
    }
  };

  return (
    <div
      className={`relative flex items-center space-x-4 rounded-lg p-2
        ${isWatched ? 'opacity-60' : 'hover:bg-gray-800'}
        ${isCurrentlyPlaying ? 'bg-gray-800 ring-1 ring-blue-500' : ''}`}
    >
      {/* Now Playing Indicator */}
      {isCurrentlyPlaying && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r" />
      )}

      <button
        type="button"
        onClick={handleVideoSelect}
        className="flex flex-1 min-w-0 items-center space-x-4 text-left"
      >
        {/* Thumbnail with Progress Bar */}
        <div className="relative w-32 h-18 shrink-0">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="rounded object-cover w-full h-full"
          />
          {/* Duration */}
          <span className="absolute bottom-1 right-1 bg-black bg-opacity-80 px-1 rounded text-xs">
            {formatDuration(video.lengthSeconds)}
          </span>
          {/* YouTube-style progress bar */}
          {progress > 0 && !isWatched && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800">
              <div
                className="h-full bg-red-600"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {/* Playing Overlay */}
          {isCurrentlyPlaying && (
            <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
              NOW PLAYING
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3
            className={`font-medium line-clamp-2 ${
              isCurrentlyPlaying ? 'text-blue-400' : ''
            }`}
          >
            {video.title}
          </h3>
          <p className="text-sm text-gray-400 truncate">{video.channelTitle}</p>
        </div>
      </button>

      {/* Watch Toggle */}
      <button
        type="button"
        onClick={handleToggleWatched}
        className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
          isWatched ? 'text-gray-400' : 'text-gray-300'
        }`}
        title={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
      >
        {isWatched ? (
          <EyeOff className="w-5 h-5" />
        ) : (
          <Eye className="w-5 h-5" />
        )}
      </button>
    </div>
  );
};
