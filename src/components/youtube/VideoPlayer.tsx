import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { getVideoProgress, setVideoProgress } from '../../utils/videoProgress';
import {
  advance,
  initialWatchState,
  type PlaybackSample,
} from '../../utils/watchTracking';
import { mountYouTubePlayer } from '../../utils/youtubePlayer';
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

  useEffect(() => {
    const element = playerElementRef.current;
    if (!element || !videoId) return;

    // Per video, and only reachable from this effect: switching video runs the
    // effect again and starts from a clean slate, so a video can never inherit
    // the previous one's "already marked as watched".
    let watch = initialWatchState;

    const record = (sample: PlaybackSample) => {
      const decision = advance(watch, sample);
      watch = decision.state;

      if (decision.progressToSave !== undefined) {
        setVideoProgress(videoId, decision.progressToSave);
      }

      if (decision.markWatched) {
        markVideoAsWatchedRef.current(videoId);
        toast.success(
          `Video marked as watched (${decision.markWatched.percentComplete}% complete)`
        );
      }
    };

    const player = mountYouTubePlayer(element, {
      videoId,
      startSeconds: getVideoProgress(videoId),
    });
    player.on('tick', record);
    player.on('pause', record);
    player.on('ended', record);

    return () => player.destroy();
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
