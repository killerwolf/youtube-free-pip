import { debugLog } from './debugLog';
import type { PlaybackSample } from './watchTracking';

declare global {
  namespace YT {
    interface Player {
      getCurrentTime(): number;
      getDuration(): number;
      getPlayerState(): number;
      destroy(): void;
    }
  }

  interface Window {
    YT: {
      Player: new (
        _elementId: string | HTMLElement,
        _config: {
          videoId: string;
          playerVars?: {
            autoplay?: 0 | 1;
            rel?: 0 | 1;
            start?: number;
          };
          events?: {
            onReady?: (event: { target: YT.Player }) => void;
            onStateChange?: (event: {
              target: YT.Player;
              data: number;
            }) => void;
          };
        }
      ) => YT.Player;
      PlayerState: {
        ENDED: number;
        PAUSED: number;
        UNSTARTED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

const IFRAME_API_SRC = 'https://www.youtube.com/iframe_api';
const SAMPLE_INTERVAL = 5000; // how often a playing video reports its position
const READY_POLL_INTERVAL = 100;
const READY_POLL_ATTEMPTS = 50; // 5 seconds before giving up on the player

/** What the player tells us about. */
export type PlayerEvent = 'tick' | 'pause' | 'ended';

export interface PlayerHandle {
  /** Registers a listener. Safe to call before the player finishes loading. */
  on(event: PlayerEvent, listener: (sample: PlaybackSample) => void): void;
  /** Tears down the player and every timer behind it. Safe to call twice. */
  destroy(): void;
}

/**
 * The player reports -1 / UNSTARTED and a zero duration for a while after it
 * is created; reading a position before then yields numbers that mean nothing.
 */
const isPlayerReady = (player: YT.Player): boolean => {
  try {
    const state = player.getPlayerState();
    return (
      state !== -1 &&
      state !== window.YT.PlayerState.UNSTARTED &&
      player.getDuration() > 0
    );
  } catch (error) {
    console.warn('[Debug] Error checking player ready state:', error);
    return false;
  }
};

// Once per page, not once per player: switching video before the script
// resolves would otherwise inject a second copy of it.
let iframeApiRequested = false;

const loadIframeApi = () => {
  if (window.YT || iframeApiRequested) return;
  iframeApiRequested = true;

  debugLog('[Debug] YouTube IFrame API not found, loading script...');
  const tag = document.createElement('script');
  tag.src = IFRAME_API_SRC;
  tag.onerror = (e) =>
    console.error('[Debug] Error loading YouTube IFrame API:', e);
  tag.onload = () => debugLog('[Debug] YouTube IFrame API script loaded');

  const firstScriptTag = document.getElementsByTagName('script')[0];
  if (firstScriptTag?.parentNode) {
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    debugLog('[Debug] YouTube IFrame API script injected into DOM');
  } else {
    document.head.appendChild(tag);
  }
};

/**
 * Puts a YouTube player in `element` and reports where playback has got to.
 *
 * Everything provider-shaped lives here — loading the IFrame API, waiting for
 * the player to answer, and the timers that sample it — so callers deal only
 * in positions and durations.
 */
export const mountYouTubePlayer = (
  element: HTMLElement,
  { videoId, startSeconds }: { videoId: string; startSeconds: number }
): PlayerHandle => {
  const listeners: Record<PlayerEvent, ((sample: PlaybackSample) => void)[]> = {
    tick: [],
    pause: [],
    ended: [],
  };

  let player: YT.Player | null = null;
  let sampleInterval: number | undefined;
  let readyInterval: number | undefined;
  let destroyed = false;

  const emit = (event: PlayerEvent, source: YT.Player) => {
    const sample: PlaybackSample = {
      position: source.getCurrentTime(),
      duration: source.getDuration(),
    };
    for (const listener of listeners[event]) {
      listener(sample);
    }
  };

  const stopReadyPolling = () => {
    if (readyInterval !== undefined) {
      window.clearInterval(readyInterval);
      readyInterval = undefined;
    }
  };

  const stopSampling = () => {
    if (sampleInterval !== undefined) {
      window.clearInterval(sampleInterval);
      sampleInterval = undefined;
    }
  };

  const startSampling = (source: YT.Player) => {
    sampleInterval = window.setInterval(() => {
      try {
        if (isPlayerReady(source)) emit('tick', source);
      } catch (error) {
        console.warn(`[Debug] Error sampling video ${videoId}:`, error);
      }
    }, SAMPLE_INTERVAL);
  };

  // Polled rather than driven by onReady: the ready event fires before the
  // player will answer getDuration(), so sampling started there reads zeroes.
  const whenReady = (source: YT.Player, run: () => void) => {
    let attempts = 0;
    readyInterval = window.setInterval(() => {
      try {
        if (isPlayerReady(source)) {
          stopReadyPolling();
          debugLog(`[Debug] Player ready for video ${videoId}`);
          run();
          return;
        }
        attempts++;
        if (attempts >= READY_POLL_ATTEMPTS) {
          stopReadyPolling();
          console.error(
            `[Debug] Player failed to become ready for video ${videoId}`
          );
        }
      } catch (error) {
        stopReadyPolling();
        console.error(`[Debug] Error waiting on video ${videoId}:`, error);
      }
    }, READY_POLL_INTERVAL);
  };

  const create = () => {
    if (destroyed) return;

    debugLog(
      `[Debug] Initializing player for video ${videoId} at ${startSeconds}s`
    );
    try {
      player = new window.YT.Player(element, {
        videoId,
        playerVars: { autoplay: 1, rel: 0, start: Math.floor(startSeconds) },
        events: {
          onReady: (event) => {
            if (destroyed) return;
            whenReady(event.target, () => startSampling(event.target));
          },
          onStateChange: (event) => {
            if (destroyed) return;
            try {
              if (!isPlayerReady(event.target)) return;
              if (event.data === window.YT.PlayerState.ENDED) {
                emit('ended', event.target);
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                emit('pause', event.target);
              }
            } catch (error) {
              console.warn(`[Debug] Error on video ${videoId} state:`, error);
            }
          },
        },
      });
    } catch (error) {
      console.error(`[Debug] Error initializing video ${videoId}:`, error);
    }
  };

  loadIframeApi();
  if (window.YT) {
    create();
  } else {
    debugLog('[Debug] Waiting for YouTube API to load...');
    window.onYouTubeIframeAPIReady = create;
  }

  return {
    on: (event, listener) => {
      listeners[event].push(listener);
    },
    destroy: () => {
      destroyed = true;
      stopReadyPolling();
      stopSampling();
      if (player) {
        try {
          player.destroy();
        } catch (error) {
          console.error(`[Debug] Error destroying video ${videoId}:`, error);
        }
        player = null;
      }
    },
  };
};
