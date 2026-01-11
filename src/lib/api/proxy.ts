import { supabase } from "@/integrations/supabase/client";

/**
 * Get the proxied URL for an M3U8 stream
 * This routes the request through our edge function to bypass CORS
 */
export function getProxiedM3U8Url(m3u8Url: string, referer?: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const proxyUrl = `${supabaseUrl}/functions/v1/proxy-m3u8`;
  const params = new URLSearchParams({
    url: m3u8Url,
  });
  
  if (referer) {
    params.set('referer', referer);
  }
  
  // Include anon key so the edge function can authorize the request
  if (anonKey) {
    params.set('apikey', anonKey);
  }
  
  // Add the anon key as a query param for authentication
  return `${proxyUrl}?${params.toString()}`;
}

/**
 * Alternative: Get proxy headers for fetch requests
 */
export function getProxyHeaders(): Record<string, string> {
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
  };
}
