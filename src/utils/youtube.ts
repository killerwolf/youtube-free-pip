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
  // Playlist ID only — must start with a known YouTube playlist prefix
  // (PL: user playlist, UU: uploads, LL: likes, WL: watch later,
  // FL: favorites, RD: mix/radio, OL: auto-generated album), otherwise
  // any 13+ char alphanumeric string (an API key, a hash, ...) would be
  // treated as a valid playlist ID.
  /^((?:PL|UU|LL|WL|FL|RD|OL)[a-zA-Z0-9_-]{10,})$/,
  // Mobile share URL
  /(?:https?:\/\/)?youtu\.be\/.*[?&]list=([a-zA-Z0-9_-]+)/,
  // Watch URL with playlist
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*[?&]list=([a-zA-Z0-9_-]+)/,
  // Playlist URL with additional parameters (si, etc.)
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?.*[?&]list=([a-zA-Z0-9_-]+)/,
  // Watch URL with list parameter first
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?list=([a-zA-Z0-9_-]+)/,
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

// A YouTube video ID is always 11 URL-safe base64 characters.
const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export interface PlaylistShareOptions {
  /** Video to open when the link is followed. */
  videoId?: string | null;
  /** Playback position to resume at, in seconds. */
  startSeconds?: number | null;
  baseUrl?: string;
}

/**
 * Generates this app's own shareable URL for a playlist (?list=<id>).
 *
 * When a video (and optionally a position) is provided, the link also carries
 * ?v=<videoId>&t=<seconds> so that opening it on another device reopens the
 * playlist on that exact video, at the point playback had reached.
 */
export const generatePlaylistShareUrl = (
  playlistId: string,
  options: PlaylistShareOptions = {}
): string => {
  const { videoId, startSeconds, baseUrl } = options;
  const base = baseUrl || window.location.origin;

  const params = new URLSearchParams({ list: playlistId });
  if (videoId) {
    params.set('v', videoId);
    if (startSeconds && startSeconds > 0) {
      params.set('t', String(Math.floor(startSeconds)));
    }
  }

  return `${base}?${params.toString()}`;
};

export interface ResumeTarget {
  videoId: string;
  startSeconds: number;
}

/**
 * Reads the ?v=<videoId>&t=<seconds> pair out of a query string.
 *
 * `t` accepts either a plain number of seconds or the YouTube-style `123s`
 * form, and is optional — a link without it simply resumes from the start.
 */
export const parseResumeParams = (search: string): ResumeTarget | null => {
  const params = new URLSearchParams(search);

  const videoId = params.get('v');
  if (!videoId || !YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) {
    return null;
  }

  const rawStart = params.get('t');
  const parsedStart = rawStart ? Number.parseInt(rawStart, 10) : 0;
  const startSeconds =
    Number.isFinite(parsedStart) && parsedStart > 0 ? parsedStart : 0;

  return { videoId, startSeconds };
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

interface InvidiousVideo {
  videoId: string;
  title: string;
  lengthSeconds: number;
  author: string;
}

// Public Invidious instances that mirror the YouTube API with CORS enabled,
// tried in order until one responds. Instance availability/CORS support is
// volatile — this list was last verified with a real browser fetch() (not
// curl, which doesn't reflect actual CORS enforcement) against every https
// instance in https://api.invidious.io/instances.json; every entry besides
// inv.nadeko.net failed with a CORS error at verification time. Re-verify
// with the same method before adding an instance back.
const INVIDIOUS_INSTANCES = ['https://inv.nadeko.net'];

const INSTANCE_TIMEOUT_MS = 8000;

async function fetchFromInstance(
  instance: string,
  playlistId: string
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), INSTANCE_TIMEOUT_MS);

  try {
    const response = await fetch(`${instance}/api/v1/playlists/${playlistId}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface FetchPlaylistOptions {
  /**
   * Instances to try, in order. Defaults to the verified list above; taking it
   * as an argument is what lets the fallback be exercised, since the default
   * list is one entry long.
   */
  instances?: readonly string[];
}

/**
 * Fetches playlist data from YouTube's API
 * Uses the Invidious API as a CORS proxy to access YouTube data
 */
export async function fetchPlaylistData(
  playlistId: string,
  { instances = INVIDIOUS_INSTANCES }: FetchPlaylistOptions = {}
): Promise<PlaylistData> {
  let lastError: Error | null = null;

  // Try each instance until one works
  for (const instance of instances) {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: shape validated below by the Array.isArray guard and per-field fallbacks
      const data = (await fetchFromInstance(instance, playlistId)) as any;

      // Every other field below falls back to a default; the video list can't,
      // and an instance answering without one is answering wrongly. Treated as
      // a failed instance so the next one is tried, rather than surfacing an
      // empty playlist as a success or a raw TypeError as the error.
      if (!Array.isArray(data?.videos)) {
        throw new Error('playlist response carried no video list');
      }

      return {
        title: data.title || 'Untitled Playlist',
        author: data.author || 'Unknown Author',
        videos: data.videos.map((video: InvidiousVideo) => ({
          id: video.videoId,
          title: video.title,
          // Fetched directly from YouTube's own thumbnail CDN instead of
          // proxying through the Invidious instance: same bytes, ~10x
          // faster, and doesn't load a volunteer-run instance for free.
          thumbnailUrl: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
          lengthSeconds: video.lengthSeconds || 0,
          channelTitle: video.author || 'Unknown Channel',
        })),
      };
    } catch (error) {
      console.warn(`Failed to fetch from ${instance}:`, error);
      lastError = error as Error;
    }
  }

  // If we get here, all instances failed
  throw new Error(
    lastError?.message
      ? `Failed to fetch playlist data: ${lastError.message}`
      : 'Failed to fetch playlist data: all API endpoints failed to respond'
  );
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
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
