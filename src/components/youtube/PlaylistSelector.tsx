import { useEffect, useRef } from 'react';
import { useDebug } from '../DebugConsole';
import { useAuth } from '../auth/AuthContext';
import { GoogleAuthButton } from '../auth/GoogleAuthButton';
import { useYouTube } from './YouTubeContext';

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
    hasMoreItems,
    loadMore,
  } = useYouTube();
  const { addLog } = useDebug();

  // Use ref to track initial load
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !loading && !error && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadPlaylists().catch((err: Error) => {
        addLog(`Failed to load playlists: ${err.message}`, 'error', 'YouTube');
      });
    }
  }, [isAuthenticated, loading, error, loadPlaylists, addLog]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold">Access Your YouTube Playlists</h2>
        <p className="text-gray-600 text-center mb-4">
          Sign in with your Google account to view and play videos from your
          playlists
        </p>
        <GoogleAuthButton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Error Loading Content</h3>
        </div>
        <div className="text-red-600 mb-4">
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (loading && !playlistItems.length) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Loading Content</h3>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          <p className="text-gray-600">Loading your content...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {selectedPlaylist ? (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => selectPlaylist(null)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Back
            </button>
            <h2 className="text-lg font-semibold">
              {selectedPlaylist.snippet.title}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {playlistItems.map((item) => {
              // Skip deleted videos
              if (
                !item.snippet.thumbnails ||
                Object.keys(item.snippet.thumbnails).length === 0
              ) {
                return null;
              }

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => onVideoSelect(item.snippet.resourceId.videoId)}
                  className="group aspect-video relative rounded-lg overflow-hidden hover:ring-2 hover:ring-red-500 focus:ring-2 focus:ring-red-500"
                >
                  <img
                    src={
                      item.snippet.thumbnails.medium?.url ||
                      item.snippet.thumbnails.default?.url
                    }
                    alt={item.snippet.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity" />
                  <div className="absolute inset-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-sm font-medium line-clamp-2">
                      {item.snippet.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Playlists</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {playlists.map((playlist) => (
              <button
                type="button"
                key={playlist.id}
                onClick={() => selectPlaylist(playlist)}
                className="group aspect-video relative rounded-lg overflow-hidden hover:ring-2 hover:ring-red-500 focus:ring-2 focus:ring-red-500"
              >
                <img
                  src={
                    playlist.snippet.thumbnails.medium?.url ||
                    playlist.snippet.thumbnails.default.url
                  }
                  alt={playlist.snippet.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-60 transition-opacity">
                  <div className="absolute inset-0 p-3 text-white">
                    <p className="font-medium line-clamp-2">
                      {playlist.snippet.title}
                    </p>
                    <p className="text-sm mt-1 opacity-80">
                      {playlist.contentDetails.itemCount} videos
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasMoreItems && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={loadMore}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Show more'}
          </button>
        </div>
      )}
    </div>
  );
}
