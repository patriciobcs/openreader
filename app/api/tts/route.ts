import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { ElevenLabsResponse } from '@/lib/types';

// Simple in-memory cache for demo content
const ttsCache = new Map<string, { audio: Buffer; contentType: string; alignment?: any }>();

export async function POST(request: NextRequest) {
  try {
    const { text, chunkId, isDemo, provider = 'slng', previousText, nextText } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Check cache for demo content
    const cacheKey = `${provider}-${isDemo ? 'demo-' : ''}${chunkId}-${text}`;

    if (ttsCache.has(cacheKey)) {
      const cached = ttsCache.get(cacheKey)!;
      
      // For ElevenLabs, return JSON with audio and alignment
      if (provider === 'elevenlabs' && cached.alignment) {
        return NextResponse.json({
          audio: Array.from(cached.audio),
          alignment: cached.alignment,
          cached: true
        });
      }
      
      // For SLNG, return audio blob
      return new NextResponse(new Uint8Array(cached.audio), {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    // Route to appropriate provider
    if (provider === 'elevenlabs') {
      return await handleElevenLabsRequest(text, chunkId, isDemo, cacheKey, previousText, nextText);
    } else {
      return await handleSLNGRequest(text, chunkId, isDemo, cacheKey);
    }
  } catch (error) {
    console.error('TTS API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}

/**
 * Handle SLNG TTS request (existing implementation)
 */
async function handleSLNGRequest(
  text: string,
  chunkId: string,
  isDemo: boolean,
  cacheKey: string
) {
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
}

/**
 * Handle ElevenLabs TTS request with character timestamps using official SDK
 */
async function handleElevenLabsRequest(
  text: string,
  chunkId: string,
  isDemo: boolean,
  cacheKey: string,
  previousText?: string,
  nextText?: string
) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Default: Bella

  if (!apiKey) {
    return NextResponse.json(
      { error: 'ELEVENLABS_API_KEY not configured' },
      { status: 500 }
    );
  }

  console.log('🎙️ ElevenLabs TTS request:', {
    textLength: text.length,
    voiceId,
    isDemo
  });

  try {
    // Initialize ElevenLabs client
    const client = new ElevenLabsClient({
      apiKey,
    });

    // Call ElevenLabs API with timestamps using official SDK
    const response = await client.textToSpeech.convertWithTimestamps(voiceId, {
      text,
      modelId: 'eleven_turbo_v2_5',
      outputFormat: 'mp3_44100_128',
      previousText: previousText || undefined,
      nextText: nextText || undefined,
    });

    console.log('✨ ElevenLabs SDK response:', {
      audioLength: response.audioBase64.length,
      characters: response.alignment?.characters?.length || 0,
      hasNormalizedAlignment: !!response.normalizedAlignment
    });

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(response.audioBase64, 'base64');

    // Cache demo content with alignment data
    if (isDemo && response.alignment) {
      ttsCache.set(cacheKey, {
        audio: audioBuffer,
        contentType: 'audio/mpeg',
        alignment: response.alignment
      });
    }

    // Return JSON with audio and alignment
    return NextResponse.json({
      audio: Array.from(audioBuffer),
      alignment: response.alignment,
      normalized_alignment: response.normalizedAlignment
    });
  } catch (error: any) {
    console.error('ElevenLabs SDK Error:', error);
    return NextResponse.json(
      { error: `ElevenLabs API error: ${error.message || 'Unknown error'}` },
      { status: error.statusCode || 500 }
    );
  }
}

