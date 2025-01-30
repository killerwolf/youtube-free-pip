import { useDebug } from '../DebugConsole';
import { useAuth } from '../auth/AuthContext';
import type {
  YouTubeListResponse,
  YouTubePlaylist,
  YouTubePlaylistItem,
  YouTubeVideo,
} from './types';
import { YouTubeError } from './types';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const DTP_API_BASE_URL = 'https://data-portability.googleapis.com/v1';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export function useYouTubeService() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { addLog } = useDebug();

  const handleResponse = async <T>(response: Response): Promise<T> => {
    if (response.status === 401) {
      addLog('Token expired, refreshing...', 'warn', 'YouTube');
      await refreshAccessToken();
      throw new Error('Token expired, please try again');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error?.message ||
        errorData.error?.error_description ||
        YouTubeError.API_ERROR;

      addLog(`API error: ${errorMessage}`, 'error', 'YouTube');

      if (response.status === 403) {
        throw new Error(YouTubeError.QUOTA_EXCEEDED);
      }

      if (response.status === 404) {
        throw new Error(YouTubeError.PLAYLIST_NOT_FOUND);
      }

      throw new Error(errorMessage);
    }

    return response.json();
  };

  const fetchWithAuth = async (
    baseUrl: string,
    endpoint: string,
    options: FetchOptions = {}
  ) => {
    if (!accessToken) {
      addLog('Attempted API call without auth token', 'error', 'YouTube');
      throw new Error('Not authenticated');
    }

    const url = new URL(`${baseUrl}${endpoint}`);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    addLog(`Fetching: ${endpoint}`, 'debug', 'YouTube');

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          ...options.headers,
        },
      });

      return response;
    } catch (error) {
      addLog(`Network error: ${error}`, 'error', 'YouTube');
      throw new Error(YouTubeError.NETWORK_ERROR);
    }
  };

  const getPlaylists = async (
    pageToken?: string
  ): Promise<YouTubeListResponse<YouTubePlaylist>> => {
    const params: Record<string, string> = {
      part: 'snippet,contentDetails',
      mine: 'true',
      maxResults: '50',
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await fetchWithAuth(YOUTUBE_API_BASE_URL, '/playlists', {
      params,
    });
    return handleResponse<YouTubeListResponse<YouTubePlaylist>>(response);
  };

  const getWatchLater = async (
    pageToken?: string
  ): Promise<YouTubeListResponse<YouTubePlaylistItem>> => {
    // Get watch later using Data Portability API
    const response = await fetchWithAuth(DTP_API_BASE_URL, '/watchLater', {
      params: {
        maxResults: '50',
        ...(pageToken && { pageToken }),
      },
      headers: {
        'X-Goog-Data-Source': 'youtube',
      },
    });

    const data = await handleResponse<any>(response);
    const items = data.items.map((video: any) => ({
      kind: 'youtube#playlistItem',
      etag: video.etag,
      id: video.id,
      snippet: {
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnails: video.snippet.thumbnails,
        position: video.snippet.position || 0,
        resourceId: {
          kind: 'youtube#video',
          videoId: video.id,
        },
      },
    }));

    return {
      kind: 'youtube#playlistItemListResponse',
      etag: data.etag,
      nextPageToken: data.nextPageToken,
      items,
      pageInfo: {
        totalResults: data.pageInfo.totalResults,
        resultsPerPage: data.pageInfo.resultsPerPage,
      },
    };
  };

  const getHistory = async (
    pageToken?: string
  ): Promise<YouTubeListResponse<YouTubePlaylistItem>> => {
    // Get watch history using Data Portability API
    const response = await fetchWithAuth(DTP_API_BASE_URL, '/watchHistory', {
      params: {
        maxResults: '50',
        ...(pageToken && { pageToken }),
      },
      headers: {
        'X-Goog-Data-Source': 'youtube',
      },
    });

    const data = await handleResponse<any>(response);
    const items = data.items.map((video: any) => ({
      kind: 'youtube#playlistItem',
      etag: video.etag,
      id: video.id,
      snippet: {
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnails: video.snippet.thumbnails,
        position: video.snippet.position || 0,
        resourceId: {
          kind: 'youtube#video',
          videoId: video.id,
        },
      },
    }));

    return {
      kind: 'youtube#playlistItemListResponse',
      etag: data.etag,
      nextPageToken: data.nextPageToken,
      items,
      pageInfo: {
        totalResults: data.pageInfo.totalResults,
        resultsPerPage: data.pageInfo.resultsPerPage,
      },
    };
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

    const response = await fetchWithAuth(
      YOUTUBE_API_BASE_URL,
      '/playlistItems',
      { params }
    );
    return handleResponse<YouTubeListResponse<YouTubePlaylistItem>>(response);
  };

  const getVideoDetails = async (videoId: string): Promise<YouTubeVideo> => {
    const params: Record<string, string> = {
      part: 'snippet,contentDetails',
      id: videoId,
    };

    const response = await fetchWithAuth(YOUTUBE_API_BASE_URL, '/videos', {
      params,
    });
    const data =
      await handleResponse<YouTubeListResponse<YouTubeVideo>>(response);

    if (!data.items.length) {
      throw new Error(YouTubeError.VIDEO_NOT_FOUND);
    }

    return data.items[0];
  };

  return {
    getPlaylists,
    getPlaylistItems,
    getVideoDetails,
    getWatchLater,
    getHistory,
  };
}
