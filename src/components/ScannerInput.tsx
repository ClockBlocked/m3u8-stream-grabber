import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ScannerInputProps {
  onScan: (url: string) => void;
  isScanning: boolean;
}

export const ScannerInput = ({ onScan, isScanning }: ScannerInputProps) => {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onScan(url.trim());
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/50 to-primary/30 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 blur transition-opacity duration-300" />
        
        <div className="relative flex gap-2 p-2 rounded-xl bg-card border border-border">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste URL to scan for M3U8 streams..."
              className="pl-11 h-12 bg-transparent border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm"
              disabled={isScanning}
            />
          </div>
          
          <Button
            type="submit"
            disabled={!url.trim() || isScanning}
            className="h-12 px-6 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary transition-all duration-300"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Scan
              </>
            )}
          </Button>
        </div>

        {/* Scanning animation */}
        {isScanning && (
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            <motion.div
              className="absolute inset-y-0 w-1/3 scan-line"
              animate={{ x: ["-100%", "400%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        )}
      </div>
    </motion.form>
  );
};
