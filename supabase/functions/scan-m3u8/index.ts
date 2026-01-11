const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface M3U8Stream {
  id: string;
  url: string;
  resolution?: string;
  bandwidth?: string;
  segments?: number;
  duration?: string;
  type: 'master' | 'variant';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scanning URL:', url);

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch URL: ${response.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    const streams: M3U8Stream[] = [];
    const foundUrls = new Set<string>();

    // Multiple regex patterns to find M3U8 URLs
    const patterns = [
      // Direct .m3u8 URLs
      /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi,
      // URLs in src attributes
      /src\s*=\s*["']([^"']*\.m3u8[^"']*)["']/gi,
      // URLs in data attributes
      /data-[^=]*\s*=\s*["']([^"']*\.m3u8[^"']*)["']/gi,
      // URLs in JavaScript strings
      /["']([^"']*\.m3u8[^"']*)["']/gi,
      // HLS source patterns
      /source\s*:\s*["']([^"']*\.m3u8[^"']*)["']/gi,
      // Video source patterns
      /file\s*:\s*["']([^"']*\.m3u8[^"']*)["']/gi,
      // Common video player patterns
      /playlist\s*:\s*["']([^"']*\.m3u8[^"']*)["']/gi,
      /stream(?:Url|URL|url)\s*[:=]\s*["']([^"']*\.m3u8[^"']*)["']/gi,
      /video(?:Url|URL|url)\s*[:=]\s*["']([^"']*\.m3u8[^"']*)["']/gi,
      /manifest(?:Url|URL|url)\s*[:=]\s*["']([^"']*\.m3u8[^"']*)["']/gi,
    ];

    // Extract URLs using all patterns
    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        // Get the URL (either full match or first capture group)
        let m3u8Url = match[1] || match[0];
        
        // Clean up the URL
        m3u8Url = m3u8Url.replace(/['"]/g, '').trim();
        
        // Skip if empty or already found
        if (!m3u8Url || foundUrls.has(m3u8Url)) continue;
        
        // Make relative URLs absolute
        if (m3u8Url.startsWith('//')) {
          m3u8Url = 'https:' + m3u8Url;
        } else if (m3u8Url.startsWith('/')) {
          const baseUrl = new URL(url);
          m3u8Url = baseUrl.origin + m3u8Url;
        } else if (!m3u8Url.startsWith('http')) {
          const baseUrl = new URL(url);
          const basePath = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);
          m3u8Url = baseUrl.origin + basePath + m3u8Url;
        }

        // Validate it looks like an M3U8 URL
        if (!m3u8Url.includes('.m3u8')) continue;
        
        foundUrls.add(m3u8Url);
      }
    }

    console.log(`Found ${foundUrls.size} unique M3U8 URLs`);

    // Analyze each M3U8 URL
    let streamIndex = 0;
    for (const m3u8Url of foundUrls) {
      try {
        const streamInfo = await analyzeM3U8(m3u8Url);
        streams.push({
          id: `stream-${++streamIndex}`,
          url: m3u8Url,
          type: streamInfo.type || 'variant',
          resolution: streamInfo.resolution,
          bandwidth: streamInfo.bandwidth,
          segments: streamInfo.segments,
          duration: streamInfo.duration,
        });
      } catch (error) {
        console.log(`Failed to analyze ${m3u8Url}:`, error);
        // Still add the URL even if we can't analyze it
        streams.push({
          id: `stream-${++streamIndex}`,
          url: m3u8Url,
          type: 'variant',
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        streams,
        scannedUrl: url,
        foundCount: streams.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scanning URL:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scan URL' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeM3U8(url: string): Promise<Partial<M3U8Stream>> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch M3U8: ${response.status}`);
  }

  const content = await response.text();
  const lines = content.split('\n');

  let isMaster = false;
  let resolution: string | undefined;
  let bandwidth: string | undefined;
  let segmentCount = 0;
  let totalDuration = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check if it's a master playlist
    if (trimmedLine.startsWith('#EXT-X-STREAM-INF')) {
      isMaster = true;
      
      // Extract resolution
      const resMatch = trimmedLine.match(/RESOLUTION=(\d+x\d+)/i);
      if (resMatch) {
        resolution = resMatch[1];
      }
      
      // Extract bandwidth
      const bwMatch = trimmedLine.match(/BANDWIDTH=(\d+)/i);
      if (bwMatch) {
        const bw = parseInt(bwMatch[1]);
        bandwidth = formatBandwidth(bw);
      }
    }

    // Count segments
    if (trimmedLine.startsWith('#EXTINF:')) {
      segmentCount++;
      const durationMatch = trimmedLine.match(/#EXTINF:([\d.]+)/);
      if (durationMatch) {
        totalDuration += parseFloat(durationMatch[1]);
      }
    }
  }

  return {
    type: isMaster ? 'master' : 'variant',
    resolution,
    bandwidth,
    segments: segmentCount > 0 ? segmentCount : undefined,
    duration: totalDuration > 0 ? formatDuration(totalDuration) : undefined,
  };
}

function formatBandwidth(bps: number): string {
  if (bps >= 1000000) {
    return `${(bps / 1000000).toFixed(1)} Mbps`;
  }
  return `${(bps / 1000).toFixed(0)} Kbps`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
