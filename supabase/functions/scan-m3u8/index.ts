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

// Rotate through different user agents to avoid detection
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectCookies(headers: Headers): string | undefined {
  const rawCookies =
    ((headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() as string[] | undefined) ||
    (headers.get('set-cookie') ? headers.get('set-cookie')!.split(/,(?=[^;]+=[^;]+)/) : []);

  if (!rawCookies || rawCookies.length === 0) return undefined;

  const pairs = rawCookies
    .map((cookie) => cookie.split(';')[0]?.trim())
    .filter(Boolean);

  return pairs.length ? pairs.join('; ') : undefined;
}

function getBrowserHeaders(targetUrl: string): Record<string, string> {
  const url = new URL(targetUrl);
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Connection': 'keep-alive',
    'DNT': '1',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Referer': url.origin + '/',
    'Origin': url.origin,
  };
}

function getM3U8Headers(m3u8Url: string, pageUrl: string, cookies?: string): Record<string, string> {
  const m3u8Origin = new URL(m3u8Url).origin;
  const pageOrigin = new URL(pageUrl).origin;
  
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': pageUrl,
    'Origin': pageOrigin,
    'Connection': 'keep-alive',
    'DNT': '1',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': m3u8Origin === pageOrigin ? 'same-origin' : 'cross-site',
    ...(cookies ? { 'Cookie': cookies } : {}),
  };
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

    // Fetch the webpage with browser-like headers
    const response = await fetch(url, {
      headers: getBrowserHeaders(url),
      redirect: 'follow',
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch URL: ${response.status} ${response.statusText}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    const normalizedHtml = html.replace(/\\\//g, '/');
    const cookieHeader = collectCookies(response.headers);
    const streams: M3U8Stream[] = [];
    const foundUrls = new Set<string>();
    const htmlVariants = [html, normalizedHtml];

    const base64Pattern = /atob\s*\(\s*["']([^"']+)["']\s*\)/gi;

    // Multiple regex patterns to find M3U8 URLs
    const patterns = [
      // Direct .m3u8 URLs
      /https?:\/\/[^\s"'<>\\]+\.m3u8(?:\?[^\s"'<>\\]*)?/gi,
      // URLs in src attributes
      /src\s*=\s*["']([^"']*\.m3u8[^"']*)["']/gi,
      // URLs in data attributes
      /data-[^=]*\s*=\s*["']([^"']*\.m3u8[^"']*)["']/gi,
      // URLs in JavaScript strings (more permissive)
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
      // URL encoded patterns
      /https?%3A%2F%2F[^"'\s]+\.m3u8[^"'\s]*/gi,
    ];

    const addM3U8Url = (candidate: string) => {
      let m3u8Url = candidate.replace(/['"]/g, '').trim();
      
      if (!m3u8Url) return;

      try {
        if (/%[0-9A-Fa-f]{2}/.test(m3u8Url)) {
          m3u8Url = decodeURIComponent(m3u8Url);
        }
      } catch {
        // Ignore decoding errors
      }

      m3u8Url = m3u8Url.replace(/\\\//g, '/');
      
      if (!m3u8Url || foundUrls.has(m3u8Url)) return;
      
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

      if (!m3u8Url.includes('.m3u8')) return;
      
      foundUrls.add(m3u8Url);
    };

    // Extract URLs using all patterns on html variants
    for (const content of htmlVariants) {
      for (const pattern of patterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          const candidate = match[1] || match[0];
          addM3U8Url(candidate);
        }
      }

      // Base64 encoded M3U8 URLs within JavaScript (e.g., atob calls)
      for (const match of content.matchAll(base64Pattern)) {
        try {
          const decoded = atob(match[1]);
          const decodedMatches = decoded.match(/https?:\/\/[^\s"'<>\\]+\.m3u8(?:\?[^\s"'<>\\]*)?/gi);
          if (decodedMatches) {
            decodedMatches.forEach(addM3U8Url);
          }
        } catch {
          // Ignore base64 decoding errors
        }
      }
    }

    // Look for M3U8 URLs in JSON blobs inside scripts
    for (const match of normalizedHtml.matchAll(/"([^"]*\.m3u8[^"]*)"/gi)) {
      addM3U8Url(match[1]);
    }

    console.log(`Found ${foundUrls.size} unique M3U8 URLs`);

    // Analyze each M3U8 URL with proper headers
    let streamIndex = 0;
    for (const m3u8Url of foundUrls) {
      try {
        const streamInfo = await analyzeM3U8(m3u8Url, url, cookieHeader);
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

async function analyzeM3U8(url: string, pageUrl: string, cookies?: string): Promise<Partial<M3U8Stream>> {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await delay(Math.random() * 400 + 100);

      const response = await fetch(url, {
        headers: getM3U8Headers(url, pageUrl, cookies),
        redirect: 'follow',
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
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const backoff = 200 * Math.pow(2, attempt - 1);
        await delay(backoff);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to fetch M3U8');
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
