import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { debugLog } from '../../utils/debugLog';
import { getVideoProgress, setVideoProgress } from '../../utils/videoProgress';
import {
  advance,
  initialWatchState,
  type PlaybackSample,
  type WatchState,
} from '../../utils/watchTracking';
import {
  mountYouTubePlayer,
  type PlayerHandle,
} from '../../utils/youtubePlayer';
import { usePlaylist } from './PlaylistContext';

export const VideoPlayer = () => {
  const { currentVideo, markVideoAsWatched } = usePlaylist();
  const playerElementRef = useRef<HTMLDivElement>(null);

  // PlaylistContext hands back a fresh markVideoAsWatched on every render, so
  // it cannot go in the dependency list below — the player would be torn down
  // and rebuilt constantly. This keeps the effect pointed at the latest one.
  const markVideoAsWatchedRef = useRef(markVideoAsWatched);
  useEffect(() => {
    markVideoAsWatchedRef.current = markVideoAsWatched;
  });

  const videoId = currentVideo?.id;
  const hasVideo = Boolean(videoId);

  // The player now outlives a single selection, so the effect that mounts it
  // must not re-run when the video changes — it reads the current id through
  // this instead.
  const videoIdRef = useRef(videoId);
  useEffect(() => {
    videoIdRef.current = videoId;
  });

  // One player for as long as something is playing, rather than one per video.
  // Rebuilding it per video costs a tap on iPhone: a brand-new iframe has
  // never been played by the user, so WebKit refuses to start it on its own
  // and waits for a tap on YouTube's play button. Keeping the same player
  // keeps the activation the first play earned, so later videos start on the
  // single tap that picked them from the list.
  const playerRef = useRef<PlayerHandle | null>(null);

  useEffect(() => {
    const element = playerElementRef.current;
    const startingVideoId = videoIdRef.current;
    if (!hasVideo || !element || !startingVideoId) return;

    // Which video the state below describes. A selection starts from a clean
    // slate, so a video can never inherit the previous one's "already marked
    // as watched".
    let watch: { videoId: string; state: WatchState } = {
      videoId: startingVideoId,
      state: initialWatchState,
    };

    const handleSample = (sample: PlaybackSample, sampleVideoId: string) => {
      // Samples carry the video the player actually had loaded, so one landing
      // mid-switch cannot write the outgoing video's position onto the
      // incoming one.
      if (sampleVideoId !== watch.videoId) {
        watch = { videoId: sampleVideoId, state: initialWatchState };
      }

      const decision = advance(watch.state, sample);
      watch = { videoId: sampleVideoId, state: decision.state };

      if (decision.progressToSave !== undefined) {
        setVideoProgress(sampleVideoId, decision.progressToSave);
      }

      if (decision.markWatched) {
        debugLog(
          `[Debug] Auto-marking video ${sampleVideoId} as watched at ${decision.markWatched.percentComplete}%`
        );
        markVideoAsWatchedRef.current(sampleVideoId);
        toast.success(
          `Video marked as watched (${decision.markWatched.percentComplete}% complete)`
        );
      }
    };

    const player = mountYouTubePlayer(element, {
      videoId: startingVideoId,
      startSeconds: getVideoProgress(startingVideoId),
    });
    playerRef.current = player;
    player.on('tick', handleSample);
    player.on('pause', handleSample);
    player.on('ended', handleSample);

    return () => {
      playerRef.current = null;
      player.destroy();
    };
  }, [hasVideo]);

  // Picking another video reuses the player mounted above. load() ignores the
  // video already loaded, so the selection that mounted the player does not
  // restart it here.
  useEffect(() => {
    if (!videoId) return;
    playerRef.current?.load(videoId, getVideoProgress(videoId));
  }, [videoId]);

  if (!currentVideo) {
    return null;
  }

  return (
    <div className="w-full h-full bg-black">
      <div ref={playerElementRef} className="w-full h-full" />
    </div>
  );
};
