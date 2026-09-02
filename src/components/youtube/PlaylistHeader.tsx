import { Check, Share2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { buildShareLink } from '../../utils/playlistEntry';
import { getVideoProgress } from '../../utils/videoProgress';
import { extractPlaylistId, formatDuration } from '../../utils/youtube';
import { usePlaylist } from './PlaylistContext';

// Copies text without the async Clipboard API, for browsers that don't expose
// it (or block it outside a secure context).
const copyWithFallback = (text: string) => {
  const tempInput = document.createElement('input');
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
};

export function PlaylistHeader() {
  const {
    playlistTitle,
    playlistAuthor,
    videos,
    watchedVideos,
    clearPlaylist,
    playlistUrl,
    currentVideo,
  } = usePlaylist();

  const [copied, setCopied] = useState(false);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the current playlist?')) {
      clearPlaylist();
    }
  };

  const handleShare = async () => {
    if (!playlistUrl) {
      toast.error('No playlist to share');
      return;
    }

    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      toast.error('Unable to extract playlist ID');
      return;
    }

    // When a video is playing, the link carries it along with the position the
    // player last checkpointed (every 5s, plus on pause/end) so that opening it
    // elsewhere picks playback back up there instead of at the playlist top.
    const startSeconds = currentVideo ? getVideoProgress(currentVideo.id) : 0;
    const shareUrl = buildShareLink(playlistId, {
      videoId: currentVideo?.id,
      startSeconds,
    });

    const shareLabel = currentVideo
      ? startSeconds > 0
        ? `Link copied — resumes at ${formatDuration(startSeconds)}`
        : 'Link copied — opens on this video'
      : 'Playlist URL copied to clipboard!';

    // On mobile this opens the native share sheet (WhatsApp, Messages, ...),
    // which is the whole point of the feature; elsewhere it doesn't exist and
    // we fall back to putting the link on the clipboard.
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentVideo?.title || playlistTitle,
          text: currentVideo
            ? `${currentVideo.title} — ${playlistTitle}`
            : playlistTitle,
          url: shareUrl,
        });
        return;
      } catch (error) {
        // AbortError just means the user dismissed the sheet — don't then
        // silently copy something they chose not to share.
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.warn('Web Share API failed, falling back to clipboard:', error);
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      console.warn('Clipboard API not available:', error);
      copyWithFallback(shareUrl);
    }

    setCopied(true);
    toast.success(shareLabel, {
      duration: 3000,
      position: 'bottom-center',
    });

    // Reset copied state after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
      <div className="flex-1 min-w-0 mr-4">
        <h1
          className="text-lg font-semibold truncate text-white"
          title={playlistTitle}
        >
          {playlistTitle}
        </h1>
        <div className="flex items-center text-sm text-gray-400 mt-1">
          <span className="truncate" title={playlistAuthor}>
            {playlistAuthor}
          </span>
          <span className="mx-2">•</span>
          <span>
            {watchedVideos.size}/{videos.length} watched
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-2">
        {/* Share button */}
        {playlistUrl && (
          <button
            type="button"
            onClick={handleShare}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-full transition-colors"
            title={
              currentVideo
                ? 'Share this video at the current time'
                : 'Share playlist'
            }
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Share2 className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Clear button */}
        <button
          type="button"
          onClick={handleClear}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-full transition-colors"
          title="Clear playlist"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
