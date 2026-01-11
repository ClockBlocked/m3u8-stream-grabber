import { supabase } from "@/integrations/supabase/client";
import { VideoStream } from "@/components/VideoResult";

interface ScanResponse {
  success: boolean;
  streams?: VideoStream[];
  scannedUrl?: string;
  foundCount?: number;
  error?: string;
}

const SCAN_RETRY_BASE_DELAY_MS = 300;

export async function scanForM3U8(url: string): Promise<ScanResponse> {
  const maxAttempts = 3;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke<ScanResponse>('scan-m3u8', {
        body: { url },
      });

      if (error) {
        console.error('Edge function error:', error);
        lastError = error.message || 'Failed to scan URL';

        // Retry on transient errors (5xx)
        if (error.status && error.status >= 500 && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, SCAN_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1)));
          continue;
        }

        return { success: false, error: lastError };
      }

      if (data?.success) {
        return data;
      }

      lastError = data?.error || 'Scan failed';

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, SCAN_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1)));
        continue;
      }

      return { success: false, error: lastError };
    } catch (error) {
      console.error('Scan error:', error);
      lastError = error instanceof Error ? error.message : 'Failed to scan URL';

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, SCAN_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1)));
        continue;
      }

      return { success: false, error: lastError };
    }
  }

  return { success: false, error: lastError || 'Failed to scan URL' };
}
