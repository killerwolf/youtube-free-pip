import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractPlaylistId,
  fetchPlaylistData,
  findPlaylistInText,
  formatDuration,
  normalizePlaylistUrl,
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
// case below drives fetch directly. restoreMocks and unstubGlobals in
// vite.config.ts undo the stubs.
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

const stubFetch = (...responses: Response[]) => {
  const mock = vi.fn();
  for (const response of responses) mock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', mock);
  return mock;
};

describe('fetchPlaylistData', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    // the fallback path reports every dead instance through console.warn
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('maps an instance response into playlist data', async () => {
    stubFetch(respondWith(aPlaylist));

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
    stubFetch(respondWith({ title: 'x', author: 'y' }));

    await expect(fetchPlaylistData('PLtest')).rejects.toThrow(
      'Failed to fetch playlist data: playlist response carried no video list'
    );
  });

  it('moves on to the next instance when one answers with no video list', async () => {
    // The point of treating it as a failed instance rather than an empty
    // playlist: the fallback still has to run.
    const fetchMock = stubFetch(
      respondWith({ title: 'x', author: 'y' }),
      respondWith(aPlaylist)
    );

    const data = await fetchPlaylistData('PLtest', {
      instances: ['https://empty.test', 'https://alive.test'],
    });

    expect(data.title).toBe('Deep work');
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('dead.test'),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('alive.test'),
      expect.anything()
    );
  });

  it('treats a non-ok response as a failed instance', async () => {
    stubFetch(
      respondWith(null, { ok: false, status: 502 }),
      respondWith(aPlaylist)
    );

    const data = await fetchPlaylistData('PLtest', {
      instances: ['https://bad.test', 'https://alive.test'],
    });

    expect(data.title).toBe('Deep work');
  });

  it('reports the last failure when every instance is down, not the first', async () => {
    stubFetch(
      respondWith(null, { ok: false, status: 500 }),
      respondWith(null, { ok: false, status: 503 })
    );

    await expect(
      fetchPlaylistData('PLtest', {
        instances: ['https://one.test', 'https://two.test'],
      })
    ).rejects.toThrow('Failed to fetch playlist data: HTTP error! status: 503');
  });

  it('reports a plain failure when the last error carries no message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('')));

    await expect(
      fetchPlaylistData('PLtest', { instances: ['https://one.test'] })
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
    const settled = expect(pending).rejects.toThrow(
      'Failed to fetch playlist data: The operation was aborted'
    );

    await vi.advanceTimersByTimeAsync(7999);
    expect(aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(aborted).toBe(true);
    await settled;
  });

  it('clears the abort timer once the instance has answered', async () => {
    // A resource assertion rather than a behavioural one, deliberately: a timer
    // left to fire aborts a request that already settled, which nothing outside
    // can observe. Checking the count before and after separates "cleared" from
    // "never armed". It is the one case here that would need rewriting if the
    // timeout moved to AbortSignal.timeout().
    vi.useFakeTimers();
    let answer: (response: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => (answer = resolve)))
    );

    const pending = fetchPlaylistData('PLtest');
    expect(vi.getTimerCount()).toBe(1);

    answer(respondWith(aPlaylist));
    await pending;

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
