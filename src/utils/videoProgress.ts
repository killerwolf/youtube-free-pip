import { debugLog } from './debugLog';

const VIDEO_PROGRESS_STORAGE_KEY = 'youtube-pip-video-progress';

// Keep the store bounded so it can't grow past the localStorage quota.
const MAX_TRACKED_VIDEOS = 100;

interface VideoProgressMap {
  [videoId: string]: number; // videoId -> timestamp in seconds
}

/**
 * The one slot this module persists into. Adapters own the storage key and the
 * failure modes of their medium; the module owns the format written into it.
 */
export interface ProgressStorage {
  read(): string | null;
  write(value: string): void;
  clear(): void;
}

const localStorageProgress: ProgressStorage = {
  read: () => localStorage.getItem(VIDEO_PROGRESS_STORAGE_KEY),
  write: (value) => localStorage.setItem(VIDEO_PROGRESS_STORAGE_KEY, value),
  clear: () => localStorage.removeItem(VIDEO_PROGRESS_STORAGE_KEY),
};

/**
 * Storage that lives for as long as the object does. Lets tests exercise the
 * module without a DOM, and without leaking state between cases.
 */
export const createMemoryProgressStorage = (
  initial: string | null = null
): ProgressStorage => {
  let value = initial;
  return {
    read: () => value,
    write: (next) => {
      value = next;
    },
    clear: () => {
      value = null;
    },
  };
};

type ProgressListener = (seconds: number) => void;

const listeners = new Map<string, Set<ProgressListener>>();

/**
 * Watches one video's saved position. The listener fires on every write, so a
 * progress bar tracks the player instead of polling for it, and stops as soon
 * as the returned function is called.
 */
export const subscribeToVideoProgress = (
  videoId: string,
  listener: ProgressListener
): (() => void) => {
  const forVideo = listeners.get(videoId) ?? new Set<ProgressListener>();
  forVideo.add(listener);
  listeners.set(videoId, forVideo);

  return () => {
    forVideo.delete(listener);
    if (forVideo.size === 0) listeners.delete(videoId);
  };
};

const notify = (videoId: string, seconds: number) => {
  const forVideo = listeners.get(videoId);
  if (!forVideo) return;

  for (const listener of forVideo) {
    try {
      listener(seconds);
    } catch (error) {
      console.warn('[Debug] A progress listener threw:', error);
    }
  }
};

const clearCorruptedProgress = (storage: ProgressStorage) => {
  try {
    storage.clear();
  } catch (e) {
    console.error('[Debug] Failed to clear corrupted progress data:', e);
  }
};

/**
 * Reads the whole videoId -> seconds map, returning {} on any problem.
 */
const readVideoProgressMap = (storage: ProgressStorage): VideoProgressMap => {
  try {
    const saved = storage.read();
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      console.warn('[Debug] Invalid progress data format in localStorage');
      return {};
    }
    return parsed as VideoProgressMap;
  } catch (error) {
    console.warn('[Debug] Failed to load video progress:', error);
    clearCorruptedProgress(storage);
    return {};
  }
};

/**
 * Saved playback position for a video, in whole seconds (0 when unknown).
 */
export const getVideoProgress = (
  videoId: string,
  storage: ProgressStorage = localStorageProgress
): number => {
  if (!videoId) {
    console.warn('[Debug] Invalid video ID provided to getVideoProgress');
    return 0;
  }

  const savedTime = readVideoProgressMap(storage)[videoId] || 0;
  return Math.max(0, Math.floor(savedTime));
};

/**
 * Stores the playback position for a video, pruning the oldest entries once
 * the store grows past MAX_TRACKED_VIDEOS.
 */
export const setVideoProgress = (
  videoId: string,
  seconds: number,
  storage: ProgressStorage = localStorageProgress
): void => {
  if (!videoId) {
    console.warn('[Debug] Invalid video ID provided to setVideoProgress');
    return;
  }

  try {
    let progress = readVideoProgressMap(storage);
    progress[videoId] = Math.max(0, Math.floor(seconds));

    const entries = Object.entries(progress);
    if (entries.length > MAX_TRACKED_VIDEOS) {
      progress = Object.fromEntries(entries.slice(-MAX_TRACKED_VIDEOS));
    }

    storage.write(JSON.stringify(progress));
    notify(videoId, progress[videoId]);
    debugLog(
      `[Debug] Saved progress for video ${videoId}: ${progress[videoId]} seconds`
    );
  } catch (error) {
    console.warn('[Debug] Failed to save video progress:', error);
    clearCorruptedProgress(storage);
  }
};

/**
 * Forgets every saved position. The one supported way to wipe the store —
 * callers no longer need to know which key it lives under.
 */
export const clearAllVideoProgress = (
  storage: ProgressStorage = localStorageProgress
): void => {
  try {
    storage.clear();
    for (const videoId of listeners.keys()) {
      notify(videoId, 0);
    }
    debugLog('[Debug] Cleared all saved video progress');
  } catch (error) {
    console.warn('[Debug] Failed to clear video progress:', error);
  }
};
