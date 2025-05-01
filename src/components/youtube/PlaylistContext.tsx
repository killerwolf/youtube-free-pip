import { createContext, useContext, useEffect, useState } from 'react';
import { extractPlaylistId, fetchPlaylistData } from '../../utils/youtube';

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  lengthSeconds: number;
  channelTitle: string;
}

interface PlaylistContextType {
  playlistUrl: string | null;
  playlistTitle: string;
  playlistAuthor: string;
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
  CURRENT_VIDEO: 'youtube-pip-current-video',
  PLAYLIST_TITLE: 'youtube-pip-playlist-title',
  PLAYLIST_AUTHOR: 'youtube-pip-playlist-author'
} as const;

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  // Initialize state from localStorage
  const [playlistUrl, setPlaylistUrlState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.PLAYLIST_URL);
    }
    return null;
  });

  const [playlistTitle, setPlaylistTitle] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.PLAYLIST_TITLE) || 'Untitled Playlist';
    }
    return 'Untitled Playlist';
  });

  const [playlistAuthor, setPlaylistAuthor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.PLAYLIST_AUTHOR) || 'Unknown Author';
    }
    return 'Unknown Author';
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
        setPlaylistTitle(playlistData.title);
        setPlaylistAuthor(playlistData.author);
        setVideos(playlistData.videos.map(video => ({
          id: video.id,
          title: video.title,
          thumbnail: video.thumbnailUrl,
          lengthSeconds: video.lengthSeconds,
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
    localStorage.setItem(LOCAL_STORAGE_KEYS.PLAYLIST_TITLE, playlistTitle);
  }, [playlistTitle]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.PLAYLIST_AUTHOR, playlistAuthor);
  }, [playlistAuthor]);

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
      setPlaylistTitle('Untitled Playlist');
      setPlaylistAuthor('Unknown Author');
      // Don't clear watchedVideos to maintain history across playlists
    }
  };

  const markVideoAsWatched = (videoId: string) => {
    console.log('[Debug] Marking video as watched:', videoId, 'Caller:', new Error().stack);
    setWatchedVideos(prev => new Set([...prev, videoId]));
  };

  const unmarkVideoAsWatched = (videoId: string) => {
    console.log('[Debug] Unmarking video as watched:', videoId, 'Caller:', new Error().stack);
    setWatchedVideos(prev => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
  };

  const setCurrentVideo = (video: Video | null) => {
    console.log('[Debug] Setting current video:', video?.id);
    setCurrentVideoState(video);
    // Removed automatic marking as watched when selecting a video
  };

  const clearPlaylist = () => {
    // Clear state
    setPlaylistUrlState(null);
    setVideos([]);
    setCurrentVideoState(null);
    setError(null);
    setPlaylistTitle('Untitled Playlist');
    setPlaylistAuthor('Unknown Author');
    
    // Clear all related localStorage data
    localStorage.removeItem(LOCAL_STORAGE_KEYS.PLAYLIST_URL);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.PLAYLIST_TITLE);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.PLAYLIST_AUTHOR);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_VIDEO);
    localStorage.removeItem('youtube-pip-video-progress'); // Clear video progress
    
    // Clear watched videos only for the current playlist's videos
    if (videos.length > 0) {
      const newWatchedVideos = new Set(watchedVideos);
      videos.forEach(video => {
        newWatchedVideos.delete(video.id);
      });
      setWatchedVideos(newWatchedVideos);
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.WATCHED_VIDEOS,
        JSON.stringify(Array.from(newWatchedVideos))
      );
    }

    console.log('[Debug] Playlist and all related data cleared');
  };

  return (
    <PlaylistContext.Provider
      value={{
        playlistUrl,
        playlistTitle,
        playlistAuthor,
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