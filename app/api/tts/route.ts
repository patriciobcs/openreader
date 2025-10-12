import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache for demo content
const ttsCache = new Map<string, { audio: Buffer; contentType: string }>();

export async function POST(request: NextRequest) {
  try {
    const { text, chunkId, isDemo } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Check cache for demo content
    const cacheKey = `${isDemo ? 'demo-' : ''}${chunkId}-${text}`;
    
    if (ttsCache.has(cacheKey)) {
      const cached = ttsCache.get(cacheKey)!;
      return new NextResponse(new Uint8Array(cached.audio), {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    const apiKey = process.env.SLNG_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'SLNG_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Call slng.ai TTS API with ElevenLabs Turbo v2.5 model
    const response = await fetch('https://api.slng.ai/v1/tts/elevenlabs/turbo-v2-5', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SLNG API Error:', errorText);
      return NextResponse.json(
        { error: `TTS API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const audioBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);

    // Cache demo content
    if (isDemo) {
      ttsCache.set(cacheKey, { audio: buffer, contentType });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': isDemo ? 'public, max-age=31536000' : 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}

