import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractPlaylistId,
  fetchPlaylistData,
  findPlaylistInText,
  formatDuration,
  generatePlaylistShareUrl,
  normalizePlaylistUrl,
  parseResumeParams,
} from './youtube';

describe('extractPlaylistId', () => {
  it('reads the id out of a standard playlist URL', () => {
    expect(
      extractPlaylistId('https://www.youtube.com/playlist?list=PLabc123')
    ).toBe('PLabc123');
  });

  it('reads the id out of a watch URL carrying a list', () => {
    expect(
      extractPlaylistId(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxyz7890123'
      )
    ).toBe('PLxyz7890123');
  });

  it('reads the id out of a youtu.be share URL', () => {
    expect(
      extractPlaylistId('https://youtu.be/dQw4w9WgXcQ?list=PLxyz7890123')
    ).toBe('PLxyz7890123');
  });

  it('accepts a bare id carrying a known playlist prefix', () => {
    expect(extractPlaylistId('PL1234567890')).toBe('PL1234567890');
    expect(extractPlaylistId('UU1234567890')).toBe('UU1234567890');
  });

  it('rejects a bare string without a known playlist prefix', () => {
    // The guard that stops an API key or a hash being taken for a playlist id.
    expect(extractPlaylistId('AIzaSyD1234567890abc')).toBeNull();
  });

  it('rejects a bare prefixed id that is too short', () => {
    expect(extractPlaylistId('PLshort')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(extractPlaylistId('  PL1234567890\n')).toBe('PL1234567890');
  });

  it('returns null for text carrying no playlist', () => {
    expect(extractPlaylistId('https://example.com/nothing-here')).toBeNull();
  });
});

describe('findPlaylistInText', () => {
  it('finds a playlist URL embedded in a sentence', () => {
    expect(
      findPlaylistInText(
        'have a look at https://www.youtube.com/playlist?list=PLabc123 tonight'
      )
    ).toBe('PLabc123');
  });

  it('finds a bare id sitting among other words', () => {
    // The whole-text pass can't match a bare id (that pattern is anchored),
    // so this only works because of the word-by-word fallback.
    expect(findPlaylistInText('playlist PL1234567890 please')).toBe(
      'PL1234567890'
    );
  });

  it('returns null when nothing in the text is a playlist', () => {
    expect(findPlaylistInText('just some ordinary words')).toBeNull();
  });
});

describe('normalizePlaylistUrl', () => {
  it('expands a bare id into a canonical YouTube URL', () => {
    expect(normalizePlaylistUrl('PL1234567890')).toBe(
      'https://www.youtube.com/playlist?list=PL1234567890'
    );
  });

  it('returns null for input carrying no playlist', () => {
    expect(normalizePlaylistUrl('not a playlist')).toBeNull();
  });
});

describe('generatePlaylistShareUrl', () => {
  const baseUrl = 'https://free-yt-pip.netlify.app';

  it('builds a playlist-only link', () => {
    expect(generatePlaylistShareUrl('PL1234567890', { baseUrl })).toBe(
      'https://free-yt-pip.netlify.app?list=PL1234567890'
    );
  });

  it('carries the video and the position when both are given', () => {
    expect(
      generatePlaylistShareUrl('PL1234567890', {
        baseUrl,
        videoId: 'dQw4w9WgXcQ',
        startSeconds: 304,
      })
    ).toBe(
      'https://free-yt-pip.netlify.app?list=PL1234567890&v=dQw4w9WgXcQ&t=304'
    );
  });

  it('omits the position when playback has not moved', () => {
    expect(
      generatePlaylistShareUrl('PL1234567890', {
        baseUrl,
        videoId: 'dQw4w9WgXcQ',
        startSeconds: 0,
      })
    ).toBe('https://free-yt-pip.netlify.app?list=PL1234567890&v=dQw4w9WgXcQ');
  });

  it('floors a fractional position', () => {
    expect(
      generatePlaylistShareUrl('PL1234567890', {
        baseUrl,
        videoId: 'dQw4w9WgXcQ',
        startSeconds: 304.9,
      })
    ).toContain('&t=304');
  });

  it('ignores a position given without a video', () => {
    expect(
      generatePlaylistShareUrl('PL1234567890', { baseUrl, startSeconds: 304 })
    ).toBe('https://free-yt-pip.netlify.app?list=PL1234567890');
  });
});

describe('parseResumeParams', () => {
  it('reads a video and a position', () => {
    expect(parseResumeParams('?v=dQw4w9WgXcQ&t=304')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 304,
    });
  });

  it('accepts the YouTube-style 123s form', () => {
    expect(parseResumeParams('?v=dQw4w9WgXcQ&t=304s')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 304,
    });
  });

  it('defaults the position to zero when t is absent', () => {
    expect(parseResumeParams('?v=dQw4w9WgXcQ')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 0,
    });
  });

  it('defaults the position to zero when t is unparseable', () => {
    expect(parseResumeParams('?v=dQw4w9WgXcQ&t=later')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 0,
    });
  });

  it('clamps a negative position to zero', () => {
    expect(parseResumeParams('?v=dQw4w9WgXcQ&t=-30')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 0,
    });
  });

  it('rejects a v that is not an 11-character video id', () => {
    expect(parseResumeParams('?v=tooshort&t=30')).toBeNull();
    expect(parseResumeParams('?v=waytoolongvideoid&t=30')).toBeNull();
  });

  it('returns null when there is no video to resume', () => {
    expect(parseResumeParams('?t=304')).toBeNull();
    expect(parseResumeParams('')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats under an hour as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(59)).toBe('0:59');
    expect(formatDuration(304)).toBe('5:04');
  });

  it('formats an hour or more as h:mm:ss', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('floors fractional seconds', () => {
    expect(formatDuration(59.9)).toBe('0:59');
  });
});

// The instances are volunteer-run and the list is one entry long, so every
// case below drives fetch directly. restoreMocks in vite.config.ts does not
// cover stubbed globals.
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const respondWith = (
  body: unknown,
  init: { ok?: boolean; status?: number } = {}
) =>
  ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  }) as Response;

const aPlaylist = {
  title: 'Deep work',
  author: 'Some channel',
  videos: [
    {
      videoId: 'dQw4w9WgXcQ',
      title: 'First video',
      lengthSeconds: 212,
      author: 'Channel A',
    },
  ],
};

describe('fetchPlaylistData', () => {
  beforeEach(() => {
    // the fallback path reports every dead instance through console.warn
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('maps an instance response into playlist data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respondWith(aPlaylist)));

    const data = await fetchPlaylistData('PLtest');

    expect(data).toEqual({
      title: 'Deep work',
      author: 'Some channel',
      videos: [
        {
          id: 'dQw4w9WgXcQ',
          title: 'First video',
          // straight from YouTube's CDN, not proxied through the instance
          thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
          channelTitle: 'Channel A',
          lengthSeconds: 212,
        },
      ],
    });
  });

  it('treats a response carrying no video list as a failed instance', async () => {
    // Valid JSON, no `videos`. Every other field has a fallback; this one had
    // none, so the map() threw a TypeError the user saw as
    // "Cannot read properties of undefined (reading 'map')".
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respondWith({ title: 'x', author: 'y' }))
    );

    await expect(fetchPlaylistData('PLtest')).rejects.toThrow(/no video list/i);
  });

  it('falls back to the next instance when one fails', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(respondWith(aPlaylist));
    vi.stubGlobal('fetch', fetchMock);

    const data = await fetchPlaylistData('PLtest', {
      instances: ['https://dead.test', 'https://alive.test'],
    });

    expect(data.title).toBe('Deep work');
    expect(fetchMock.mock.calls[0][0]).toContain('dead.test');
    expect(fetchMock.mock.calls[1][0]).toContain('alive.test');
  });

  it('treats a non-ok response as a failed instance', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respondWith(null, { ok: false, status: 502 }))
      .mockResolvedValueOnce(respondWith(aPlaylist));
    vi.stubGlobal('fetch', fetchMock);

    const data = await fetchPlaylistData('PLtest', {
      instances: ['https://bad.test', 'https://alive.test'],
    });

    expect(data.title).toBe('Deep work');
  });

  it('reports the last failure when every instance is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respondWith(null, { ok: false, status: 503 }))
    );

    await expect(
      fetchPlaylistData('PLtest', {
        instances: ['https://one.test', 'https://two.test'],
      })
    ).rejects.toThrow('Failed to fetch playlist data: HTTP error! status: 503');
  });

  it('reports a plain failure when there is no instance to try', async () => {
    await expect(
      fetchPlaylistData('PLtest', { instances: [] })
    ).rejects.toThrow(
      'Failed to fetch playlist data: all API endpoints failed to respond'
    );
  });

  it('gives up on an instance that never answers, after 8s and not before', async () => {
    vi.useFakeTimers();
    let aborted = false;
    // settles only if the caller aborts it
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              aborted = true;
              reject(new Error('The operation was aborted'));
            });
          })
      )
    );

    const pending = fetchPlaylistData('PLtest', {
      instances: ['https://slow.test'],
    });
    const settled = expect(pending).rejects.toThrow(/aborted/i);

    await vi.advanceTimersByTimeAsync(7999);
    expect(aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(aborted).toBe(true);
    await settled;
  });

  it('clears the abort timer once the instance has answered', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respondWith(aPlaylist)));

    await fetchPlaylistData('PLtest');

    // a surviving 8s timer would still be counted here
    expect(vi.getTimerCount()).toBe(0);
  });

  it('falls back on every field the instance leaves out', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          respondWith({ videos: [{ videoId: 'dQw4w9WgXcQ' }] })
        )
    );

    const data = await fetchPlaylistData('PLtest');

    expect(data.title).toBe('Untitled Playlist');
    expect(data.author).toBe('Unknown Author');
    expect(data.videos[0].channelTitle).toBe('Unknown Channel');
    expect(data.videos[0].lengthSeconds).toBe(0);
  });
});
