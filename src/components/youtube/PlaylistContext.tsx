import { createContext, useContext, useEffect, useState } from 'react';
import { extractPlaylistId, fetchPlaylistData } from '../../utils/youtube';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
}

interface PlaylistContextType {
  playlistUrl: string | null;
  videos: Video[];
  watchedVideos: Set<string>;
  currentVideo: Video | null;
  isLoading: boolean;
  error: string | null;
  setPlaylistUrl: (url: string | null) => void;
  markVideoAsWatched: (videoId: string) => void;
  unmarkVideoAsWatched: (videoId: string) => void;
  setCurrentVideo: (video: Video | null) => void;
  clearPlaylist: () => void;
}

const PlaylistContext = createContext<PlaylistContextType | null>(null);

const LOCAL_STORAGE_KEYS = {
  PLAYLIST_URL: 'youtube-pip-playlist-url',
  WATCHED_VIDEOS: 'youtube-pip-watched-videos',
  CURRENT_VIDEO: 'youtube-pip-current-video'
} as const;

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  // Initialize state from localStorage
  const [playlistUrl, setPlaylistUrlState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.PLAYLIST_URL);
    }
    return null;
  });

  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.WATCHED_VIDEOS);
      return new Set(saved ? JSON.parse(saved) : []);
    }
    return new Set();
  });

  const [currentVideo, setCurrentVideoState] = useState<Video | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_VIDEO);
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  // Load videos when playlist URL changes
  useEffect(() => {
    async function loadPlaylist() {
      if (!playlistUrl) {
        setVideos([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const playlistId = extractPlaylistId(playlistUrl);
        if (!playlistId) {
          throw new Error('Invalid playlist URL');
        }

        const playlistData = await fetchPlaylistData(playlistId);
        setVideos(playlistData.map(video => ({
          id: video.id,
          title: video.title,
          thumbnail: video.thumbnailUrl,
          duration: '0:00', // TODO: Add duration from API
          channelTitle: video.channelTitle
        })));
      } catch (err) {
        console.error('Failed to load playlist:', err);
        setError(err instanceof Error ? err.message : 'Failed to load playlist');
        setVideos([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadPlaylist();
  }, [playlistUrl]);

  // Persist state changes to localStorage
  useEffect(() => {
    if (playlistUrl) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.PLAYLIST_URL, playlistUrl);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.PLAYLIST_URL);
    }
  }, [playlistUrl]);

  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.WATCHED_VIDEOS, 
      JSON.stringify(Array.from(watchedVideos))
    );
  }, [watchedVideos]);

  useEffect(() => {
    if (currentVideo) {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CURRENT_VIDEO,
        JSON.stringify(currentVideo)
      );
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_VIDEO);
    }
  }, [currentVideo]);

  const setPlaylistUrl = (url: string | null) => {
    setPlaylistUrlState(url);
    // Reset state when changing playlists
    if (url !== playlistUrl) {
      setVideos([]);
      setCurrentVideoState(null);
      setError(null);
      // Don't clear watchedVideos to maintain history across playlists
    }
  };

  const markVideoAsWatched = (videoId: string) => {
    setWatchedVideos(prev => new Set([...prev, videoId]));
  };

  const unmarkVideoAsWatched = (videoId: string) => {
    setWatchedVideos(prev => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
  };

  const setCurrentVideo = (video: Video | null) => {
    setCurrentVideoState(video);
    if (video) {
      markVideoAsWatched(video.id);
    }
  };

  const clearPlaylist = () => {
    setPlaylistUrlState(null);
    setVideos([]);
    setCurrentVideoState(null);
    setError(null);
    // Don't clear watchedVideos to maintain history
  };

  return (
    <PlaylistContext.Provider
      value={{
        playlistUrl,
        videos,
        watchedVideos,
        currentVideo,
        isLoading,
        error,
        setPlaylistUrl,
        markVideoAsWatched,
        unmarkVideoAsWatched,
        setCurrentVideo,
        clearPlaylist,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
} 