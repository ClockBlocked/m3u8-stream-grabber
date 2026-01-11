import { motion } from "framer-motion";
import { Play, FileVideo, Clock, Layers } from "lucide-react";

export interface VideoStream {
  id: string;
  url: string;
  resolution?: string;
  bandwidth?: string;
  segments?: number;
  duration?: string;
  type: "master" | "variant";
}

interface VideoResultProps {
  stream: VideoStream;
  index: number;
  onSelect: (stream: VideoStream) => void;
  isSelected: boolean;
}

export const VideoResult = ({ stream, index, onSelect, isSelected }: VideoResultProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      onClick={() => onSelect(stream)}
      className={`group relative p-4 rounded-lg cursor-pointer transition-all duration-300 ${
        isSelected
          ? "bg-primary/20 border border-primary glow-primary"
          : "bg-card border border-border hover:border-primary/50 hover:bg-card/80"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-lg transition-colors ${
          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-primary"
        }`}>
          <FileVideo className="w-5 h-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
              stream.type === "master" 
                ? "bg-primary/20 text-primary" 
                : "bg-secondary text-secondary-foreground"
            }`}>
              {stream.type === "master" ? "Master Playlist" : "Variant Stream"}
            </span>
            {stream.resolution && (
              <span className="text-xs font-mono text-muted-foreground">
                {stream.resolution}
              </span>
            )}
          </div>
          
          <p className="font-mono text-sm text-foreground truncate mb-2">
            {stream.url}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {stream.bandwidth && (
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {stream.bandwidth}
              </span>
            )}
            {stream.segments && (
              <span className="flex items-center gap-1">
                <FileVideo className="w-3 h-3" />
                {stream.segments} segments
              </span>
            )}
            {stream.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {stream.duration}
              </span>
            )}
          </div>
        </div>

        {/* Play indicator */}
        <div className={`p-2 rounded-full transition-all ${
          isSelected 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground opacity-0 group-hover:opacity-100"
        }`}>
          <Play className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
};