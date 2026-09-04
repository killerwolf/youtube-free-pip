import { extractPlaylistId, formatPlaylistUrl } from './youtube';

/**
 * How the user arrived at a playlist.
 *
 * One module owns the answer, so the supported link shapes are listed in one
 * place and each is a single test. `?list=` is the canonical form: it is what
 * the README documents and what the share button emits.
 */
export interface PlaylistEntry {
  /** The playlist's YouTube id, for rebuilding the canonical link. */
  playlistId: string;
  /** Canonical YouTube playlist URL to load. */
  playlistUrl: string;
  /** Video and position to reopen at, when the link carried them. */
  resume: ResumeTarget | null;
}

export interface ResumeTarget {
  videoId: string;
  startSeconds: number;
}

/**
 * Query params resolveEntry consumes. Exported so the caller that clears them
 * from the address bar does not have to restate the list.
 */
export const ENTRY_PARAMS = ['list', 'url', 'v', 't'] as const;

export interface EntryLocation {
  pathname: string;
  search: string;
}

// A YouTube video ID is always 11 URL-safe base64 characters.
const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Reads the ?v=<videoId>&t=<seconds> pair a share link carries.
 *
 * `t` accepts either a plain number of seconds or the YouTube-style `123s`
 * form, and is optional — a link without it simply resumes from the start.
 */
const resumeFrom = (params: URLSearchParams): ResumeTarget | null => {
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

const PLAYLIST_PATH = /^\/playlist\/([^/?#]+)\/?$/;

const playlistIdFromPath = (pathname: string): string | null =>
  pathname.match(PLAYLIST_PATH)?.[1] ?? null;

/**
 * Reads the link the app was opened with. Returns null when it names no
 * playlist, which is the ordinary case of someone opening the site directly.
 */
export const resolveEntry = (location: EntryLocation): PlaylistEntry | null => {
  const params = new URLSearchParams(location.search);

  // ?list= first, then ?url= carrying a whole YouTube URL, then the legacy
  // /playlist/<id> path, which survives only so links already sent still work.
  const playlistId =
    extractPlaylistId(params.get('list') ?? '') ??
    extractPlaylistId(params.get('url') ?? '') ??
    extractPlaylistId(playlistIdFromPath(location.pathname) ?? '');
  if (!playlistId) return null;

  // Formatted, not re-validated. extractPlaylistId already applied the rules,
  // and it only demands a known prefix of a *bare* id — a link may legitimately
  // carry others, TLGG… share-sheet ids among them. Re-checking the extracted
  // id as if it were bare would drop those.
  return {
    playlistId,
    playlistUrl: formatPlaylistUrl(playlistId),
    resume: resumeFrom(params),
  };
};

export interface ShareLinkOptions {
  /** Video to open when the link is followed. */
  videoId?: string | null;
  /** Playback position to resume at, in seconds. */
  startSeconds?: number | null;
  baseUrl?: string;
}

/**
 * Builds this app's shareable link for a playlist, in the canonical ?list=
 * form that resolveEntry reads back.
 *
 * When a video (and optionally a position) is given, the link also carries
 * ?v=<videoId>&t=<seconds>, so opening it elsewhere reopens the playlist on
 * that video at the point playback had reached.
 */
export const buildShareLink = (
  playlistId: string,
  { videoId, startSeconds, baseUrl }: ShareLinkOptions = {}
): string => {
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
