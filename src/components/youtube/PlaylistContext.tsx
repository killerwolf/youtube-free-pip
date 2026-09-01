import { createContext, useContext, useEffect, useState } from 'react';
import { debugLog } from '../../utils/debugLog';
import {
  clearAllVideoProgress,
  setVideoProgress,
} from '../../utils/videoProgress';
import {
  extractPlaylistId,
  fetchPlaylistData,
  normalizePlaylistUrl,
  parseResumeParams,
  type ResumeTarget,
} from '../../utils/youtube';

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
  PLAYLIST_AUTHOR: 'youtube-pip-playlist-author',
} as const;

// Helper function to get playlist URL from current page URL
const getPlaylistUrlFromPageUrl = (): string | null => {
  if (typeof window === 'undefined') return null;

  const searchParams = new URLSearchParams(window.location.search);
  const playlistIdParam = searchParams.get('list');
  const fullUrlParam = searchParams.get('url');

  if (playlistIdParam) {
    const normalized = normalizePlaylistUrl(playlistIdParam);
    if (normalized) return normalized;
  }

  if (fullUrlParam) {
    const playlistId = extractPlaylistId(fullUrlParam);
    if (playlistId) {
      return normalizePlaylistUrl(fullUrlParam);
    }
  }

  return null;
};

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  // Initialize state: URL parameters take precedence over localStorage
  const [playlistUrl, setPlaylistUrlState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      // First check for URL parameters
      const urlPlaylist = getPlaylistUrlFromPageUrl();
      if (urlPlaylist) {
        return urlPlaylist;
      }
      // Fallback to localStorage
      return localStorage.getItem(LOCAL_STORAGE_KEYS.PLAYLIST_URL);
    }
    return null;
  });

  const [playlistTitle, setPlaylistTitle] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem(LOCAL_STORAGE_KEYS.PLAYLIST_TITLE) ||
        'Untitled Playlist'
      );
    }
    return 'Untitled Playlist';
  });

  const [playlistAuthor, setPlaylistAuthor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem(LOCAL_STORAGE_KEYS.PLAYLIST_AUTHOR) ||
        'Unknown Author'
      );
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

  // A ?v=<id>&t=<seconds> pair on the page URL means this session was opened
  // from a share link: once the playlist finishes loading, that video is
  // selected and cued at the shared position. Captured during the first render
  // so it survives the URL cleanup effect below.
  const [pendingResume, setPendingResume] = useState<ResumeTarget | null>(
    () => {
      if (typeof window === 'undefined') return null;
      return parseResumeParams(window.location.search);
    }
  );

  // Strip the resume params once captured, so a reload (or a bookmark) doesn't
  // yank playback back to the shared position after the user has moved on.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('v') || url.searchParams.has('t')) {
      url.searchParams.delete('v');
      url.searchParams.delete('t');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

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
        setVideos(
          playlistData.videos.map((video) => ({
            id: video.id,
            title: video.title,
            thumbnail: video.thumbnailUrl,
            lengthSeconds: video.lengthSeconds,
            channelTitle: video.channelTitle,
          }))
        );
      } catch (err) {
        console.error('Failed to load playlist:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load playlist'
        );
        setVideos([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadPlaylist();
  }, [playlistUrl]);

  // Apply a share link's resume target once the playlist it refers to is loaded.
  useEffect(() => {
    if (!pendingResume || videos.length === 0) return;

    const target = videos.find((video) => video.id === pendingResume.videoId);
    if (!target) {
      debugLog(
        '[Debug] Shared video not found in playlist:',
        pendingResume.videoId
      );
      setPendingResume(null);
      return;
    }

    // The player reads its start time from the progress store, so seeding it
    // here is what makes playback pick up where the sharer left off.
    if (pendingResume.startSeconds > 0) {
      setVideoProgress(target.id, pendingResume.startSeconds);
    }

    debugLog(
      `[Debug] Resuming shared video ${target.id} at ${pendingResume.startSeconds}s`
    );
    setCurrentVideoState(target);
    setPendingResume(null);
  }, [pendingResume, videos]);

  // Persist state changes to localStorage and clean URL parameters if needed
  useEffect(() => {
    if (playlistUrl) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.PLAYLIST_URL, playlistUrl);

      // If this playlist came from URL parameters, clean the URL
      const urlPlaylist = getPlaylistUrlFromPageUrl();
      if (urlPlaylist === playlistUrl) {
        // Clean URL parameters after successful loading
        const newUrl = new URL(window.location.href);
        if (newUrl.searchParams.has('list') || newUrl.searchParams.has('url')) {
          newUrl.searchParams.delete('list');
          newUrl.searchParams.delete('url');
          window.history.replaceState({}, '', newUrl.toString());
        }
      }
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
    debugLog('[Debug] Marking video as watched:', videoId);
    setWatchedVideos((prev) => new Set([...prev, videoId]));
  };

  const unmarkVideoAsWatched = (videoId: string) => {
    debugLog('[Debug] Unmarking video as watched:', videoId);
    setWatchedVideos((prev) => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
  };

  const setCurrentVideo = (video: Video | null) => {
    debugLog('[Debug] Setting current video:', video?.id);
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
    clearAllVideoProgress();

    // Clear watched videos only for the current playlist's videos
    if (videos.length > 0) {
      const newWatchedVideos = new Set(watchedVideos);
      for (const video of videos) {
        newWatchedVideos.delete(video.id);
      }
      setWatchedVideos(newWatchedVideos);
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.WATCHED_VIDEOS,
        JSON.stringify(Array.from(newWatchedVideos))
      );
    }

    debugLog('[Debug] Playlist and all related data cleared');
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
