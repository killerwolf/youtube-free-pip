import { Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebug, DebugConsole } from './components/DebugConsole';


function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const { addLog } = useDebug();

  useEffect(() => {
    // Check if Web Share API is supported
    setCanShare('share' in navigator);
    addLog('Share API supported: ' + ('share' in navigator));

    const checkClipboard = async () => {
      try {
        // Check if the device supports the Clipboard API
        if (!navigator.clipboard) {
          addLog('Clipboard API not available', 'error');
          return;
        }

        // Try to get clipboard permission
        try {
          const permissionResult = await navigator.permissions.query({
            name: 'clipboard-read' as PermissionName,
          });
          
          addLog('Clipboard permission: ' + permissionResult.state);
          
          if (permissionResult.state === 'granted' || permissionResult.state === 'prompt') {
            const text = await navigator.clipboard.readText();
            handleClipboardText(text);
          }
        } catch (permError) {
          addLog('Permission API not available, trying direct clipboard access');
          // Fallback: try direct clipboard access
          const text = await navigator.clipboard.readText();
          handleClipboardText(text);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        addLog('Clipboard error: ' + msg, 'error');
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
    addLog('Clipboard paste listener added');
    
    // Cleanup
    return () => {
      document.removeEventListener('paste', handleClipboardChange);
    };
  }, [addLog]);

  const handleClipboardText = (text: string) => {
    addLog('Processing clipboard text: ' + text);
    if (text) {
      const extractedId = extractVideoId(text);
      addLog('Extracted ID: ' + (extractedId || 'none'));
      
      if (extractedId) {
        setVideoUrl(text);
        setVideoId(extractedId);
      }
    }
  };

  const extractVideoId = (url: string): string | false => {
    try {
      const regExp =
        /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      const match = url.match(regExp);
      return match && match[7].length === 11 ? match[7] : false;
    } catch (error) {
      addLog('Error extracting video ID: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const id = extractVideoId(videoUrl);
    if (id) {
      setVideoId(id);
      setVideoUrl('');
      addLog('Video ID set: ' + id);
    } else {
      setError('Please enter a valid YouTube URL');
      addLog('Invalid YouTube URL submitted', 'error');
    }
  };

  const handleClear = () => {
    setVideoUrl('');
    setVideoId('');
    setError(null);
    addLog('Form cleared');
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    try {
      const text = e.clipboardData.getData('text');
      addLog('Text pasted: ' + text);
      handleClipboardText(text);
    } catch (error) {
      addLog('Paste event error: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    }
  };

  const handleShare = async () => {
    try {
      const shareData: ShareData = {
        title: 'Share YouTube Video',
        text: 'Check out this video',
        url: `https://youtu.be/${videoId}`,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        addLog('Video shared successfully');
      }
    } catch (error) {
      addLog('Error sharing: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
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
            <div className="space-y-4">
              <div className="aspect-square w-full relative bg-black rounded-lg overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
              {canShare && (
                <button
                  onClick={handleShare}
                  className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Share Video
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <DebugConsole />
    </div>
  );
}

export default App;
