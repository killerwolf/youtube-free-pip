import { Clipboard } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { normalizePlaylistUrl } from '../../utils/youtube';
import { usePlaylist } from './PlaylistContext';

export function PlaylistInput() {
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { setPlaylistUrl } = usePlaylist();
  const inputRef = useRef<HTMLInputElement>(null);
  const submitTimeoutRef = useRef<number | undefined>(undefined);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (url: string) => {
    const normalizedUrl = normalizePlaylistUrl(url.trim());

    if (!normalizedUrl) {
      setError('Invalid YouTube playlist URL');
      return;
    }

    setError(null);
    setPlaylistUrl(normalizedUrl);
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

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputUrl(text);
      setError(null);
      handleSubmit(text);
    } catch (_error) {
      setError('Could not read clipboard — paste the URL manually instead');
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleFormSubmit} className="space-y-2">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            value={inputUrl}
            onChange={handleChange}
            placeholder="Paste YouTube playlist URL"
            className="w-full px-3 py-2 pr-10 bg-gray-800 text-white border border-gray-700 rounded-md shadow-sm placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Paste from clipboard"
          >
            <Clipboard className="w-4 h-4" />
          </button>
        </div>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      </form>
    </div>
  );
}
