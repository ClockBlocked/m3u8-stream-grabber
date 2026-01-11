import { motion } from "framer-motion";
import { Radio, Tv2, Zap } from "lucide-react";

export const EmptyState = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="relative mb-6">
        {/* Animated rings */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/20"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/20"
          animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        />
        
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
          <Radio className="w-8 h-8 text-primary" />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-foreground mb-2">
        Ready to Scan
      </h3>
      <p className="text-muted-foreground max-w-sm mb-8">
        Paste a URL above to detect M3U8 video streams on any webpage
      </p>

      <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
          <Tv2 className="w-4 h-4 text-primary" />
          <span>HLS Streams</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
          <Zap className="w-4 h-4 text-primary" />
          <span>Fast Detection</span>
        </div>
      </div>
    </motion.div>
  );
};
