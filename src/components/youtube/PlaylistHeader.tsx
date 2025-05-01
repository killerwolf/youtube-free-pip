import { X } from 'lucide-react';
import { usePlaylist } from './PlaylistContext';

export function PlaylistHeader() {
  const {
    playlistTitle,
    playlistAuthor,
    videos,
    watchedVideos,
    clearPlaylist,
  } = usePlaylist();

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the current playlist?')) {
      clearPlaylist();
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
      <button
        type="button"
        onClick={handleClear}
        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-full transition-colors"
        title="Clear playlist"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
