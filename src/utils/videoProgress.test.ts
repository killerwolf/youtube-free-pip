import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getVideoProgress,
  readVideoProgressMap,
  setVideoProgress,
  VIDEO_PROGRESS_STORAGE_KEY,
} from './videoProgress';

// The module reports every recovery path through console; silence it so a
// passing run stays readable. restoreMocks in vite.config.ts undoes these.
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

const readRaw = (): Record<string, number> =>
  JSON.parse(localStorage.getItem(VIDEO_PROGRESS_STORAGE_KEY) ?? '{}');

describe('getVideoProgress', () => {
  it('reports zero for a video never watched', () => {
    expect(getVideoProgress('dQw4w9WgXcQ')).toBe(0);
  });

  it('reports the position that was saved', () => {
    setVideoProgress('dQw4w9WgXcQ', 304);
    expect(getVideoProgress('dQw4w9WgXcQ')).toBe(304);
  });

  it('reports zero for an empty video id', () => {
    expect(getVideoProgress('')).toBe(0);
  });
});

describe('setVideoProgress', () => {
  it('floors a fractional position', () => {
    setVideoProgress('dQw4w9WgXcQ', 12.9);
    expect(getVideoProgress('dQw4w9WgXcQ')).toBe(12);
  });

  it('clamps a negative position to zero', () => {
    setVideoProgress('dQw4w9WgXcQ', -30);
    expect(getVideoProgress('dQw4w9WgXcQ')).toBe(0);
  });

  it('overwrites the previous position for the same video', () => {
    setVideoProgress('dQw4w9WgXcQ', 30);
    setVideoProgress('dQw4w9WgXcQ', 90);
    expect(getVideoProgress('dQw4w9WgXcQ')).toBe(90);
  });

  it('keeps positions for other videos untouched', () => {
    setVideoProgress('aaaaaaaaaaa', 10);
    setVideoProgress('bbbbbbbbbbb', 20);
    expect(getVideoProgress('aaaaaaaaaaa')).toBe(10);
    expect(getVideoProgress('bbbbbbbbbbb')).toBe(20);
  });

  it('ignores an empty video id', () => {
    setVideoProgress('', 304);
    expect(localStorage.getItem(VIDEO_PROGRESS_STORAGE_KEY)).toBeNull();
  });
});

describe('store size', () => {
  it('prunes to the 100 most recently added videos', () => {
    for (let i = 0; i <= 100; i++) {
      setVideoProgress(`video-${i}`, i + 1);
    }

    const stored = readRaw();
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
    for (let i = 0; i <= 98; i++) {
      setVideoProgress(`video-${i}`, i + 1);
    }
    setVideoProgress('video-0', 500);

    setVideoProgress('video-99', 100);
    setVideoProgress('video-100', 101);

    expect(readRaw()['video-0']).toBeUndefined();
    expect(readRaw()['video-1']).toBe(2);
  });
});

describe('recovering from bad stored data', () => {
  it('reports an empty map and drops the key when the JSON is malformed', () => {
    localStorage.setItem(VIDEO_PROGRESS_STORAGE_KEY, '{not json');

    expect(readVideoProgressMap()).toEqual({});
    expect(localStorage.getItem(VIDEO_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('reports an empty map but keeps the key when the JSON is the wrong shape', () => {
    localStorage.setItem(VIDEO_PROGRESS_STORAGE_KEY, '[1,2,3]');

    expect(readVideoProgressMap()).toEqual({});
    expect(localStorage.getItem(VIDEO_PROGRESS_STORAGE_KEY)).toBe('[1,2,3]');
  });

  it('reports an empty map when nothing has ever been stored', () => {
    expect(readVideoProgressMap()).toEqual({});
  });

  it('recovers by accepting new writes after malformed JSON', () => {
    localStorage.setItem(VIDEO_PROGRESS_STORAGE_KEY, '{not json');

    setVideoProgress('dQw4w9WgXcQ', 304);

    expect(getVideoProgress('dQw4w9WgXcQ')).toBe(304);
  });
});
