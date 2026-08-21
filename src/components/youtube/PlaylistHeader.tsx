import { Check, Share2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  extractPlaylistId,
  generatePlaylistShareUrl,
} from '../../utils/youtube';
import { usePlaylist } from './PlaylistContext';

export function PlaylistHeader() {
  const {
    playlistTitle,
    playlistAuthor,
    videos,
    watchedVideos,
    clearPlaylist,
    playlistUrl,
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

    // Generate shareable URL (using query parameter format for better compatibility)
    const shareUrl = generatePlaylistShareUrl(playlistId);

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Playlist URL copied to clipboard!', {
        duration: 3000,
        position: 'bottom-center',
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      console.warn('Clipboard API not available:', error);

      // Create a temporary input to copy the text
      const tempInput = document.createElement('input');
      tempInput.value = shareUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);

      setCopied(true);
      toast.success('Playlist URL copied to clipboard!', {
        duration: 3000,
        position: 'bottom-center',
      });

      setTimeout(() => setCopied(false), 2000);
    }
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
            title="Share playlist"
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
