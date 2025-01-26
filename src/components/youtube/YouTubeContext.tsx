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
}

const YouTubeContext = createContext<YouTubeContextType | null>(null);

export function YouTubeProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylist | null>(null);
  const [playlistItems, setPlaylistItems] = useState<YouTubePlaylistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  
  const youtubeService = useYouTubeService();

  const loadPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await youtubeService.getPlaylists();
      setPlaylists(response.items);
      setNextPageToken(response.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlists');
      console.error('Error loading playlists:', err);
    } finally {
      setLoading(false);
    }
  }, [youtubeService]);

  const loadMorePlaylists = useCallback(async () => {
    if (!nextPageToken || loading) return;

    try {
      setLoading(true);
      const response = await youtubeService.getPlaylists(nextPageToken);
      setPlaylists(prev => [...prev, ...response.items]);
      setNextPageToken(response.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more playlists');
      console.error('Error loading more playlists:', err);
    } finally {
      setLoading(false);
    }
  }, [nextPageToken, loading, youtubeService]);

  const loadPlaylistItems = useCallback(async (playlistId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await youtubeService.getPlaylistItems(playlistId);
      setPlaylistItems(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlist items');
      console.error('Error loading playlist items:', err);
    } finally {
      setLoading(false);
    }
  }, [youtubeService]);

  const selectPlaylist = useCallback(async (playlist: YouTubePlaylist | null) => {
    setSelectedPlaylist(playlist);
    if (playlist) {
      await loadPlaylistItems(playlist.id);
    } else {
      setPlaylistItems([]);
    }
  }, [loadPlaylistItems]);

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