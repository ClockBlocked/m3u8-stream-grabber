import { useState } from "react";
import { motion } from "framer-motion";
import { Tv2 } from "lucide-react";
import { ScannerInput } from "@/components/ScannerInput";
import { VideoResult, VideoStream } from "@/components/VideoResult";
import { VideoDrawer } from "@/components/VideoDrawer";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";

// Mock data for demonstration
const mockStreams: VideoStream[] = [
  {
    id: "1",
    url: "https://example.com/video/master.m3u8",
    type: "master",
    resolution: "Adaptive",
    segments: 156,
    duration: "1:32:45",
  },
  {
    id: "2",
    url: "https://example.com/video/1080p.m3u8",
    type: "variant",
    resolution: "1920x1080",
    bandwidth: "5.2 Mbps",
    segments: 156,
    duration: "1:32:45",
  },
  {
    id: "3",
    url: "https://example.com/video/720p.m3u8",
    type: "variant",
    resolution: "1280x720",
    bandwidth: "2.8 Mbps",
    segments: 156,
    duration: "1:32:45",
  },
  {
    id: "4",
    url: "https://example.com/video/480p.m3u8",
    type: "variant",
    resolution: "854x480",
    bandwidth: "1.4 Mbps",
    segments: 156,
    duration: "1:32:45",
  },
];

const Index = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [streams, setStreams] = useState<VideoStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<VideoStream | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = async (url: string) => {
    setIsScanning(true);
    setStreams([]);
    setHasScanned(true);

    // Simulate scanning delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // In a real implementation, this would call a backend to scan the URL
    // For demo, we'll show mock data
    setStreams(mockStreams);
    setIsScanning(false);
    toast.success(`Found ${mockStreams.length} M3U8 streams!`);
  };

  const handleSelectStream = (stream: VideoStream) => {
    setSelectedStream(stream);
  };

  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 rounded-lg bg-primary/20 glow-primary">
              <Tv2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                M3U8 Scanner
              </h1>
              <p className="text-sm text-muted-foreground">
                Detect HLS video streams from any URL
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-5xl mx-auto px-4 py-8">
        {/* Scanner Input */}
        <div className="mb-8">
          <ScannerInput onScan={handleScan} isScanning={isScanning} />
        </div>

        {/* Results */}
        <div className="space-y-4">
          {!hasScanned && !isScanning && <EmptyState />}

          {isScanning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card border border-border">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  Scanning for M3U8 streams...
                </span>
              </div>
            </motion.div>
          )}

          {!isScanning && streams.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-foreground">
                  Found Streams
                </h2>
                <span className="px-3 py-1 text-sm font-mono rounded-full bg-primary/20 text-primary">
                  {streams.length} streams
                </span>
              </div>

              <div className="space-y-3">
                {streams.map((stream, index) => (
                  <VideoResult
                    key={stream.id}
                    stream={stream}
                    index={index}
                    onSelect={handleSelectStream}
                    isSelected={selectedStream?.id === stream.id}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {hasScanned && !isScanning && streams.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-muted-foreground">
                No M3U8 streams found on this page
              </p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Video Drawer */}
      <VideoDrawer
        stream={selectedStream}
        onClose={() => setSelectedStream(null)}
      />
    </div>
  );
};

export default Index;
