import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// In-memory cache for generated lipsync videos
// Key format: "scene-{sceneIndex}-{audioHash}"
const lipsyncCache = new Map<string, string>();

// Default narrator video URL (you can replace with your own)
const NARRATOR_VIDEO_URL = 'https://v3.fal.media/files/monkey/q1fDPhrpfjfsaRmbhTed4_influencer.mp4';

// Simple hash function for cache keys
function hashAudioUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function POST(request: NextRequest) {
  console.log('🎬 Lipsync API called');
  console.log('📍 Request URL:', request.url);
  console.log('📍 Request method:', request.method);
  console.log('📍 Request headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    const body = await request.json();
    console.log('📦 Request body keys:', Object.keys(body));
    console.log('📦 Has audioData:', !!body.audioData);
    console.log('📦 audioData length:', body.audioData?.length);
    
    const { audioData, sceneIndex } = body;
    console.log('📍 Extracted audioData:', audioData ? `${audioData.length} bytes` : 'undefined');
    console.log('📍 Extracted sceneIndex:', sceneIndex);

    if (!audioData) {
      console.error('❌ audioData is missing!');
      return NextResponse.json(
        { error: 'audioData is required' },
        { status: 400 }
      );
    }

    const FAL_KEY = process.env.FAL_KEY;
    if (!FAL_KEY) {
      return NextResponse.json(
        { error: 'FAL_KEY not configured' },
        { status: 500 }
      );
    }

    // Configure fal client
    fal.config({
      credentials: FAL_KEY,
    });

    // Create cache key based on audio data hash
    const audioHash = hashAudioUrl(audioData.join('-').substring(0, 100)); // Use first 100 bytes for hash
    const cacheKey = `scene-${sceneIndex}-${audioHash}`;
    
    // Check cache first
    if (lipsyncCache.has(cacheKey)) {
      const cachedVideoUrl = lipsyncCache.get(cacheKey)!;
      console.log(`✨ Returning cached lipsync video for scene ${sceneIndex}`);
      return NextResponse.json({
        videoUrl: cachedVideoUrl,
        cached: true,
        sceneIndex,
      });
    }

    console.log(`🎬 Generating NEW lipsync video for scene ${sceneIndex}`);
    console.log(`📍 Audio data size: ${audioData.length} bytes`);
    console.log(`📍 Video URL: ${NARRATOR_VIDEO_URL}`);

    // Convert audio data to blob and upload to fal.ai storage
    console.log('📦 Converting audio data to blob...');
    const audioBytes = new Uint8Array(audioData);
    const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
    console.log(`📦 Audio blob size: ${audioBlob.size} bytes`);
    
    // Convert blob to File for fal.ai upload
    const audioFile = new File([audioBlob], 'scene-audio.mp3', { type: 'audio/mpeg' });
    
    console.log('⬆️ Uploading audio to fal.ai storage...');
    const falAudioUrl = await fal.storage.upload(audioFile);
    console.log(`✅ Uploaded to fal.ai: ${falAudioUrl}`);

    // Submit lipsync video generation job
    console.log('🎥 Submitting lipsync job to fal.ai queue...');
    console.log('🎥 Request payload:', JSON.stringify({
      video_url: NARRATOR_VIDEO_URL,
      audio_url: falAudioUrl,
    }, null, 2));
    
    const { request_id } = await fal.queue.submit('veed/lipsync', {
      input: {
        video_url: NARRATOR_VIDEO_URL,
        audio_url: falAudioUrl,
      },
    });
    
    console.log(`✅ Job submitted with request_id: ${request_id}`);
    
    // Poll for completion
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max (120 * 1 second)
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      try {
        // Try to get the result - if it's ready, this will succeed
        const result = await fal.queue.result('veed/lipsync', {
          requestId: request_id,
        });
        
        console.log('✅ Lipsync generation complete for scene', sceneIndex);
        console.log('📦 Result:', JSON.stringify(result, null, 2));
        
        const videoUrl = result.data.video.url;
        
        if (!videoUrl) {
          throw new Error('No video URL in response');
        }
        
        // Cache and return
        lipsyncCache.set(cacheKey, videoUrl);
        console.log(`💾 Cached lipsync video for scene ${sceneIndex} (total cached: ${lipsyncCache.size})`);
        
        return NextResponse.json({
          videoUrl,
          cached: false,
          sceneIndex,
        });
        
      } catch (_error: unknown) {
        // If result not ready yet, check status
        const status = await fal.queue.status('veed/lipsync', {
          requestId: request_id,
          logs: true,
        });
        
        console.log(`📊 [Attempt ${attempts + 1}] Status for scene ${sceneIndex}:`, status.status);
        
        if (status.status === 'IN_PROGRESS' && 'logs' in status && status.logs) {
          status.logs.forEach((log: { message: string }) => {
            console.log(`  📝 ${log.message}`);
          });
        }
        
        attempts++;
        
        // Continue polling
        if (attempts >= maxAttempts) {
          throw new Error('Lipsync generation timed out after 2 minutes');
        }
      }
    }
    
    // If we get here, something went wrong
    throw new Error('Lipsync generation failed - exited polling loop without result');
  } catch (error: unknown) {
    console.error('❌ Lipsync API Error:', error);
    console.error('Error type:', typeof error);
    
    const errorObj = error as Record<string, unknown>;
    console.error('Error constructor:', errorObj?.constructor?.name);
    console.error('Error message:', errorObj?.message);
    console.error('Error stack:', errorObj?.stack);
    
    // Try to extract more details
    if (errorObj.response) {
      console.error('Error response:', errorObj.response);
      const response = errorObj.response as Record<string, unknown>;
      console.error('Error response data:', response.data);
      console.error('Error response status:', response.status);
    }
    
    if (errorObj.body) {
      console.error('Error body:', errorObj.body);
    }
    
    // Log full error object
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    const typeName = errorObj?.constructor?.name || 'Unknown';
    return NextResponse.json(
      { 
        error: 'Failed to generate lipsync video',
        details: message,
        type: typeName,
      },
      { status: 500 }
    );
  }
}

