import { useAuth } from '../auth/AuthContext';
import type {
  YouTubePlaylist,
  YouTubePlaylistItem,
  YouTubeVideo,
  YouTubeListResponse,
} from './types';
import { YouTubeError } from './types';

const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export function useYouTubeService() {
  const { accessToken, refreshAccessToken } = useAuth();

  const handleResponse = async <T>(response: Response): Promise<T> => {
    if (response.status === 401) {
      // Token expired, refresh and throw error to retry
      await refreshAccessToken();
      throw new Error('Token expired, please retry');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('YouTube API error:', errorData);
      
      if (response.status === 403) {
        throw new Error(YouTubeError.QUOTA_EXCEEDED);
      }
      
      if (response.status === 404) {
        throw new Error(YouTubeError.PLAYLIST_NOT_FOUND);
      }
      
      throw new Error(
        errorData.error?.message || 
        errorData.error?.error_description || 
        YouTubeError.API_ERROR
      );
    }

    return response.json();
  };

  const fetchWithAuth = async (endpoint: string, params: Record<string, string> = {}) => {
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const url = new URL(`${API_BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw new Error(YouTubeError.NETWORK_ERROR);
    }
  };

  const fetchWithRetry = async <T>(
    endpoint: string,
    params: Record<string, string> = {},
    retries = 1
  ): Promise<T> => {
    try {
      const response = await fetchWithAuth(endpoint, params);
      return await handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error && error.message === 'Token expired, please retry' && retries > 0) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchWithRetry<T>(endpoint, params, retries - 1);
      }
      throw error;
    }
  };

  const getPlaylists = async (pageToken?: string): Promise<YouTubeListResponse<YouTubePlaylist>> => {
    const params: Record<string, string> = {
      part: 'snippet,contentDetails',
      mine: 'true',
      maxResults: '50',
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    return fetchWithRetry<YouTubeListResponse<YouTubePlaylist>>('/playlists', params);
  };

  const getPlaylistItems = async (
    playlistId: string,
    pageToken?: string
  ): Promise<YouTubeListResponse<YouTubePlaylistItem>> => {
    const params: Record<string, string> = {
      part: 'snippet',
      playlistId,
      maxResults: '50',
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    return fetchWithRetry<YouTubeListResponse<YouTubePlaylistItem>>('/playlistItems', params);
  };

  const getVideoDetails = async (videoId: string): Promise<YouTubeVideo> => {
    const params: Record<string, string> = {
      part: 'snippet,contentDetails',
      id: videoId,
    };

    const response = await fetchWithRetry<YouTubeListResponse<YouTubeVideo>>('/videos', params);

    if (!response.items.length) {
      throw new Error(YouTubeError.VIDEO_NOT_FOUND);
    }

    return response.items[0];
  };

  return {
    getPlaylists,
    getPlaylistItems,
    getVideoDetails,
  };
}