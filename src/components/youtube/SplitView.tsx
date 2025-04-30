import { usePlaylist } from './PlaylistContext';
import { useEffect, useRef, useState } from 'react';
import { VideoPlayer } from './VideoPlayer';

export const SplitView = () => {
  const { currentVideo, videos, watchedVideos, isLoading, error } = usePlaylist();
  const [isPlayerVisible, setIsPlayerVisible] = useState(true);
  const lastScrollY = useRef(0);
  
  // Auto-hide player on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current) {
        setIsPlayerVisible(false);
      } else {
        setIsPlayerVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
          isPlayerVisible ? 'h-2/5' : 'h-0'
        }`}
      >
        {currentVideo && <VideoPlayer />}
      </div>

      {/* Playlist Section */}
      <div 
        className={`flex-1 overflow-y-auto transition-all duration-300 ${
          isPlayerVisible ? 'h-3/5' : 'h-screen'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500 p-4 text-center">
            {error}
          </div>
        ) : videos.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 p-4 text-center">
            Paste a YouTube playlist URL to get started
          </div>
        ) : (
          <>
            {/* Up Next Section */}
            <section className="p-4">
              <h2 className="text-lg font-semibold mb-4">Up Next</h2>
              <div className="space-y-4">
                {unwatchedVideos.map(video => (
                  <VideoItem 
                    key={video.id}
                    video={video}
                    isWatched={false}
                  />
                ))}
              </div>
            </section>

            {/* Watched Section */}
            {watchedVideosList.length > 0 && (
              <section className="p-4 opacity-60">
                <h2 className="text-lg font-semibold mb-4">Watched</h2>
                <div className="space-y-4">
                  {watchedVideosList.map(video => (
                    <VideoItem 
                      key={video.id}
                      video={video}
                      isWatched={true}
                    />
                  ))}
                </div>
              </section>
            )}
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
    duration: string;
    channelTitle: string;
  };
  isWatched: boolean;
}

const VideoItem = ({ video, isWatched }: VideoItemProps) => {
  const { setCurrentVideo, markVideoAsWatched, unmarkVideoAsWatched } = usePlaylist();
  
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
      className={`flex items-center space-x-4 p-2 rounded-lg cursor-pointer
        ${isWatched ? 'opacity-60' : 'hover:bg-gray-800'}`}
      onClick={handleVideoSelect}
    >
      {/* Thumbnail */}
      <div className="relative w-32 h-18">
        <img 
          src={video.thumbnail} 
          alt={video.title}
          className="rounded object-cover w-full h-full"
        />
        <span className="absolute bottom-1 right-1 bg-black bg-opacity-80 px-1 rounded text-xs">
          {video.duration}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium line-clamp-2">{video.title}</h3>
        <p className="text-sm text-gray-400 truncate">{video.channelTitle}</p>
      </div>

      {/* Watch Toggle */}
      <button
        onClick={handleToggleWatched}
        className={`p-2 rounded-full ${
          isWatched ? 'bg-gray-700' : 'bg-gray-600'
        }`}
      >
        {isWatched ? '👁️' : '👁️‍🗨️'}
      </button>
    </div>
  );
}; 