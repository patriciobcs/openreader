import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for extracted URL content
// Key: URL, Value: { content: string, sources: Array<Record<string, unknown>> }
const urlCache = new Map<string, { content: string; sources: Array<Record<string, unknown>> }>();

// Simple hash function for URL normalization
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove trailing slashes and fragments for consistent caching
    return urlObj.origin + urlObj.pathname.replace(/\/$/, '') + urlObj.search;
  } catch {
    return url;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LINKUP_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'LINKUP_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Normalize URL for caching
    const normalizedUrl = normalizeUrl(url);
    
    // Check cache first
    if (urlCache.has(normalizedUrl)) {
      const cached = urlCache.get(normalizedUrl)!;
      console.log('✨ Returning cached content for:', normalizedUrl);
      return NextResponse.json({
        content: cached.content,
        sources: cached.sources,
        cached: true,
      });
    }

    console.log('🔍 Fetching NEW content from URL with Linkup:', url);

    // Use Linkup to extract the main content from the URL
    const response = await fetch('https://api.linkup.so/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `Extract and summarize the main text content from this article: ${url}. Provide a clean, readable version of the article text without any ads, navigation, or other UI elements. Just the main content that would be good for reading aloud.`,
        depth: 'standard',
        outputType: 'sourcedAnswer',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Linkup API Error:', errorText);
      return NextResponse.json(
        { error: `Linkup API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Linkup response received');

    const content = data.answer;

    if (!content) {
      return NextResponse.json(
        { error: 'No content extracted from URL' },
        { status: 500 }
      );
    }

    // Cache the extracted content
    const cacheData = {
      content,
      sources: data.sources || [],
    };
    urlCache.set(normalizedUrl, cacheData);
    console.log(`💾 Cached content for: ${normalizedUrl} (cache size: ${urlCache.size})`);

    return NextResponse.json({
      ...cacheData,
      cached: false,
    });
  } catch (error) {
    console.error('Linkup API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content from URL' },
      { status: 500 }
    );
  }
}

