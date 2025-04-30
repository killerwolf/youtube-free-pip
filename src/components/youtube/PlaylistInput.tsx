import { useState } from 'react';
import { usePlaylist } from './PlaylistContext';
import { extractPlaylistId } from '../../utils/youtube';

export function PlaylistInput() {
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { setPlaylistUrl } = usePlaylist();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const playlistId = extractPlaylistId(inputUrl.trim());
    
    if (!playlistId) {
      setError('Invalid YouTube playlist URL');
      return;
    }

    setError(null);
    setPlaylistUrl(playlistId);
    setInputUrl('');
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="playlist-url"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Enter YouTube Playlist URL
          </label>
          <input
            id="playlist-url"
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="https://www.youtube.com/playlist?list=..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
        </div>
        <button
          type="submit"
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Load Playlist
        </button>
      </form>
    </div>
  );
} 