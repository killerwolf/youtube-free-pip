import { useEffect, useRef } from 'react';
import { useYouTube } from './YouTubeContext';
import { useAuth } from '../auth/AuthContext';
import { GoogleAuthButton } from '../auth/GoogleAuthButton';

interface PlaylistSelectorProps {
  onVideoSelect: (videoId: string) => void;
}

export function PlaylistSelector({ onVideoSelect }: PlaylistSelectorProps) {
  const { isAuthenticated, logout } = useAuth();
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
    retryLoading,
  } = useYouTube();

  // Use ref to track initial load
  const initialLoadDone = useRef(false);

  useEffect(() => {
    // Only load playlists once when authenticated and not already loaded
    if (isAuthenticated && !loading && !error && playlists.length === 0 && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadPlaylists();
    }
  }, [isAuthenticated]); // Only depend on isAuthenticated to prevent re-runs

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
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Error Loading Playlists</h3>
          <button
            onClick={logout}
            className="text-sm text-gray-600 hover:text-red-600"
          >
            Sign Out
          </button>
        </div>
        <div className="text-red-600 mb-4">
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={retryLoading}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          disabled={loading}
        >
          {loading ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }

  if (loading && playlists.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Loading Playlists</h3>
          <button
            onClick={logout}
            className="text-sm text-gray-600 hover:text-red-600"
          >
            Sign Out
          </button>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          <p className="text-gray-600">Loading your playlists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedPlaylist ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => selectPlaylist(null)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
              <h2 className="text-xl font-semibold">{selectedPlaylist.snippet.title}</h2>
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-red-600"
            >
              Sign Out
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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Playlists</h2>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-red-600"
            >
              Sign Out
            </button>
          </div>
          {playlists.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-600">No playlists found</p>
            </div>
          ) : (
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
          )}

          {hasMorePlaylists && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMorePlaylists}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}