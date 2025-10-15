import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import crypto from 'crypto';

// In-memory cache for fabric videos (Map<hash, videoUrl>)
const fabricCache = new Map<string, string>();

// In-memory cache for pending request IDs (Map<hash, request_id>)
const pendingRequestCache = new Map<string, string>();

// Hardcoded demo video request ID for first chunk
const DEMO_FIRST_CHUNK_REQUEST_ID = '0bad2081-d75c-497c-aecf-8acd1aba0f9d';

// Helper function to hash inputs for caching
function hashInputs(imageUrl: string, audioHash: string): string {
  return crypto
    .createHash('md5')
    .update(`${imageUrl}-${audioHash}`)
    .digest('hex');
}

// GET endpoint to check cache status
export async function GET(_request: NextRequest) {
  console.log('📊 Cache status requested');
  
  const completedVideos = Array.from(fabricCache.entries()).map(([key, url]) => ({
    cacheKey: key,
    videoUrl: url,
  }));
  
  const pendingRequests = Array.from(pendingRequestCache.entries()).map(([key, requestId]) => ({
    cacheKey: key,
    requestId: requestId,
  }));
  
  return NextResponse.json({
    completedVideos: {
      count: fabricCache.size,
      items: completedVideos,
    },
    pendingRequests: {
      count: pendingRequestCache.size,
      items: pendingRequests,
    },
  });
}

export async function POST(request: NextRequest) {
  console.log('🎬 Fabric API called');
  console.log('📍 Request URL:', request.url);
  console.log('📍 Request method:', request.method);
  
  try {
    const body = await request.json();
    const { imageUrl, audioData, sceneIndex } = body;
    
    console.log('📦 Request body received:');
    console.log('  - imageUrl:', imageUrl);
    console.log('  - audioData length:', audioData?.length);
    console.log('  - sceneIndex:', sceneIndex);
    
    if (!imageUrl || !audioData) {
      console.error('❌ Missing required fields:', { hasImageUrl: !!imageUrl, hasAudioData: !!audioData });
      return NextResponse.json(
        { error: 'imageUrl and audioData are required' },
        { status: 400 }
      );
    }

    // Check for FAL_KEY
    const FAL_KEY = process.env.FAL_KEY;
    if (!FAL_KEY) {
      console.error('❌ FAL_KEY is not configured');
      throw new Error('FAL_KEY is not configured');
    }
    console.log('✅ FAL_KEY found');

    // Configure fal.ai
    console.log('🔧 Configuring fal.ai client...');
    fal.config({
      credentials: FAL_KEY,
    });
    console.log('✅ fal.ai client configured');

    // Create cache key
    const audioHash = crypto
      .createHash('md5')
      .update(audioData.slice(0, 100).join('-'))
      .digest('hex');
    const cacheKey = hashInputs(imageUrl, audioHash);
    
    console.log('🔑 Cache key generated:', cacheKey);
    console.log('📊 Current cache status:');
    console.log('  - Completed videos cached:', fabricCache.size);
    console.log('  - Pending requests:', pendingRequestCache.size);
    console.log('  - Has cached video for this key:', fabricCache.has(cacheKey));
    console.log('  - Has pending request for this key:', pendingRequestCache.has(cacheKey));
    
    // Check completed cache first
    if (fabricCache.has(cacheKey)) {
      const cachedVideoUrl = fabricCache.get(cacheKey)!;
      console.log(`✨ Returning cached fabric video for scene ${sceneIndex}`);
      console.log('📹 Cached video URL:', cachedVideoUrl);
      return NextResponse.json({
        videoUrl: cachedVideoUrl,
        cached: true,
        sceneIndex,
      });
    }

    // Check if there's a pending request for this content
    if (pendingRequestCache.has(cacheKey)) {
      const pendingRequestId = pendingRequestCache.get(cacheKey)!;
      console.log(`🔄 Found pending request for scene ${sceneIndex}: ${pendingRequestId}`);
      console.log(`⏳ Attempting to retrieve result from pending request...`);
      
      try {
        // Try to get the result from the existing request
        const result = await fal.queue.result('veed/fabric-1.0/fast', {
          requestId: pendingRequestId,
        });
        
        console.log('✅ Retrieved result from pending request!');
        console.log('📦 Full result object:', JSON.stringify(result, null, 2));
        
        const videoUrl = result.data?.video?.url;
        
        if (videoUrl) {
          // Cache and return
          console.log('💾 Caching resumed video:');
          console.log('  - Cache key:', cacheKey);
          console.log('  - Video URL:', videoUrl);
          fabricCache.set(cacheKey, videoUrl);
          pendingRequestCache.delete(cacheKey); // Remove from pending
          console.log(`✅ Cached fabric video for scene ${sceneIndex} (resumed from pending)`);
          console.log(`📊 Total cached videos: ${fabricCache.size}`);
          console.log(`📊 Pending requests: ${pendingRequestCache.size}`);
          
          return NextResponse.json({
            videoUrl,
            cached: false,
            resumed: true,
            sceneIndex,
          });
        }
      } catch (_error) {
        console.log('⏳ Pending request not ready yet, will continue polling...');
        // Continue with normal flow below
      }
    }

    // For scene 0, try the hardcoded demo request first
    if (sceneIndex === 0) {
      console.log(`🎬 Scene 0 detected - trying hardcoded demo request: ${DEMO_FIRST_CHUNK_REQUEST_ID}`);
      
      try {
        const result = await fal.queue.result('veed/fabric-1.0/fast', {
          requestId: DEMO_FIRST_CHUNK_REQUEST_ID,
        });
        
        console.log('✅ Retrieved result from hardcoded demo request!');
        console.log('📦 Full result object:', JSON.stringify(result, null, 2));
        
        const videoUrl = result.data?.video?.url;
        
        if (videoUrl) {
          // Cache and return
          console.log('💾 Caching demo video:');
          console.log('  - Cache key:', cacheKey);
          console.log('  - Video URL:', videoUrl);
          fabricCache.set(cacheKey, videoUrl);
          console.log(`✅ Cached demo fabric video for scene ${sceneIndex}`);
          console.log(`📊 Total cached videos: ${fabricCache.size}`);
          
          return NextResponse.json({
            videoUrl,
            cached: false,
            demo: true,
            sceneIndex,
          });
        }
      } catch (_error) {
        console.log('⏳ Hardcoded demo request not ready or not found, will generate new video...');
        // Continue with normal flow below
      }
    }

    console.log(`🎬 Generating NEW fabric video for scene ${sceneIndex}`);
    console.log(`📍 Image URL: ${imageUrl}`);
    console.log(`📍 Audio data size: ${audioData.length} bytes`);

    // Convert audio data to blob
    console.log('📦 Converting audio data to blob...');
    const audioBytes = new Uint8Array(audioData);
    
    // Split audio into 10-second chunks (rough estimate: 128kbps = ~16KB/sec)
    // 10 seconds ≈ 160KB (this is an approximation)
    const BYTES_PER_SECOND_ESTIMATE = 16384; // ~128kbps
    const CHUNK_DURATION_SECONDS = 10;
    const maxBytesPerChunk = BYTES_PER_SECOND_ESTIMATE * CHUNK_DURATION_SECONDS;
    
    console.log(`✂️ Splitting audio into ~${CHUNK_DURATION_SECONDS}s chunks (max ${maxBytesPerChunk} bytes each)`);
    console.log(`📊 Original audio: ${audioBytes.length} bytes`);
    console.log(`📊 Estimated chunks: ${Math.ceil(audioBytes.length / maxBytesPerChunk)}`);
    
    // For now, just use the first 10-second chunk to avoid long processing times
    const firstChunkBytes = audioBytes.slice(0, Math.min(maxBytesPerChunk, audioBytes.length));
    console.log(`✅ Using first chunk: ${firstChunkBytes.length} bytes (~${Math.round(firstChunkBytes.length / BYTES_PER_SECOND_ESTIMATE)}s)`);
    
    const audioBlob = new Blob([firstChunkBytes], { type: 'audio/mpeg' });
    console.log(`📦 Audio blob size: ${audioBlob.size} bytes`);
    
    // Convert blob to File for fal.ai upload
    const audioFile = new File([audioBlob], 'scene-audio.mp3', { type: 'audio/mpeg' });
    
    console.log('⬆️ Uploading audio to fal.ai storage...');
    const falAudioUrl = await fal.storage.upload(audioFile);
    console.log(`✅ Uploaded audio to fal.ai: ${falAudioUrl}`);

    // Submit fabric video generation job and store request_id for resumability
    console.log('🎥 Submitting fabric job to fal.ai...');
    console.log('🎥 Model: veed/fabric-1.0/fast');
    console.log('🎥 Request payload:', JSON.stringify({
      image_url: imageUrl,
      audio_url: falAudioUrl,
      resolution: '720p',
    }, null, 2));
    
    console.log('⏳ Submitting to queue...');
    const { request_id } = await fal.queue.submit('veed/fabric-1.0/fast', {
      input: {
        image_url: imageUrl,
        audio_url: falAudioUrl,
        resolution: '720p',
      },
    });
    
    console.log(`✅ Job submitted with request_id: ${request_id}`);
    console.log(`💾 Caching request_id for resumability`);
    console.log('  - Cache key:', cacheKey);
    console.log('  - Request ID:', request_id);
    
    // Cache the request_id so we can resume if page reloads
    pendingRequestCache.set(cacheKey, request_id);
    console.log(`📊 Total pending requests: ${pendingRequestCache.size}`);
    
    // Poll for completion with longer timeout
    console.log('⏳ Polling for completion...');
    let attempts = 0;
    const maxAttempts = 300; // 5 minutes max (300 * 1 second)
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      try {
        // Try to get the result
        const result = await fal.queue.result('veed/fabric-1.0/fast', {
          requestId: request_id,
        });
        
        console.log('✅ Fabric generation complete for scene', sceneIndex);
        console.log('📦 Full result object:', JSON.stringify(result, null, 2));
        
        const videoUrl = result.data?.video?.url;
        
        if (!videoUrl) {
          throw new Error('No video URL in response');
        }
        
        // Cache and return
        console.log('💾 Caching video:');
        console.log('  - Cache key:', cacheKey);
        console.log('  - Video URL:', videoUrl);
        fabricCache.set(cacheKey, videoUrl);
        pendingRequestCache.delete(cacheKey); // Remove from pending
        console.log(`✅ Cached fabric video for scene ${sceneIndex}`);
        console.log(`📊 Total cached videos: ${fabricCache.size}`);
        console.log(`📊 Pending requests: ${pendingRequestCache.size}`);
        
        return NextResponse.json({
          videoUrl,
          cached: false,
          sceneIndex,
        });
        
      } catch (_error: unknown) {
        // If result not ready yet, check status
        const status = await fal.queue.status('veed/fabric-1.0/fast', {
          requestId: request_id,
          logs: true,
        });
        
        if (attempts % 10 === 0) { // Log every 10 seconds
          console.log(`📊 [${Math.floor(attempts / 60)}m ${attempts % 60}s] Status for scene ${sceneIndex}:`, status.status);
        }
        
        if (status.status === 'IN_PROGRESS' && 'logs' in status && status.logs && attempts % 10 === 0) {
          status.logs.forEach((log: { message: string }) => {
            console.log(`  📝 ${log.message}`);
          });
        }
        
        attempts++;
        
        if (attempts >= maxAttempts) {
          console.error(`❌ Fabric generation timed out after 5 minutes for scene ${sceneIndex}`);
          console.error(`📍 Request ID: ${request_id} (still cached for resumption)`);
          throw new Error('Fabric generation timed out after 5 minutes');
        }
      }
    }
    
    throw new Error('Fabric generation failed - exited polling loop without result');
  } catch (error: unknown) {
    console.error('❌ Fabric API Error:', error);
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
        error: 'Failed to generate fabric video',
        details: message,
        type: typeName,
      },
      { status: 500 }
    );
  }
}

