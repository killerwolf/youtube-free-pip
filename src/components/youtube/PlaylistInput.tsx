import { useState, useEffect, useRef } from 'react';
import { usePlaylist } from './PlaylistContext';
import { extractPlaylistId } from '../../utils/youtube';

export function PlaylistInput() {
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { setPlaylistUrl } = usePlaylist();
  const inputRef = useRef<HTMLInputElement>(null);
  const submitTimeoutRef = useRef<number>();

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (url: string) => {
    const playlistId = extractPlaylistId(url.trim());

    if (!playlistId) {
      setError('Invalid YouTube playlist URL');
      return;
    }

    setError(null);
    setPlaylistUrl(playlistId);
    setInputUrl('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setInputUrl(newUrl);
    setError(null);

    // Clear any existing timeout
    if (submitTimeoutRef.current) {
      window.clearTimeout(submitTimeoutRef.current);
    }

    // Auto-submit after a short delay if the URL looks valid
    if (
      newUrl.includes('youtube.com/playlist?list=') ||
      newUrl.includes('youtu.be/playlist?list=') ||
      (newUrl.includes('youtube.com/watch?') && newUrl.includes('list='))
    ) {
      submitTimeoutRef.current = window.setTimeout(() => {
        handleSubmit(newUrl);
      }, 500);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(inputUrl);
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleFormSubmit} className="space-y-2">
        <input
          ref={inputRef}
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          value={inputUrl}
          onChange={handleChange}
          placeholder="Paste YouTube playlist URL"
          className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md shadow-sm placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      </form>
    </div>
  );
}
