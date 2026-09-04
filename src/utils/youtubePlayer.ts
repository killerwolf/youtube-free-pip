import { debugLog } from './debugLog';
import type { PlaybackSample } from './watchTracking';

declare global {
  namespace YT {
    interface Player {
      getCurrentTime(): number;
      getDuration(): number;
      getPlayerState(): number;
      /**
       * What the player actually has loaded, which is not always what it was
       * last asked for: a sample taken mid-switch still reports the outgoing
       * video. Optional because it is not in the published IFrame API surface.
       */
      getVideoData?(): { video_id?: string } | undefined;
      loadVideoById(_options: { videoId: string; startSeconds?: number }): void;
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
            playsinline?: 0 | 1;
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

/**
 * A sample, and the video the player had loaded when it was taken. The second
 * argument is what lets a caller drop a sample that belongs to the video it
 * has just switched away from.
 */
export type PlayerListener = (sample: PlaybackSample, videoId: string) => void;

export interface PlayerHandle {
  /** Registers a listener. Safe to call before the player finishes loading. */
  on(event: PlayerEvent, listener: PlayerListener): void;
  /**
   * Points the running player at another video, keeping the iframe alive.
   *
   * Tearing the player down per video costs a tap on iOS: a freshly created
   * iframe has never been played by the user, so WebKit refuses to start it
   * on its own and waits for a tap on YouTube's play button. Reusing the
   * player keeps the activation the first play earned, which is the whole
   * point of this method. A no-op when the video asked for is already loaded.
   */
  load(videoId: string, startSeconds: number): void;
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
  const listeners: Record<PlayerEvent, PlayerListener[]> = {
    tick: [],
    pause: [],
    ended: [],
  };

  let player: YT.Player | null = null;
  let sampleInterval: number | undefined;
  let readyInterval: number | undefined;
  let destroyed = false;

  // What the player has been asked for, which load() moves and create() reads.
  // A load() arriving before the IFrame API has answered is not lost: it just
  // changes what the player is built with.
  let requestedVideoId = videoId;
  let requestedStart = startSeconds;

  /**
   * Prefers what the player reports over what it was last asked for, so a
   * sample taken while a switch is in flight is attributed to the video it
   * actually came from rather than to the incoming one.
   */
  const loadedVideoId = (source: YT.Player): string => {
    try {
      return source.getVideoData?.()?.video_id || requestedVideoId;
    } catch (error) {
      console.warn('[Debug] Error reading loaded video id:', error);
      return requestedVideoId;
    }
  };

  const emit = (event: PlayerEvent, source: YT.Player) => {
    const sample: PlaybackSample = {
      position: source.getCurrentTime(),
      duration: source.getDuration(),
    };
    const sampleVideoId = loadedVideoId(source);
    for (const listener of listeners[event]) {
      listener(sample, sampleVideoId);
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
        console.warn(
          `[Debug] Error sampling video ${requestedVideoId}:`,
          error
        );
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
          debugLog(`[Debug] Player ready for video ${requestedVideoId}`);
          run();
          return;
        }
        attempts++;
        if (attempts >= READY_POLL_ATTEMPTS) {
          stopReadyPolling();
          console.error(
            `[Debug] Player failed to become ready for video ${requestedVideoId}`
          );
        }
      } catch (error) {
        stopReadyPolling();
        console.error(
          `[Debug] Error waiting on video ${requestedVideoId}:`,
          error
        );
      }
    }, READY_POLL_INTERVAL);
  };

  const create = () => {
    if (destroyed) return;

    debugLog(
      `[Debug] Initializing player for video ${requestedVideoId} at ${requestedStart}s`
    );
    try {
      player = new window.YT.Player(element, {
        videoId: requestedVideoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          // Pinned rather than left to the API's default: on iPhone this is
          // what hands playback to the native fullscreen player, which is
          // where the Picture-in-Picture control lives.
          playsinline: 0,
          start: Math.floor(requestedStart),
        },
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
              console.warn(
                `[Debug] Error on video ${requestedVideoId} state:`,
                error
              );
            }
          },
        },
      });
    } catch (error) {
      console.error(
        `[Debug] Error initializing video ${requestedVideoId}:`,
        error
      );
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
    load: (nextVideoId, nextStartSeconds) => {
      if (destroyed || nextVideoId === requestedVideoId) return;

      requestedVideoId = nextVideoId;
      requestedStart = nextStartSeconds;

      // Still waiting on the IFrame API: create() will build the player with
      // what was last asked for, so there is nothing to switch yet.
      if (!player) return;

      debugLog(
        `[Debug] Switching player to video ${nextVideoId} at ${nextStartSeconds}s`
      );
      try {
        player.loadVideoById({
          videoId: nextVideoId,
          startSeconds: Math.floor(nextStartSeconds),
        });
      } catch (error) {
        console.error(
          `[Debug] Error switching to video ${nextVideoId}:`,
          error
        );
      }
    },
    destroy: () => {
      destroyed = true;
      stopReadyPolling();
      stopSampling();
      if (player) {
        try {
          player.destroy();
        } catch (error) {
          console.error(
            `[Debug] Error destroying video ${requestedVideoId}:`,
            error
          );
        }
        player = null;
      }
    },
  };
};
