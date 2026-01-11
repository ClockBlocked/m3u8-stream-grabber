import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface HLSPlayerProps {
  src: string;
  resolution?: string;
  type?: "master" | "variant";
}

export const HLSPlayer = ({ src, resolution, type }: HLSPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setIsLoading(true);
    setError(null);
    setIsPlaying(false);

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        // Auto-play when ready
        video.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          // Autoplay blocked, user needs to interact
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError("Network error - stream may be unavailable or blocked by CORS");
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError("Media error - trying to recover...");
              hls.recoverMediaError();
              break;
            default:
              setError("Failed to load stream");
              break;
          }
          setIsLoading(false);
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
      video.addEventListener("error", () => {
        setError("Failed to load stream");
        setIsLoading(false);
      });
    } else {
      setError("HLS is not supported in this browser");
      setIsLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100 || 0);
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * duration;
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="relative aspect-video w-full rounded-xl overflow-hidden bg-black group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isLoading && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={isMuted}
      />

      {/* Stream info badges */}
      <div className="absolute top-3 left-3 flex gap-2 z-10">
        {resolution && (
          <span className="px-2 py-1 text-xs font-mono bg-background/80 backdrop-blur rounded text-foreground">
            {resolution}
          </span>
        )}
        {type === "master" && (
          <span className="px-2 py-1 text-xs font-mono bg-primary/80 backdrop-blur rounded text-primary-foreground">
            Master
          </span>
        )}
        {isPlaying && (
          <span className="px-2 py-1 text-xs font-mono bg-destructive/80 backdrop-blur rounded text-destructive-foreground flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading stream...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center px-4">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
            <p className="text-sm text-foreground mb-1">Playback Error</p>
            <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <motion.div
        initial={false}
        animate={{ opacity: showControls || !isPlaying ? 1 : 0 }}
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
      >
        {/* Center play button */}
        {!isPlaying && !isLoading && !error && (
          <button
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center transition-colors glow-primary"
          >
            <Play className="w-8 h-8 text-primary-foreground ml-1" />
          </button>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {/* Progress bar */}
          <div
            className="h-1 bg-muted/50 rounded-full mb-3 cursor-pointer group/progress"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-primary rounded-full relative transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                disabled={isLoading || !!error}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-foreground" />
                ) : (
                  <Play className="w-5 h-5 text-foreground" />
                )}
              </button>

              <button
                onClick={toggleMute}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-foreground" />
                ) : (
                  <Volume2 className="w-5 h-5 text-foreground" />
                )}
              </button>

              <span className="text-xs text-foreground/80 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <button
              onClick={handleFullscreen}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Maximize className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
