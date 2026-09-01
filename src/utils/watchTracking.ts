/**
 * When a video counts as watched, and what is worth persisting as it plays.
 *
 * Pure on purpose: it takes numbers and returns decisions, so the policy can
 * be exercised without a player, a DOM or a timer. Deciding *when* to ask is
 * the caller's job; deciding *what* the answer is, is this module's.
 */

// The window at the end of a video within which it counts as watched: a share
// of the running time, floored at 30s so a short video isn't marked on its
// first frames, and capped at 2 minutes so a long one isn't marked early.
const MIN_WATCH_THRESHOLD = 30;
const MAX_WATCH_THRESHOLD = 120;
const WATCH_THRESHOLD_RATIO = 0.1;

// Only ever asked about a duration advance() has already found valid.
const watchThresholdFor = (duration: number): number => {
  if (duration < 300) return MIN_WATCH_THRESHOLD;

  return Math.min(
    Math.max(Math.floor(duration * WATCH_THRESHOLD_RATIO), MIN_WATCH_THRESHOLD),
    MAX_WATCH_THRESHOLD
  );
};

export interface WatchState {
  readonly hasMarkedWatched: boolean;
}

export const initialWatchState: WatchState = { hasMarkedWatched: false };

export interface PlaybackSample {
  /** Playback position in seconds. */
  position: number;
  /** Total length of the video in seconds. */
  duration: number;
}

export interface WatchDecision {
  /** The state to carry into the next sample. */
  state: WatchState;
  /** Position to persist, in whole seconds. Absent when nothing is worth saving. */
  progressToSave?: number;
  /** Present exactly once, on the sample that first counts as watched. */
  markWatched?: { percentComplete: number };
}

/**
 * Reads one playback sample and says what should follow from it.
 */
export const advance = (
  state: WatchState,
  sample: PlaybackSample
): WatchDecision => {
  const position = Math.max(0, Math.floor(sample.position));
  const duration = Math.max(0, Math.floor(sample.duration));

  // Nothing has played yet, the player hasn't reported a length yet, or the
  // two disagree: no sample worth acting on.
  if (position <= 0 || duration <= 0 || position > duration) {
    return { state };
  }

  const remaining = duration - position;
  if (state.hasMarkedWatched || remaining > watchThresholdFor(duration)) {
    return { state, progressToSave: position };
  }

  return {
    state: { hasMarkedWatched: true },
    progressToSave: position,
    markWatched: {
      percentComplete: Math.floor((position / duration) * 100),
    },
  };
};
