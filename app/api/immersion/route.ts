import { NextRequest, NextResponse } from 'next/server';

interface RunwareRequest {
  taskType: string;
  taskUUID: string;
  model: string;
  positivePrompt: string;
  width: number;
  height: number;
  steps: number;
}

// In-memory cache for generated images
// Key: `${mode}-${textHash}`, Value: imageURL
const imageCache = new Map<string, string>();

// Simple hash function for text
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

export async function POST(request: NextRequest) {
  try {
    const { text, mode, customPrompt } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RUNWARE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'RUNWARE_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Create cache key - Each mode has separate cached images for the same text
    // Example: "ambient-abc123" vs "vivid-abc123" vs "theater-abc123"
    const textHash = hashText(text);
    const cacheKey = `${mode}-${textHash}`;
    
    // Check cache first
    if (imageCache.has(cacheKey)) {
      const cachedUrl = imageCache.get(cacheKey)!;
      console.log(`✨ Returning cached ${mode} image for text hash:`, textHash);
      return NextResponse.json({
        imageUrl: cachedUrl,
        cached: true,
        mode,
      });
    }

    console.log(`🎨 Generating NEW ${mode} image for text hash:`, textHash);

    // Create prompt based on text excerpt
    const textExcerpt = text.substring(0, 200);
    
    let prompt = '';
    let width = 1024;
    let height = 768;
    
    // Use customPrompt if provided, otherwise generate based on mode
    if (customPrompt) {
      prompt = customPrompt;
    } else if (mode === 'ambient') {
      prompt = `Artistic illustration of: "${textExcerpt}". Soft, elegant, minimalist style, gentle colors, serene atmosphere, highly detailed, suitable for text overlay`;
      width = 1024;
      height = 576; // 16:9 aspect ratio for ambient mode (divisible by 64)
    } else if (mode === 'vivid') {
      prompt = `Cinematic scene illustrating: "${textExcerpt}". Atmospheric, dreamy, artistic style, moody lighting, rich colors, highly detailed. Note: White text will be displayed on top of this image, so ensure good contrast with darker tones and atmospheric shadows.`;
      width = 1024;
      height = 768;
    } else if (mode === 'theater') {
      prompt = `Epic cinematic scene: "${textExcerpt}". Dramatic lighting, rich colors, movie poster style, highly detailed, photorealistic. Note: Text will overlay this image.`;
      width = 1024;
      height = 768;
    } else if (mode === 'cinematic') {
      prompt = `Cinematic portrait of a character from this story: "${textExcerpt}". Photorealistic, dramatic lighting, detailed facial features, 4k quality, professional headshot, ready for animation`;
      width = 1024;
      height = 1024; // Square for character portraits
    }

    // Generate unique task UUID
    const taskUUID = crypto.randomUUID();

    const runwareRequest: RunwareRequest = {
      taskType: 'imageInference',
      taskUUID,
      model: 'runware:101@1', // FLUX.1 Dev model
      positivePrompt: prompt,
      width,
      height,
      steps: 20,
    };

    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([runwareRequest]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Runware API Error:', errorText);
      return NextResponse.json(
        { error: `Runware API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✨ Runware response:', data);

    // Extract image URL from response
    const imageURL = data.data?.[0]?.imageURL;

    if (!imageURL) {
      return NextResponse.json(
        { error: 'No image URL in response' },
        { status: 500 }
      );
    }

    // Cache the generated image - mode-specific caching ensures each mode has unique images
    imageCache.set(cacheKey, imageURL);
    console.log(`💾 Cached ${mode} image for text hash: ${textHash} (total cached: ${imageCache.size})`);

    return NextResponse.json({
      imageUrl: imageURL,
      taskUUID,
      cached: false,
      mode,
    });
  } catch (error) {
    console.error('Immersion API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate immersion image' },
      { status: 500 }
    );
  }
}

