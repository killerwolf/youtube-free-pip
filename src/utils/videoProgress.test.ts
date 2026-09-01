import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllVideoProgress,
  createMemoryProgressStorage,
  getVideoProgress,
  type ProgressStorage,
  setVideoProgress,
  subscribeToVideoProgress,
} from './videoProgress';

// The module reports every recovery path through console; silence it so a
// passing run stays readable. restoreMocks in vite.config.ts undoes these.
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

// What the store wrote, read back the way the store writes it. The storage key
// is the module's business, so tests observe through the adapter instead.
const storedMap = (storage: ProgressStorage): Record<string, number> =>
  JSON.parse(storage.read() ?? '{}');

describe('getVideoProgress', () => {
  it('reports zero for a video never watched', () => {
    const storage = createMemoryProgressStorage();

    expect(getVideoProgress('dQw4w9WgXcQ', storage)).toBe(0);
  });

  it('reports the position that was saved', () => {
    const storage = createMemoryProgressStorage();

    setVideoProgress('dQw4w9WgXcQ', 304, storage);

    expect(getVideoProgress('dQw4w9WgXcQ', storage)).toBe(304);
  });

  it('reports zero for an empty video id', () => {
    const storage = createMemoryProgressStorage();

    expect(getVideoProgress('', storage)).toBe(0);
  });
});

describe('setVideoProgress', () => {
  it('floors a fractional position', () => {
    const storage = createMemoryProgressStorage();

    setVideoProgress('dQw4w9WgXcQ', 12.9, storage);

    expect(getVideoProgress('dQw4w9WgXcQ', storage)).toBe(12);
  });

  it('clamps a negative position to zero', () => {
    const storage = createMemoryProgressStorage();

    setVideoProgress('dQw4w9WgXcQ', -30, storage);

    expect(getVideoProgress('dQw4w9WgXcQ', storage)).toBe(0);
  });

  it('overwrites the previous position for the same video', () => {
    const storage = createMemoryProgressStorage();

    setVideoProgress('dQw4w9WgXcQ', 30, storage);
    setVideoProgress('dQw4w9WgXcQ', 90, storage);

    expect(getVideoProgress('dQw4w9WgXcQ', storage)).toBe(90);
  });

  it('keeps positions for other videos untouched', () => {
    const storage = createMemoryProgressStorage();

    setVideoProgress('aaaaaaaaaaa', 10, storage);
    setVideoProgress('bbbbbbbbbbb', 20, storage);

    expect(getVideoProgress('aaaaaaaaaaa', storage)).toBe(10);
    expect(getVideoProgress('bbbbbbbbbbb', storage)).toBe(20);
  });

  it('ignores an empty video id', () => {
    const storage = createMemoryProgressStorage();

    setVideoProgress('', 304, storage);

    expect(storage.read()).toBeNull();
  });
});

describe('store size', () => {
  it('prunes to the 100 most recently added videos', () => {
    const storage = createMemoryProgressStorage();

    for (let i = 0; i <= 100; i++) {
      setVideoProgress(`video-${i}`, i + 1, storage);
    }

    const stored = storedMap(storage);
    expect(Object.keys(stored)).toHaveLength(100);
    expect(stored['video-0']).toBeUndefined();
    expect(stored['video-100']).toBe(101);
  });

  it('prunes by first write, not by most recent write', () => {
    // Current behaviour, not necessarily the desired one: re-saving a video
    // already in the store does not move it to the end, so a video watched
    // from the start of a long playlist is still the first evicted even if
    // it is the one being watched right now. Worth revisiting when the store
    // is closed up.
    const storage = createMemoryProgressStorage();

    for (let i = 0; i <= 98; i++) {
      setVideoProgress(`video-${i}`, i + 1, storage);
    }
    setVideoProgress('video-0', 500, storage);

    setVideoProgress('video-99', 100, storage);
    setVideoProgress('video-100', 101, storage);

    expect(storedMap(storage)['video-0']).toBeUndefined();
    expect(storedMap(storage)['video-1']).toBe(2);
  });
});

describe('recovering from bad stored data', () => {
  it('reports zero and drops the stored value when the JSON is malformed', () => {
    const storage = createMemoryProgressStorage('{not json');

    expect(getVideoProgress('dQw4w9WgXcQ', storage)).toBe(0);
    expect(storage.read()).toBeNull();
  });

  it('reports zero but keeps the stored value when the JSON is the wrong shape', () => {
    const storage = createMemoryProgressStorage('[1,2,3]');

    expect(getVideoProgress('dQw4w9WgXcQ', storage)).toBe(0);
    expect(storage.read()).toBe('[1,2,3]');
  });

  it('recovers by accepting new writes after malformed JSON', () => {
    const storage = createMemoryProgressStorage('{not json');

    setVideoProgress('dQw4w9WgXcQ', 304, storage);

    expect(getVideoProgress('dQw4w9WgXcQ', storage)).toBe(304);
  });
});

describe('the default store', () => {
  it('persists to localStorage when no adapter is given', () => {
    setVideoProgress('dQw4w9WgXcQ', 304);

    expect(getVideoProgress('dQw4w9WgXcQ')).toBe(304);
    // Which key it used is the module's business; that it reached localStorage
    // at all is what this pins down.
    expect(localStorage.length).toBe(1);
  });
});

describe('clearAllVideoProgress', () => {
  it('forgets every saved position', () => {
    const storage = createMemoryProgressStorage();
    setVideoProgress('aaaaaaaaaaa', 10, storage);
    setVideoProgress('bbbbbbbbbbb', 20, storage);

    clearAllVideoProgress(storage);

    expect(getVideoProgress('aaaaaaaaaaa', storage)).toBe(0);
    expect(getVideoProgress('bbbbbbbbbbb', storage)).toBe(0);
  });
});

describe('subscribeToVideoProgress', () => {
  it('tells a subscriber the new position as it is saved', () => {
    const storage = createMemoryProgressStorage();
    const seen: number[] = [];
    const unsubscribe = subscribeToVideoProgress('dQw4w9WgXcQ', (seconds) => {
      seen.push(seconds);
    });

    setVideoProgress('dQw4w9WgXcQ', 304, storage);
    unsubscribe();

    expect(seen).toEqual([304]);
  });

  it('tells subscribers the position is back to zero when the store is cleared', () => {
    // The bar has to fall back to empty on its own: nothing re-mounts the
    // playlist when a playlist is cleared, so a bar that is never told keeps
    // showing the position of a video the store has already forgotten.
    const storage = createMemoryProgressStorage();
    setVideoProgress('dQw4w9WgXcQ', 304, storage);
    const seen: number[] = [];
    const unsubscribe = subscribeToVideoProgress('dQw4w9WgXcQ', (seconds) => {
      seen.push(seconds);
    });

    clearAllVideoProgress(storage);
    unsubscribe();

    expect(seen).toEqual([0]);
  });

  it('stops telling a subscriber once it has unsubscribed', () => {
    const storage = createMemoryProgressStorage();
    const seen: number[] = [];
    const unsubscribe = subscribeToVideoProgress('dQw4w9WgXcQ', (seconds) => {
      seen.push(seconds);
    });

    unsubscribe();
    setVideoProgress('dQw4w9WgXcQ', 304, storage);

    expect(seen).toEqual([]);
  });

  it('tells a subscriber only about the video it asked for', () => {
    const storage = createMemoryProgressStorage();
    const seen: number[] = [];
    const unsubscribe = subscribeToVideoProgress('aaaaaaaaaaa', (seconds) => {
      seen.push(seconds);
    });

    setVideoProgress('bbbbbbbbbbb', 20, storage);
    unsubscribe();

    expect(seen).toEqual([]);
  });

  it('reports the position as stored, not as passed in', () => {
    const storage = createMemoryProgressStorage();
    const seen: number[] = [];
    const unsubscribe = subscribeToVideoProgress('dQw4w9WgXcQ', (seconds) => {
      seen.push(seconds);
    });

    setVideoProgress('dQw4w9WgXcQ', 12.9, storage);
    unsubscribe();

    expect(seen).toEqual([12]);
  });
});
