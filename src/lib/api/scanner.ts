import { supabase } from "@/integrations/supabase/client";
import { VideoStream } from "@/components/VideoResult";

interface ScanResponse {
  success: boolean;
  streams?: VideoStream[];
  scannedUrl?: string;
  foundCount?: number;
  error?: string;
}

export async function scanForM3U8(url: string): Promise<ScanResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('scan-m3u8', {
      body: { url },
    });

    if (error) {
      console.error('Edge function error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to scan URL' 
      };
    }

    return data as ScanResponse;
  } catch (error) {
    console.error('Scan error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to scan URL' 
    };
  }
}
