import { useEffect } from 'react';
import { useYouTube } from './YouTubeContext';
import { useAuth } from '../auth/AuthContext';
import { GoogleAuthButton } from '../auth/GoogleAuthButton';

interface PlaylistSelectorProps {
  onVideoSelect: (videoId: string) => void;
}

export function PlaylistSelector({ onVideoSelect }: PlaylistSelectorProps) {
  const { isAuthenticated } = useAuth();
  const {
    playlists,
    selectedPlaylist,
    playlistItems,
    loading,
    error,
    loadPlaylists,
    selectPlaylist,
    hasMorePlaylists,
    loadMorePlaylists,
  } = useYouTube();

  useEffect(() => {
    if (isAuthenticated) {
      loadPlaylists();
    }
  }, [isAuthenticated, loadPlaylists]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold">Access Your YouTube Playlists</h2>
        <p className="text-gray-600 text-center mb-4">
          Sign in with your Google account to view and play videos from your playlists
        </p>
        <GoogleAuthButton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedPlaylist ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{selectedPlaylist.snippet.title}</h2>
            <button
              onClick={() => selectPlaylist(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back to Playlists
            </button>
          </div>
          <div className="space-y-2">
            {playlistItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onVideoSelect(item.snippet.resourceId.videoId)}
                className="w-full flex gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 w-32 aspect-video relative rounded overflow-hidden">
                  <img
                    src={
                      item.snippet.thumbnails.medium?.url ||
                      item.snippet.thumbnails.default.url
                    }
                    alt={item.snippet.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="flex-grow text-left">
                  <h3 className="font-medium line-clamp-2">{item.snippet.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Position: {item.snippet.position + 1}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold">Your Playlists</h2>
          <div className="grid grid-cols-1 gap-4">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => selectPlaylist(playlist)}
                className="flex gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-red-300 transition-all"
              >
                <div className="flex-shrink-0 w-32 aspect-video relative rounded overflow-hidden">
                  <img
                    src={
                      playlist.snippet.thumbnails.medium?.url ||
                      playlist.snippet.thumbnails.default.url
                    }
                    alt={playlist.snippet.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 px-1.5 py-0.5 rounded text-xs text-white">
                    {playlist.contentDetails.itemCount}
                  </div>
                </div>
                <div className="flex-grow text-left">
                  <h3 className="font-medium line-clamp-2">
                    {playlist.snippet.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {playlist.snippet.channelTitle}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
            </div>
          )}

          {hasMorePlaylists && !loading && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMorePlaylists}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}