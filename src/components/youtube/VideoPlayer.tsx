interface VideoPlayerProps {
  videoId: string;
  onClose: () => void;
}

export function VideoPlayer({ videoId, onClose }: VideoPlayerProps) {
  return (
    <div className="relative w-full h-full">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
      >
        ×
      </button>
    </div>
  );
}
