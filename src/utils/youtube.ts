export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

const YOUTUBE_PLAYLIST_PATTERNS = [
  // Standard playlist URL
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
  // Playlist ID only
  /^([a-zA-Z0-9_-]{34})$/,
  // Mobile share URL
  /(?:https?:\/\/)?youtu\.be\/.*[?&]list=([a-zA-Z0-9_-]+)/,
  // Watch URL with playlist
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*[?&]list=([a-zA-Z0-9_-]+)/,
] as const;

/**
 * Extracts a playlist ID from various YouTube URL formats
 */
export const extractPlaylistId = (text: string): string | null => {
  const trimmed = text.trim();
  
  for (const pattern of YOUTUBE_PLAYLIST_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Monitors text for YouTube playlist URLs
 * Returns the first valid playlist ID found, if any
 */
export const findPlaylistInText = (text: string): string | null => {
  // First try the whole text
  const wholeMatch = extractPlaylistId(text);
  if (wholeMatch) return wholeMatch;

  // Then try each word
  const words = text.split(/\s+/);
  for (const word of words) {
    const match = extractPlaylistId(word);
    if (match) return match;
  }

  return null;
};

/**
 * Formats a playlist ID into a standard YouTube URL
 */
export const formatPlaylistUrl = (playlistId: string): string => {
  return `https://www.youtube.com/playlist?list=${playlistId}`;
};

/**
 * Checks if a string contains a valid YouTube playlist URL or ID
 */
export const isValidPlaylistInput = (text: string): boolean => {
  return extractPlaylistId(text) !== null;
};

/**
 * Normalizes various YouTube playlist URL formats into a standard format
 */
export const normalizePlaylistUrl = (input: string): string | null => {
  const playlistId = extractPlaylistId(input);
  return playlistId ? formatPlaylistUrl(playlistId) : null;
};

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  lengthSeconds: number;
}

export interface PlaylistData {
  title: string;
  author: string;
  videos: YouTubeVideo[];
}

/**
 * Fetches playlist data from YouTube's API
 * Uses the Invidious API as a CORS proxy to access YouTube data
 */
export async function fetchPlaylistData(playlistId: string): Promise<PlaylistData> {
  try {
    // Use Invidious API to fetch playlist data
    // We'll try multiple instances in case some are down
    const invidiousInstances = [
      'https://invidious.snopyta.org',
      'https://invidious.kavin.rocks',
      'https://vid.puffyan.us',
      'https://yt.artemislena.eu',
    ];

    let lastError: Error | null = null;
    
    // Try each instance until one works
    for (const instance of invidiousInstances) {
      try {
        const response = await fetch(
          `${instance}/api/v1/playlists/${playlistId}`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.videos || !Array.isArray(data.videos)) {
          throw new Error('Invalid playlist data format');
        }

        return {
          title: data.title || 'Untitled Playlist',
          author: data.author || 'Unknown Author',
          videos: data.videos.map((video: any) => ({
            id: video.videoId,
            title: video.title,
            thumbnailUrl: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
            channelTitle: video.author,
            lengthSeconds: video.lengthSeconds || 0
          }))
        };
      } catch (error) {
        console.warn(`Failed to fetch from ${instance}:`, error);
        lastError = error as Error;
        continue; // Try next instance
      }
    }

    // If we get here, all instances failed
    throw new Error(
      lastError?.message || 'All API endpoints failed to respond'
    );
  } catch (error) {
    console.error('Error fetching playlist data:', error);
    throw new Error(
      error instanceof Error 
        ? `Failed to fetch playlist data: ${error.message}`
        : 'Failed to fetch playlist data'
    );
  }
}

/**
 * Formats duration from seconds to human readable format
 * Example: 3600 -> 1:00:00
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
