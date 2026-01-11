import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Copy, ExternalLink, Play, Pause, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoStream } from "./VideoResult";
import { useState } from "react";
import { toast } from "sonner";

interface VideoDrawerProps {
  stream: VideoStream | null;
  onClose: () => void;
}

export const VideoDrawer = ({ stream, onClose }: VideoDrawerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (stream) {
      await navigator.clipboard.writeText(stream.url);
      setCopied(true);
      toast.success("URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    toast.info("Download initiated", {
      description: "M3U8 streams require a video downloader tool like FFmpeg or yt-dlp to merge segments.",
    });
  };

  const handleOpenExternal = () => {
    if (stream) {
      window.open(stream.url, "_blank");
    }
  };

  return (
    <AnimatePresence>
      {stream && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 gradient-card border-t border-border rounded-t-2xl overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-6 pb-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Stream Details
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono truncate max-w-md">
                    {stream.url}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Preview Area */}
              <div className="relative aspect-video max-w-2xl mx-auto mb-6 rounded-xl overflow-hidden bg-muted/50 border border-border">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
                      <Play className="w-8 h-8 text-primary ml-1" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      M3U8 Preview
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Use an HLS player to preview this stream
                    </p>
                  </div>
                </div>

                {/* Stream info overlay */}
                <div className="absolute top-4 left-4 flex gap-2">
                  {stream.resolution && (
                    <span className="px-2 py-1 text-xs font-mono bg-background/80 backdrop-blur rounded text-foreground">
                      {stream.resolution}
                    </span>
                  )}
                  {stream.type === "master" && (
                    <span className="px-2 py-1 text-xs font-mono bg-primary/80 backdrop-blur rounded text-primary-foreground">
                      Master
                    </span>
                  )}
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 max-w-2xl mx-auto">
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Type</p>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {stream.type}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Resolution</p>
                  <p className="text-sm font-medium text-foreground">
                    {stream.resolution || "Adaptive"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Segments</p>
                  <p className="text-sm font-medium text-foreground">
                    {stream.segments || "N/A"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Duration</p>
                  <p className="text-sm font-medium text-foreground">
                    {stream.duration || "Unknown"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="gap-2 border-border hover:border-primary hover:text-primary"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy URL
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleOpenExternal}
                  variant="outline"
                  className="gap-2 border-border hover:border-primary hover:text-primary"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Browser
                </Button>
                
                <Button
                  onClick={handleDownload}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
                >
                  <Download className="w-4 h-4" />
                  Download Info
                </Button>
              </div>

              {/* Tip */}
              <div className="mt-6 max-w-2xl mx-auto">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground/80">
                    <p className="font-medium text-primary mb-1">Pro Tip</p>
                    <p className="text-muted-foreground">
                      Use tools like <span className="font-mono text-primary">ffmpeg</span> or{" "}
                      <span className="font-mono text-primary">yt-dlp</span> to download and merge M3U8 segments into a single video file.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
