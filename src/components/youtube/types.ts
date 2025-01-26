export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface YouTubeThumbnails {
  default: YouTubeThumbnail;
  medium?: YouTubeThumbnail;
  high?: YouTubeThumbnail;
  standard?: YouTubeThumbnail;
  maxres?: YouTubeThumbnail;
}

export interface YouTubePlaylist {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
  };
  contentDetails: {
    itemCount: number;
  };
}

export interface YouTubePlaylistItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    position: number;
    resourceId: {
      kind: string;
      videoId: string;
    };
  };
}

export interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    channelTitle: string;
    publishedAt: string;
  };
  contentDetails: {
    duration: string;
  };
}

export interface YouTubeListResponse<T> {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: T[];
}

export enum YouTubeError {
  PLAYLIST_NOT_FOUND = 'Playlist not found',
  VIDEO_NOT_FOUND = 'Video not found',
  API_ERROR = 'YouTube API error',
  NETWORK_ERROR = 'Network error',
  QUOTA_EXCEEDED = 'YouTube quota exceeded',
}