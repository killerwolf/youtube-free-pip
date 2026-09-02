import { createContext, useContext, useEffect, useState } from 'react';
import { debugLog } from '../../utils/debugLog';
import {
  ENTRY_PARAMS,
  type PlaylistEntry,
  type ResumeTarget,
  resolveEntry,
} from '../../utils/playlistEntry';
import {
  clearAllVideoProgress,
  setVideoProgress,
} from '../../utils/videoProgress';
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
  PLAYLIST_AUTHOR: 'youtube-pip-playlist-author',
} as const;

// The link this session was opened with, read once. resolveEntry owns every
// supported shape, so nothing here needs to know which one was used.
const entryFromPage = (): PlaylistEntry | null =>
  typeof window === 'undefined' ? null : resolveEntry(window.location);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  // Captured on the first render, before the cleanup effect below rewrites the
  // address bar, so the link's contents survive being stripped from the URL.
  const [entry] = useState(entryFromPage);

  // The link wins over what was stored last time.
  const [playlistUrl, setPlaylistUrlState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return (
      entry?.playlistUrl ??
      localStorage.getItem(LOCAL_STORAGE_KEYS.PLAYLIST_URL)
    );
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

  // A share link names a video and a position: once the playlist finishes
  // loading, that video is selected and cued there.
  const [pendingResume, setPendingResume] = useState<ResumeTarget | null>(
    () => entry?.resume ?? null
  );

  // The link has been read, so its params come out of the address bar: left in
  // place they would yank playback back to the shared position on every reload,
  // long after the user had moved on. On the legacy /playlist/<id> path the
  // router has already redirected by now — React flushes child effects before
  // parent ones — so this sees the ?list= form and clears that too.
  useEffect(() => {
    // Only when a link was actually read: with nothing consumed there is
    // nothing to clear, and discarding the params anyway would throw away a
    // ?v=/?t= pair that no playlist happened to resolve alongside.
    if (!entry) return;

    const url = new URL(window.location.href);
    if (!ENTRY_PARAMS.some((param) => url.searchParams.has(param))) return;

    for (const param of ENTRY_PARAMS) {
      url.searchParams.delete(param);
    }
    window.history.replaceState({}, '', url.toString());
  }, [entry]);

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
