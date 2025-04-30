import { useEffect, useRef } from 'react';
import { usePlaylist } from './PlaylistContext';

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          videoId: string;
          playerVars?: {
            autoplay?: 0 | 1;
            rel?: 0 | 1;
            start?: number;
          };
          events?: {
            onReady?: (event: { target: any }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => void;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

const PROGRESS_SAVE_INTERVAL = 5000; // Save progress every 5 seconds
const LOCAL_STORAGE_KEY = 'youtube-pip-video-progress';

interface VideoProgress {
  [videoId: string]: number; // videoId -> timestamp in seconds
}

export const VideoPlayer = () => {
  console.log('[Debug] VideoPlayer component mounted');

  const { currentVideo } = usePlaylist();
  console.log('[Debug] Current video:', currentVideo);

  const playerRef = useRef<any>(null);
  const playerElementRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number>();

  // Load saved progress from localStorage
  const getSavedProgress = (videoId: string): number => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const progress: VideoProgress = JSON.parse(saved);
        const savedTime = progress[videoId] || 0;
        console.log(`[Debug] Loading saved progress for video ${videoId}: ${savedTime} seconds`);
        return savedTime;
      }
    } catch (error) {
      console.warn('[Debug] Failed to load video progress:', error);
    }
    console.log(`[Debug] No saved progress found for video ${videoId}`);
    return 0;
  };

  // Save progress to localStorage
  const saveProgress = (videoId: string, timestamp: number) => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const progress: VideoProgress = saved ? JSON.parse(saved) : {};
      progress[videoId] = timestamp;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(progress));
      console.log(`[Debug] Saved progress for video ${videoId}: ${timestamp} seconds`);
    } catch (error) {
      console.warn('[Debug] Failed to save video progress:', error);
    }
  };

  // Load YouTube IFrame API
  useEffect(() => {
    console.log('[Debug] useEffect for YouTube API loading triggered');
    if (!window.YT) {
      console.log('[Debug] YouTube IFrame API not found, loading script...');
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = (e) => console.error('[Debug] Error loading YouTube IFrame API:', e);
      tag.onload = () => console.log('[Debug] YouTube IFrame API script loaded');
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag?.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        console.log('[Debug] YouTube IFrame API script injected into DOM');
      } else {
        console.error('[Debug] Could not find parent node to inject script');
      }

      // This code loads the IFrame Player API code asynchronously
      window.onYouTubeIframeAPIReady = () => {
        console.log('[Debug] YouTube IFrame API ready callback fired');
        if (currentVideo) {
          console.log('[Debug] Initializing player from API ready callback');
          initializePlayer(currentVideo.id);
        } else {
          console.log('[Debug] No current video available in API ready callback');
        }
      };
    } else {
      console.log('[Debug] YouTube IFrame API already loaded');
      if (currentVideo) {
        console.log('[Debug] Initializing player immediately');
        initializePlayer(currentVideo.id);
      }
    }

    return () => {
      console.log('[Debug] Cleanup effect running');
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Initialize or update player when video changes
  useEffect(() => {
    if (!currentVideo) {
      console.log('[Debug] No current video selected');
      return;
    }

    console.log(`[Debug] Video changed to: ${currentVideo.id}`);
    if (playerRef.current) {
      // If player exists, load new video
      const startTime = getSavedProgress(currentVideo.id);
      console.log(`[Debug] Loading video ${currentVideo.id} at ${startTime} seconds`);
      playerRef.current.loadVideoById({
        videoId: currentVideo.id,
        startSeconds: startTime
      });
    } else if (window.YT) {
      // If YT API is ready but player doesn't exist, create it
      console.log(`[Debug] Creating new player for video ${currentVideo.id}`);
      initializePlayer(currentVideo.id);
    }
  }, [currentVideo?.id]);

  const initializePlayer = (videoId: string) => {
    if (!playerElementRef.current) {
      console.warn('[Debug] Player element ref not found');
      return;
    }

    const startTime = getSavedProgress(videoId);
    console.log(`[Debug] Initializing player for video ${videoId} at ${startTime} seconds`);
    
    playerRef.current = new window.YT.Player(playerElementRef.current, {
      videoId,
      playerVars: {
        autoplay: 1,
        rel: 0,
        start: startTime
      },
      events: {
        onReady: (event) => {
          console.log('[Debug] Player ready event fired');
          // Start progress tracking
          if (progressIntervalRef.current) {
            window.clearInterval(progressIntervalRef.current);
          }
          progressIntervalRef.current = window.setInterval(() => {
            if (playerRef.current && currentVideo) {
              const currentTime = playerRef.current.getCurrentTime();
              console.log(`[Debug] Auto-saving progress: ${currentTime} seconds`);
              saveProgress(currentVideo.id, Math.floor(currentTime));
            }
          }, PROGRESS_SAVE_INTERVAL);
        },
        onStateChange: (event) => {
          // Save progress when video ends or is paused
          if (event.data === window.YT.PlayerState.ENDED || 
              event.data === window.YT.PlayerState.PAUSED) {
            if (currentVideo) {
              const currentTime = playerRef.current.getCurrentTime();
              console.log(`[Debug] Saving progress on ${event.data === window.YT.PlayerState.ENDED ? 'end' : 'pause'}: ${currentTime} seconds`);
              saveProgress(currentVideo.id, Math.floor(currentTime));
            }
          }
        }
      }
    });
  };

  if (!currentVideo) return null;

  return (
    <div className="w-full h-full bg-black">
      <div ref={playerElementRef} className="w-full h-full" />
    </div>
  );
};
