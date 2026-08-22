import { debugLog } from './debugLog';

export const VIDEO_PROGRESS_STORAGE_KEY = 'youtube-pip-video-progress';

// Keep the store bounded so it can't grow past the localStorage quota.
const MAX_TRACKED_VIDEOS = 100;

export interface VideoProgressMap {
  [videoId: string]: number; // videoId -> timestamp in seconds
}

const clearCorruptedProgress = () => {
  try {
    localStorage.removeItem(VIDEO_PROGRESS_STORAGE_KEY);
  } catch (e) {
    console.error('[Debug] Failed to clear corrupted progress data:', e);
  }
};

/**
 * Reads the whole videoId -> seconds map, returning {} on any problem.
 */
export const readVideoProgressMap = (): VideoProgressMap => {
  try {
    const saved = localStorage.getItem(VIDEO_PROGRESS_STORAGE_KEY);
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
    clearCorruptedProgress();
    return {};
  }
};

/**
 * Saved playback position for a video, in whole seconds (0 when unknown).
 */
export const getVideoProgress = (videoId: string): number => {
  if (!videoId) {
    console.warn('[Debug] Invalid video ID provided to getVideoProgress');
    return 0;
  }

  const savedTime = readVideoProgressMap()[videoId] || 0;
  return Math.max(0, Math.floor(savedTime));
};

/**
 * Stores the playback position for a video, pruning the oldest entries once
 * the store grows past MAX_TRACKED_VIDEOS.
 */
export const setVideoProgress = (videoId: string, seconds: number): void => {
  if (!videoId) {
    console.warn('[Debug] Invalid video ID provided to setVideoProgress');
    return;
  }

  try {
    let progress = readVideoProgressMap();
    progress[videoId] = Math.max(0, Math.floor(seconds));

    const entries = Object.entries(progress);
    if (entries.length > MAX_TRACKED_VIDEOS) {
      progress = Object.fromEntries(entries.slice(-MAX_TRACKED_VIDEOS));
    }

    localStorage.setItem(VIDEO_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    debugLog(
      `[Debug] Saved progress for video ${videoId}: ${progress[videoId]} seconds`
    );
  } catch (error) {
    console.warn('[Debug] Failed to save video progress:', error);
    clearCorruptedProgress();
  }
};
