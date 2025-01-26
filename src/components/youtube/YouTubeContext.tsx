import React, { createContext, useContext, useState, useCallback } from 'react';
import type { YouTubePlaylist, YouTubePlaylistItem } from './types';
import { useYouTubeService } from './YouTubeService';

interface YouTubeContextType {
  playlists: YouTubePlaylist[];
  selectedPlaylist: YouTubePlaylist | null;
  playlistItems: YouTubePlaylistItem[];
  loading: boolean;
  error: string | null;
  loadPlaylists: () => Promise<void>;
  selectPlaylist: (playlist: YouTubePlaylist | null) => Promise<void>;
  hasMorePlaylists: boolean;
  loadMorePlaylists: () => Promise<void>;
  retryLoading: () => Promise<void>;
}

const YouTubeContext = createContext<YouTubeContextType | null>(null);

export function YouTubeProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylist | null>(null);
  const [playlistItems, setPlaylistItems] = useState<YouTubePlaylistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  const youtubeService = useYouTubeService();

  const loadPlaylists = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      const response = await youtubeService.getPlaylists();
      setPlaylists(response.items);
      setNextPageToken(response.nextPageToken);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error loading playlists:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load playlists';
      setError(errorMessage);
      
      // Only auto-retry if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        setTimeout(() => {
          loadPlaylists();
        }, delay);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, youtubeService, retryCount]);

  const loadMorePlaylists = useCallback(async () => {
    if (!nextPageToken || loading) return;

    try {
      setLoading(true);
      const response = await youtubeService.getPlaylists(nextPageToken);
      setPlaylists(prev => [...prev, ...response.items]);
      setNextPageToken(response.nextPageToken);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more playlists';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [nextPageToken, loading, youtubeService]);

  const loadPlaylistItems = useCallback(async (playlistId: string) => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      const response = await youtubeService.getPlaylistItems(playlistId);
      setPlaylistItems(response.items);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load playlist items';
      setError(errorMessage);
      setPlaylistItems([]);
    } finally {
      setLoading(false);
    }
  }, [loading, youtubeService]);

  const selectPlaylist = useCallback(async (playlist: YouTubePlaylist | null) => {
    setSelectedPlaylist(playlist);
    if (playlist) {
      await loadPlaylistItems(playlist.id);
    } else {
      setPlaylistItems([]);
    }
  }, [loadPlaylistItems]);

  const retryLoading = useCallback(async () => {
    setRetryCount(0); // Reset retry count
    setError(null);
    await loadPlaylists();
  }, [loadPlaylists]);

  const value = {
    playlists,
    selectedPlaylist,
    playlistItems,
    loading,
    error,
    loadPlaylists,
    selectPlaylist,
    hasMorePlaylists: !!nextPageToken,
    loadMorePlaylists,
    retryLoading,
  };

  return <YouTubeContext.Provider value={value}>{children}</YouTubeContext.Provider>;
}

export function useYouTube() {
  const context = useContext(YouTubeContext);
  if (!context) {
    throw new Error('useYouTube must be used within a YouTubeProvider');
  }
  return context;
}