import React, { createContext, useContext, useState, useCallback } from 'react';
import { useDebug } from '../DebugConsole';
import { useAuth } from '../auth/AuthContext';
import { useYouTubeService } from './YouTubeService';
import type {
  YouTubeContextType,
  YouTubePlaylist,
  YouTubePlaylistItem,
} from './types';

const YouTubeContext = createContext<YouTubeContextType | null>(null);

export function YouTubeProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  const { addLog } = useDebug();
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<YouTubePlaylist | null>(null);
  const [playlistItems, setPlaylistItems] = useState<YouTubePlaylistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageTokens, setNextPageTokens] = useState<
    Record<string, string | undefined>
  >({});

  const youtubeService = useYouTubeService();

  const loadPlaylists = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      const response = await youtubeService.getPlaylists();
      setPlaylists(response.items);
      setNextPageTokens((prev) => ({
        ...prev,
        playlists: response.nextPageToken,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load playlists';
      console.error('Error loading playlists:', err);
      addLog(
        `Error loading playlists with token ${accessToken}: ${errorMessage}`
      );
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loading, youtubeService, accessToken, addLog]);

  const selectPlaylist = useCallback(
    async (playlist: YouTubePlaylist | null) => {
      if (!playlist) {
        setSelectedPlaylist(null);
        setPlaylistItems([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await youtubeService.getPlaylistItems(playlist.id);
        setSelectedPlaylist(playlist);
        setPlaylistItems(response.items);
        setNextPageTokens((prev) => ({
          ...prev,
          items: response.nextPageToken,
        }));
      } catch (err) {
        console.error('Error loading playlist items:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load playlist items';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [youtubeService]
  );

  const loadMore = useCallback(async () => {
    if (loading || !selectedPlaylist) return;

    try {
      setLoading(true);
      const nextPageToken = nextPageTokens.items;
      if (!nextPageToken) return;

      const response = await youtubeService.getPlaylistItems(
        selectedPlaylist.id,
        nextPageToken
      );

      setPlaylistItems((prev) => [...prev, ...response.items]);
      setNextPageTokens((prev) => ({ ...prev, items: response.nextPageToken }));
    } catch (err) {
      console.error('Error loading more items:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load more items';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loading, selectedPlaylist, nextPageTokens.items, youtubeService]);

  const value: YouTubeContextType = {
    playlists,
    selectedPlaylist,
    playlistItems,
    loading,
    error,
    loadPlaylists,
    selectPlaylist,
    loadMore,
    hasMoreItems: Boolean(nextPageTokens.items),
  };

  return (
    <YouTubeContext.Provider value={value}>{children}</YouTubeContext.Provider>
  );
}

export function useYouTube() {
  const context = useContext(YouTubeContext);
  if (!context) {
    throw new Error('useYouTube must be used within a YouTubeProvider');
  }
  return context;
}
