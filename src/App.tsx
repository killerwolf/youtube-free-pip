import { Video } from 'lucide-react';
import { useEffect, useState } from 'react';

interface YouTubeError extends Error {
  message: string;
}

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkClipboard = async () => {
      try {
        // Request clipboard permission first
        const permissionResult = await navigator.permissions.query({
          name: 'clipboard-read' as PermissionName,
        });
        
        console.log('Clipboard permission:', permissionResult.state);
        
        if (permissionResult.state === 'granted' || permissionResult.state === 'prompt') {
          const text = await navigator.clipboard.readText();
          console.log('Clipboard content:', text);
          
          if (text) {
            const extractedId = extractVideoId(text);
            console.log('Extracted ID:', extractedId);
            
            if (extractedId) {
              setVideoUrl(text);
              setVideoId(extractedId);
            }
          }
        } else {
          setError('Clipboard permission denied. Please paste the URL manually.');
        }
      } catch (error) {
        const youtubeError = error as YouTubeError;
        console.error('Clipboard error:', youtubeError);
        setError(`Failed to read clipboard: ${youtubeError.message}`);
      }
    };

    // Initial check
    checkClipboard();

    // Set up clipboard event listener
    const handleClipboardChange = () => {
      checkClipboard();
    };

    // Listen for clipboard changes
    document.addEventListener('paste', handleClipboardChange);
    
    // Cleanup
    return () => {
      document.removeEventListener('paste', handleClipboardChange);
    };
  }, []);

  const extractVideoId = (url: string): string | false => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : false;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const id = extractVideoId(videoUrl);
    if (id) {
      setVideoId(id);
      setVideoUrl('');
    } else {
      setError('Please enter a valid YouTube URL');
    }
  };

  const handleClear = () => {
    setVideoUrl('');
    setVideoId('');
    setError(null);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const id = extractVideoId(text);
    if (id) {
      setVideoUrl(text);
      setVideoId(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Video className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-800">
              Free Youtube Picture in Picture
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onPaste={handlePaste}
                placeholder="Enter YouTube video URL (e.g., https://youtu.be/NWus8pVPXaI)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                aria-label="YouTube URL"
              />
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Clear
              </button>
            </div>
            {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full px-6 py-2 mt-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Play Video
            </button>
          </form>

          {videoId && (
            <div className="aspect-square w-full relative bg-black rounded-lg overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
