import React, { createContext, useContext, useState, useCallback } from 'react';
import type { YouTubePlaylist, YouTubePlaylistItem, YouTubeListResponse } from './types';
import { useYouTubeService } from './YouTubeService';

interface YouTubeContextType {
  playlists: YouTubePlaylist[];
  watchLater: YouTubePlaylistItem[];
  history: YouTubePlaylistItem[];
  selectedPlaylist: YouTubePlaylist | null;
  selectedListType: 'playlist' | 'watchLater' | 'history' | null;
  playlistItems: YouTubePlaylistItem[];
  loading: boolean;
  error: string | null;
  loadPlaylists: () => Promise<void>;
  loadWatchLater: () => Promise<void>;
  loadHistory: () => Promise<void>;
  selectPlaylist: (playlist: YouTubePlaylist | null) => Promise<void>;
  selectWatchLater: () => Promise<void>;
  selectHistory: () => Promise<void>;
  hasMorePlaylists: boolean;
  hasMoreWatchLater: boolean;
  hasMoreHistory: boolean;
  loadMore: () => Promise<void>;
  retryLoading: () => Promise<void>;
}

interface PageTokens {
  playlists?: string;
  playlistItems?: string;
  watchLater?: string;
  history?: string;
}

const YouTubeContext = createContext<YouTubeContextType | null>(null);

export function YouTubeProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [watchLater, setWatchLater] = useState<YouTubePlaylistItem[]>([]);
  const [history, setHistory] = useState<YouTubePlaylistItem[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylist | null>(null);
  const [selectedListType, setSelectedListType] = useState<'playlist' | 'watchLater' | 'history' | null>(null);
  const [playlistItems, setPlaylistItems] = useState<YouTubePlaylistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageTokens, setNextPageTokens] = useState<PageTokens>({});
  
  const youtubeService = useYouTubeService();

  const loadPlaylists = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      const response = await youtubeService.getPlaylists();
      setPlaylists(response.items);
      setNextPageTokens(prev => ({ ...prev, playlists: response.nextPageToken }));
    } catch (err) {
      console.error('Error loading playlists:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load playlists';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loading, youtubeService]);

  const loadWatchLater = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      const response = await youtubeService.getWatchLater();
      setWatchLater(response.items);
      setNextPageTokens(prev => ({ ...prev, watchLater: response.nextPageToken }));
      setSelectedListType('watchLater');
      setPlaylistItems(response.items);
    } catch (err) {
      console.error('Error loading watch later:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load watch later';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loading, youtubeService]);

  const loadHistory = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      const response = await youtubeService.getHistory();
      setHistory(response.items);
      setNextPageTokens(prev => ({ ...prev, history: response.nextPageToken }));
      setSelectedListType('history');
      setPlaylistItems(response.items);
    } catch (err) {
      console.error('Error loading history:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load history';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loading, youtubeService]);

  const loadPlaylistItems = useCallback(async (playlistId: string) => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      const response = await youtubeService.getPlaylistItems(playlistId);
      setPlaylistItems(response.items);
      setNextPageTokens(prev => ({
        ...prev,
        playlistItems: response.nextPageToken
      }));
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
    setSelectedListType(playlist ? 'playlist' : null);
    if (playlist) {
      await loadPlaylistItems(playlist.id);
    } else {
      setPlaylistItems([]);
    }
  }, [loadPlaylistItems]);

  const selectWatchLater = useCallback(async () => {
    setSelectedPlaylist(null);
    setSelectedListType('watchLater');
    await loadWatchLater();
  }, [loadWatchLater]);

  const selectHistory = useCallback(async () => {
    setSelectedPlaylist(null);
    setSelectedListType('history');
    await loadHistory();
  }, [loadHistory]);

  const loadMore = useCallback(async () => {
    if (loading || !selectedListType) return;

    const getRelevantToken = () => {
      switch (selectedListType) {
        case 'playlist':
          return nextPageTokens.playlistItems;
        case 'watchLater':
          return nextPageTokens.watchLater;
        case 'history':
          return nextPageTokens.history;
        default:
          return undefined;
      }
    };

    const pageToken = getRelevantToken();
    if (!pageToken) return;

    try {
      setLoading(true);

      if (selectedListType === 'playlist' && selectedPlaylist) {
        const response = await youtubeService.getPlaylistItems(selectedPlaylist.id, pageToken);
        setPlaylistItems(prev => [...prev, ...response.items]);
        setNextPageTokens(prev => ({
          ...prev,
          playlistItems: response.nextPageToken
        }));
      } else if (selectedListType === 'watchLater') {
        const response = await youtubeService.getWatchLater(pageToken);
        const newItems = response.items;
        setWatchLater(prev => [...prev, ...newItems]);
        setPlaylistItems(prev => [...prev, ...newItems]);
        setNextPageTokens(prev => ({
          ...prev,
          watchLater: response.nextPageToken
        }));
      } else if (selectedListType === 'history') {
        const response = await youtubeService.getHistory(pageToken);
        const newItems = response.items;
        setHistory(prev => [...prev, ...newItems]);
        setPlaylistItems(prev => [...prev, ...newItems]);
        setNextPageTokens(prev => ({
          ...prev,
          history: response.nextPageToken
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more items';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loading, selectedListType, selectedPlaylist, youtubeService, nextPageTokens]);

  const retryLoading = useCallback(async () => {
    setError(null);
    if (selectedListType === 'watchLater') {
      await loadWatchLater();
    } else if (selectedListType === 'history') {
      await loadHistory();
    } else {
      await loadPlaylists();
    }
  }, [selectedListType, loadWatchLater, loadHistory, loadPlaylists]);

  const value = {
    playlists,
    watchLater,
    history,
    selectedPlaylist,
    selectedListType,
    playlistItems,
    loading,
    error,
    loadPlaylists,
    loadWatchLater,
    loadHistory,
    selectPlaylist,
    selectWatchLater,
    selectHistory,
    hasMorePlaylists: !!nextPageTokens.playlists,
    hasMoreWatchLater: !!nextPageTokens.watchLater,
    hasMoreHistory: !!nextPageTokens.history,
    loadMore,
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