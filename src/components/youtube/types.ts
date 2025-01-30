export enum YouTubeError {
  AUTH_FAILED = 'Authentication failed',
  QUOTA_EXCEEDED = 'YouTube API quota exceeded',
  PLAYLIST_NOT_FOUND = 'Playlist not found',
  VIDEO_NOT_FOUND = 'Video not found',
  API_ERROR = 'YouTube API error',
  NETWORK_ERROR = 'Network error',
}

export interface YouTubeThumbnails {
  default: YouTubeThumbnail;
  medium?: YouTubeThumbnail;
  high?: YouTubeThumbnail;
  standard?: YouTubeThumbnail;
  maxres?: YouTubeThumbnail;
}

export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
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

export interface YouTubePlaylist {
  kind: string;
  etag: string;
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
  kind: string;
  etag: string;
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
  kind: string;
  etag: string;
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    channelId: string;
    channelTitle: string;
    tags?: string[];
    categoryId: string;
    publishedAt: string;
  };
  contentDetails: {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
    licensedContent: boolean;
    contentRating: Record<string, unknown>;
    projection: string;
  };
}

export interface YouTubeActivity {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    type:
      | 'upload'
      | 'playlist'
      | 'playlistItem'
      | 'like'
      | 'favorite'
      | 'watchLater'
      | 'watch';
    groupId: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
  };
  contentDetails: {
    upload?: {
      videoId: string;
    };
    like?: {
      resourceId: {
        kind: string;
        videoId: string;
      };
    };
    favorite?: {
      resourceId: {
        kind: string;
        videoId: string;
      };
    };
    playlistItem?: {
      resourceId: {
        kind: string;
        videoId: string;
      };
      playlistId: string;
    };
    recommendation?: {
      resourceId: {
        kind: string;
        videoId: string;
      };
    };
    watchLater?: {
      videoId: string;
    };
    watch?: {
      videoId: string;
    };
    videoId: string;
  };
}

export interface YouTubeContextType {
  playlists: YouTubePlaylist[];
  selectedPlaylist: YouTubePlaylist | null;
  playlistItems: YouTubePlaylistItem[];
  loading: boolean;
  error: string | null;
  loadPlaylists: () => Promise<void>;
  selectPlaylist: (playlist: YouTubePlaylist | null) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMoreItems: boolean;
}
