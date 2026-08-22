import { useEffect, useRef } from 'react';
import { debugLog } from '../../utils/debugLog';
import { getVideoProgress, setVideoProgress } from '../../utils/videoProgress';
import { usePlaylist } from './PlaylistContext';

declare global {
  namespace YT {
    interface Player {
      getCurrentTime(): number;
      getDuration(): number;
      loadVideoById(options: { videoId: string; startSeconds?: number }): void;
      getPlayerState(): number;
      playVideo(): void;
      pauseVideo(): void;
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
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
        UNSTARTED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

const PROGRESS_SAVE_INTERVAL = 5000; // Save progress every 5 seconds
const MIN_WATCH_THRESHOLD = 30; // Minimum 30 seconds from end to mark as watched
const MAX_WATCH_THRESHOLD = 120; // Maximum 2 minutes from end to mark as watched
const WATCH_THRESHOLD_RATIO = 0.1; // 10% of video length

// Calculate dynamic watch threshold based on video length
const calculateWatchThreshold = (duration: number): number => {
  if (duration <= 0) return MAX_WATCH_THRESHOLD;

  // For very short videos (< 5 minutes), use minimum threshold
  if (duration < 300) return MIN_WATCH_THRESHOLD;

  // Calculate threshold as percentage of duration, bounded by min/max
  const threshold = Math.floor(duration * WATCH_THRESHOLD_RATIO);
  return Math.min(
    Math.max(threshold, MIN_WATCH_THRESHOLD),
    MAX_WATCH_THRESHOLD
  );
};

// Add this helper function at the top level
const isPlayerReady = (player: YT.Player): boolean => {
  try {
    // Check if the player is in a valid state
    const state = player.getPlayerState();
    const duration = player.getDuration();
    return (
      state !== -1 && state !== window.YT.PlayerState.UNSTARTED && duration > 0
    );
  } catch (error) {
    console.warn('[Debug] Error checking player ready state:', error);
    return false;
  }
};

export const VideoPlayer = () => {
  const { currentVideo, markVideoAsWatched } = usePlaylist();

  const playerRef = useRef<YT.Player | null>(null);
  const playerElementRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number>();
  const hasAutoMarkedAsWatched = useRef<boolean>(false);
  const lastProgressUpdate = useRef<{ timestamp: number; duration: number }>({
    timestamp: 0,
    duration: 0,
  });
  const isInitializing = useRef<boolean>(false);
  const readyCheckIntervalRef = useRef<number>();

  // Check if video should be marked as watched
  const checkAndMarkAsWatched = (timestamp: number, duration: number) => {
    if (
      hasAutoMarkedAsWatched.current ||
      !currentVideo ||
      duration <= 0 ||
      timestamp <= 0
    ) {
      return;
    }

    const threshold = calculateWatchThreshold(duration);
    const remainingTime = duration - timestamp;
    const progress = (timestamp / duration) * 100;

    debugLog(
      `[Debug] Watch status check for ${currentVideo.id}:`,
      `\n- Current time: ${timestamp.toFixed(1)}s`,
      `\n- Duration: ${duration.toFixed(1)}s`,
      `\n- Progress: ${progress.toFixed(1)}%`,
      `\n- Remaining: ${remainingTime.toFixed(1)}s`,
      `\n- Threshold: ${threshold}s`
    );

    if (remainingTime <= threshold) {
      debugLog(
        '[Debug] Auto-marking video as watched:',
        `\n- Video ID: ${currentVideo.id}`,
        `\n- Title: ${currentVideo.title}`,
        `\n- Remaining time (${remainingTime.toFixed(
          1
        )}s) is less than threshold (${threshold}s)`
      );

      markVideoAsWatched(currentVideo.id);
      hasAutoMarkedAsWatched.current = true;

      // Show visual feedback
      const notification = document.createElement('div');
      notification.textContent = `Video marked as watched (${Math.floor(
        progress
      )}% complete)`;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 9999;
        animation: fadeOut 2s forwards;
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
    } else {
      debugLog(
        '[Debug] Not marking as watched yet:',
        `\n- Remaining time (${remainingTime.toFixed(
          1
        )}s) is more than threshold (${threshold}s)`
      );
    }
  };

  // Add CSS animation to head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeOut {
        0% { opacity: 1; transform: translateY(0); }
        70% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Reset auto-watch flag and last progress when video changes
  useEffect(() => {
    hasAutoMarkedAsWatched.current = false;
    lastProgressUpdate.current = { timestamp: 0, duration: 0 };
  }, []); // Remove dependency

  // Load YouTube IFrame API
  useEffect(() => {
    debugLog('[Debug] useEffect for YouTube API loading triggered');
    if (!window.YT) {
      debugLog('[Debug] YouTube IFrame API not found, loading script...');
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = (e) =>
        console.error('[Debug] Error loading YouTube IFrame API:', e);
      tag.onload = () => debugLog('[Debug] YouTube IFrame API script loaded');
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag?.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        debugLog('[Debug] YouTube IFrame API script injected into DOM');
      } else {
        console.error('[Debug] Could not find parent node to inject script');
      }
    }
  }, []); // This effect only runs once to load the API

  // Initialize player when API is ready and video changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: initializePlayer is redefined every render (not memoized); adding it here would re-init the player on every render instead of only on video changes
  useEffect(() => {
    const videoId = currentVideo?.id;
    if (!videoId) return;

    // Ensure the player element exists
    if (!playerElementRef.current) {
      console.warn(
        '[Debug] Player element ref not found during initialization'
      );
      return;
    }

    // Destroy existing player instance before creating a new one
    if (playerRef.current) {
      debugLog('[Debug] Destroying existing player instance');
      try {
        playerRef.current.destroy();
        playerRef.current = null; // Clear the ref
      } catch (error) {
        console.error('[Debug] Error destroying player instance:', error);
      }
    }

    if (window.YT) {
      debugLog('[Debug] Initializing player for video:', videoId);
      initializePlayer(videoId);
    } else {
      debugLog('[Debug] Waiting for YouTube API to load...');
      window.onYouTubeIframeAPIReady = () => {
        debugLog('[Debug] YouTube IFrame API ready, initializing player');
        // Check if the video ID is still the same and element exists
        if (currentVideo?.id === videoId && playerElementRef.current) {
          initializePlayer(videoId);
        } else {
          debugLog('[Debug] Video changed or element missing after API load');
        }
      };
    }

    return () => {
      debugLog('[Debug] Cleanup effect running for video change');
      // Clear intervals
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = undefined;
      }
      if (readyCheckIntervalRef.current) {
        window.clearInterval(readyCheckIntervalRef.current);
        readyCheckIntervalRef.current = undefined;
      }
      // Destroy player instance on cleanup
      if (playerRef.current) {
        debugLog('[Debug] Destroying player instance in cleanup');
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (error) {
          console.error(
            '[Debug] Error destroying player instance in cleanup:',
            error
          );
        }
      }
    };
  }, [currentVideo?.id]); // Only depends on the video ID for re-initialization

  // Function to start progress tracking
  const startProgressTracking = (player: YT.Player, videoId: string) => {
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = window.setInterval(() => {
      try {
        if (isPlayerReady(player)) {
          const currentTime = player.getCurrentTime();
          const videoDuration = player.getDuration();
          debugLog(
            `[Debug] Auto-saving progress for video ${videoId}:`,
            `\n- Time: ${Math.floor(currentTime)}/${Math.floor(
              videoDuration
            )} seconds`,
            `\n- Progress: ${((currentTime / videoDuration) * 100).toFixed(1)}%`
          );
          saveProgress(videoId, currentTime, videoDuration);
        }
      } catch (error) {
        console.warn(
          `[Debug] Error during progress tracking for video ${videoId}:`,
          error
        );
      }
    }, PROGRESS_SAVE_INTERVAL);
  };

  // Function to wait for player to be ready
  const waitForPlayerReady = (
    player: YT.Player,
    videoId: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      // Stored in a ref (rather than a local variable) so the effect's
      // cleanup can clear it if the video changes or the component unmounts
      // while this is still polling — otherwise it keeps ticking every
      // 100ms for up to 5s per abandoned video switch.
      readyCheckIntervalRef.current = window.setInterval(() => {
        try {
          if (isPlayerReady(player)) {
            window.clearInterval(readyCheckIntervalRef.current);
            readyCheckIntervalRef.current = undefined;
            const duration = player.getDuration();
            const currentTime = player.getCurrentTime();
            debugLog(
              `[Debug] Player ready for video ${videoId}:`,
              `\n- Duration: ${duration}s`,
              `\n- Current time: ${currentTime}s`
            );
            resolve();
          } else {
            attempts++;
            if (attempts >= 50) {
              // 5 seconds timeout
              window.clearInterval(readyCheckIntervalRef.current);
              readyCheckIntervalRef.current = undefined;
              reject(
                new Error(`Player failed to become ready for video ${videoId}`)
              );
            }
          }
        } catch (error) {
          window.clearInterval(readyCheckIntervalRef.current);
          readyCheckIntervalRef.current = undefined;
          reject(error);
        }
      }, 100);
    });
  };

  // Save progress to localStorage
  const saveProgress = (
    videoId: string,
    timestamp: number,
    duration: number
  ) => {
    // Input validation
    if (!videoId) {
      console.warn('[Debug] Invalid video ID provided to saveProgress');
      return;
    }

    // Validate player state and methods
    if (!playerRef.current?.getCurrentTime || !playerRef.current?.getDuration) {
      debugLog('[Debug] Cannot save progress: Player methods not available');
      return;
    }

    // Ensure we're working with valid numbers
    const intTimestamp = Math.max(0, Math.floor(timestamp));
    const intDuration = Math.max(0, Math.floor(duration));

    // Only save progress if we have valid data and there's actual progress
    if (intTimestamp <= 0 || intDuration <= 0 || intTimestamp > intDuration) {
      debugLog('[Debug] Invalid progress values, skipping save:', {
        timestamp,
        duration,
      });
      return;
    }

    setVideoProgress(videoId, intTimestamp);

    // Update last progress
    lastProgressUpdate.current = {
      timestamp: intTimestamp,
      duration: intDuration,
    };

    // Check watch status
    checkAndMarkAsWatched(intTimestamp, intDuration);
  };

  const initializePlayer = (videoId: string) => {
    if (!playerElementRef.current) {
      console.warn('[Debug] Player element ref not found');
      isInitializing.current = false;
      return;
    }

    const startTime = getVideoProgress(videoId);
    debugLog(
      `[Debug] Initializing player for video ${videoId} at ${startTime} seconds`
    );

    try {
      playerRef.current = new window.YT.Player(playerElementRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          start: Math.floor(startTime),
        },
        events: {
          onReady: (event) => {
            debugLog(`[Debug] Player ready event fired for video ${videoId}`);
            const player = event.target;

            // Wait for player to be ready
            waitForPlayerReady(player, videoId)
              .then(() => {
                startProgressTracking(player, videoId);
                isInitializing.current = false;
              })
              .catch((error) => {
                console.error('[Debug] Error in player ready wait:', error);
                isInitializing.current = false;
              });
          },
          onStateChange: (event) => {
            try {
              const player = event.target;
              const state = event.data;

              if (isPlayerReady(player)) {
                if (
                  state === window.YT.PlayerState.ENDED ||
                  state === window.YT.PlayerState.PAUSED
                ) {
                  const currentTime = player.getCurrentTime();
                  const duration = player.getDuration();
                  const progress = ((currentTime / duration) * 100).toFixed(1);
                  debugLog(
                    `[Debug] Saving progress for video ${videoId} on ${
                      state === window.YT.PlayerState.ENDED ? 'end' : 'pause'
                    }:`,
                    `\n- Time: ${Math.floor(currentTime)}/${Math.floor(
                      duration
                    )} seconds`,
                    `\n- Progress: ${progress}%`
                  );
                  saveProgress(videoId, currentTime, duration);
                }
              } else {
                debugLog(
                  `[Debug] Skipping progress save - player not ready on state change for video ${videoId}:`,
                  state
                );
              }
            } catch (error) {
              console.warn(
                `[Debug] Error in onStateChange handler for video ${videoId}:`,
                error
              );
            }
          },
        },
      });
    } catch (error) {
      console.error(
        `[Debug] Error initializing player for video ${videoId}:`,
        error
      );
      isInitializing.current = false;
    }
  };

  if (!currentVideo) {
    return null;
  }

  return (
    <div className="w-full h-full bg-black">
      <div ref={playerElementRef} className="w-full h-full" />
    </div>
  );
};
