const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Rotate through different user agents to avoid detection
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

function getRandomUserAgent(): string {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const reqUrl = new URL(req.url);
    
    // Get the M3U8 URL from query params or body
    let m3u8Url: string | null = null;
    let referer: string | null = null;

    if (req.method === 'GET') {
      m3u8Url = reqUrl.searchParams.get('url');
      referer = reqUrl.searchParams.get('referer');
    } else {
      const body = await req.json();
      m3u8Url = body.url;
      referer = body.referer;
    }

    if (!m3u8Url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode URL if needed
    m3u8Url = decodeURIComponent(m3u8Url);
    
    const targetUrl = new URL(m3u8Url);
    const origin = targetUrl.origin;

    // Build headers that mimic a browser request from the original page
    const headers: Record<string, string> = {
      'User-Agent': getRandomUserAgent(),
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    };

    // Add referer if provided
    if (referer) {
      headers['Referer'] = referer;
      headers['Origin'] = new URL(referer).origin;
    } else {
      headers['Referer'] = origin + '/';
      headers['Origin'] = origin;
    }

    console.log(`Proxying: ${m3u8Url}`);

    const response = await fetch(m3u8Url, {
      headers,
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error(`Proxy fetch failed: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/vnd.apple.mpegurl';
    const lowerPath = targetUrl.pathname.toLowerCase();
    const isSegmentRequest = lowerPath.endsWith('.ts') || lowerPath.endsWith('.m4s') || lowerPath.endsWith('.fmp4') || contentType.toLowerCase().includes('video');

    if (isSegmentRequest) {
      const buffer = await response.arrayBuffer();
      return new Response(buffer, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'video/MP2T',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    let content = await response.text();

    // If this is an M3U8 file, rewrite URLs to go through our proxy
    if (contentType.includes('mpegurl') || contentType.includes('m3u8') || m3u8Url.includes('.m3u8')) {
      const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
      // Force HTTPS for the proxy base URL
      const proxyBase = new URL(reqUrl.origin.replace('http://', 'https://') + reqUrl.pathname);
      const baseParams = new URLSearchParams(reqUrl.search);
      baseParams.delete('url');
      baseParams.delete('referer');
      
      // Rewrite relative URLs to absolute, then proxy them
      const lines = content.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        
        // Skip comments and empty lines (except #EXT lines which we keep)
        if (trimmed.startsWith('#') || trimmed === '') {
          return line;
        }
        
        // This is a URL line - could be relative or absolute
        let absoluteUrl: string;
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          absoluteUrl = trimmed;
        } else if (trimmed.startsWith('?')) {
          absoluteUrl = m3u8Url.split('?')[0] + trimmed;
        } else if (trimmed.startsWith('/')) {
          absoluteUrl = origin + trimmed;
        } else {
          absoluteUrl = baseUrl + trimmed;
        }
        
        // For .ts segment files, proxy them too
        // For .m3u8 variant files, proxy them as well
        const params = new URLSearchParams(baseParams);
        params.set('url', absoluteUrl);
        params.set('referer', referer ? referer : m3u8Url);
        proxyBase.search = '';
        return `${proxyBase.toString()}?${params.toString()}`;
      });
      
      content = rewrittenLines.join('\n');
    }

    // Return the content with proper headers
    return new Response(content, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Proxy failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
