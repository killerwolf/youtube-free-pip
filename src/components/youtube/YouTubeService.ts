import { useAuth } from '../auth/AuthContext';
import type {
  YouTubePlaylist,
  YouTubePlaylistItem,
  YouTubeVideo,
  YouTubeListResponse,
} from './types';
import { YouTubeError } from './types';

const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export function useYouTubeService() {
  const { accessToken, refreshAccessToken } = useAuth();

  const handleResponse = async <T>(response: Response): Promise<T> => {
    if (response.status === 401) {
      await refreshAccessToken();
      throw new Error('Token expired, please retry');
    }

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(YouTubeError.QUOTA_EXCEEDED);
      }
      throw new Error(YouTubeError.API_ERROR);
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
    url.searchParams.append('key', API_KEY);

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

  const getPlaylists = async (pageToken?: string): Promise<YouTubeListResponse<YouTubePlaylist>> => {
    const params: Record<string, string> = {
      part: 'snippet,contentDetails',
      mine: 'true',
      maxResults: '50',
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await fetchWithAuth('/playlists', params);
    return handleResponse<YouTubeListResponse<YouTubePlaylist>>(response);
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

    const response = await fetchWithAuth('/playlistItems', params);
    return handleResponse<YouTubeListResponse<YouTubePlaylistItem>>(response);
  };

  const getVideoDetails = async (videoId: string): Promise<YouTubeVideo> => {
    const params: Record<string, string> = {
      part: 'snippet,contentDetails',
      id: videoId,
    };

    const response = await fetchWithAuth('/videos', params);
    const data = await handleResponse<YouTubeListResponse<YouTubeVideo>>(response);

    if (!data.items.length) {
      throw new Error(YouTubeError.VIDEO_NOT_FOUND);
    }

    return data.items[0];
  };

  return {
    getPlaylists,
    getPlaylistItems,
    getVideoDetails,
  };
}