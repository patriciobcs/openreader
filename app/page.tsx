'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ReaderLayout } from '@/components/reader/reader-layout';
import { AudioChunk, ImmersionMode, TTSProvider } from '@/lib/types';
import { chunkText } from '@/lib/text-utils';
import { useAudioManager } from '@/hooks/use-audio-manager';

const DEMO_TEXT = `Once upon a time, in a faraway kingdom, there lived a kind and beautiful young girl named Cinderella. She lived with her stepmother and two stepsisters, who were cruel and unkind to her. They made her do all the housework and treated her like a servant.

One day, the king announced that he was hosting a grand ball at the palace, and all the young ladies in the kingdom were invited. Cinderella's stepsisters were very excited and spent days preparing their fancy dresses. But Cinderella was told she could not go.

On the night of the ball, as Cinderella sat crying in the garden, her fairy godmother appeared. With a wave of her magic wand, she transformed a pumpkin into a golden carriage, mice into horses, and Cinderella's rags into a beautiful gown. But she warned Cinderella that the magic would end at midnight.`;

const WORDS_PER_CHUNK = 1000; // For ElevenLabs: generate entire text as one chunk (no cuts!)

export default function Home() {
  const [text, setText] = useState('');
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [provider, setProvider] = useState<TTSProvider>('elevenlabs'); // Default to ElevenLabs for best accuracy
  const [immersionMode, setImmersionMode] = useState<ImmersionMode>('focus');
  const [pendingMode, setPendingMode] = useState<ImmersionMode | null>(null); // Mode being loaded
  const [immersionImageUrl, setImmersionImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [sceneImages, setSceneImages] = useState<Map<number, string>>(new Map());
  const [sceneVideos, setSceneVideos] = useState<Map<number, string>>(new Map());
  const [currentScene, setCurrentScene] = useState(0);
  const [immersionVideoUrl, setImmersionVideoUrl] = useState<string | null>(null);

  // Stable callback for chunk updates to prevent unnecessary re-renders
  const handleChunksUpdate = useCallback((newChunks: AudioChunk[]) => {
    setChunks(newChunks);
  }, []);

  const {
    currentWordIndex,
    playbackState,
    playbackSpeed,
    currentTime,
    totalDuration,
    loadedProgress,
    play,
    pause,
    skipForward,
    skipBackward,
    setSpeed,
    seekToWord,
    seekToTime,
  } = useAudioManager({
    chunks,
    onChunksUpdate: handleChunksUpdate,
    isDemo,
    provider,
  });

  // Auto-play when chunks are loaded
  useEffect(() => {
    if (shouldAutoPlay && chunks.length > 0 && playbackState === 'idle') {
      console.log('🎬 Auto-playing with', chunks.length, 'chunks');
      setShouldAutoPlay(false);
      // Small delay to ensure everything is ready
      setTimeout(() => {
        play();
      }, 50);
    }
  }, [chunks, shouldAutoPlay, playbackState, play]);

  // Update current scene based on word position
  useEffect(() => {
    if (!text || (sceneImages.size === 0 && sceneVideos.size === 0)) return;
    
    const words = text.split(/\s+/);
    const WORDS_PER_SCENE = 150;
    const sceneIndex = Math.floor(currentWordIndex / WORDS_PER_SCENE);
    
    if (sceneIndex !== currentScene) {
      console.log(`🎬 Scene changed: ${currentScene} → ${sceneIndex}`);
      setCurrentScene(sceneIndex);
      
      // Update image for ambient/vivid/theater modes
      if (sceneImages.has(sceneIndex)) {
        setImmersionImageUrl(sceneImages.get(sceneIndex)!);
      }
      
      // Update video for theater mode
      if (sceneVideos.has(sceneIndex)) {
        setImmersionVideoUrl(sceneVideos.get(sceneIndex)!);
      }
    }
  }, [currentWordIndex, text, sceneImages, sceneVideos, currentScene]);

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    if (newText.trim()) {
      const newChunks = chunkText(newText, WORDS_PER_CHUNK);
      console.log('Text changed, created chunks:', newChunks.length);
      setChunks(newChunks);
      setIsDemo(false);
      // Don't auto-play when text changes programmatically (e.g., URL fetch)
      // User must click play button explicitly
      setShouldAutoPlay(false);
      // Reset scene state
      setSceneImages(new Map());
      setSceneVideos(new Map());
      setCurrentScene(0);
      setImmersionImageUrl(null);
      setImmersionVideoUrl(null);
    } else {
      setChunks([]);
      setShouldAutoPlay(false);
      setSceneImages(new Map());
      setSceneVideos(new Map());
      setCurrentScene(0);
      setImmersionImageUrl(null);
      setImmersionVideoUrl(null);
    }
  }, []);

  const handleProviderChange = useCallback((newProvider: TTSProvider) => {
    console.log('Provider changed to:', newProvider);
    setProvider(newProvider);
    // Clear chunks to force re-fetch with new provider
    if (chunks.length > 0) {
      const resetChunks = chunks.map(chunk => ({
        ...chunk,
        audioUrl: null,
        isLoading: false,
      }));
      setChunks(resetChunks);
    }
  }, [chunks]);

  // Split text into scenes (every ~150 words)
  const createScenes = useCallback((fullText: string) => {
    const words = fullText.split(/\s+/);
    const WORDS_PER_SCENE = 150;
    const scenes: string[] = [];
    
    for (let i = 0; i < words.length; i += WORDS_PER_SCENE) {
      const sceneWords = words.slice(i, i + WORDS_PER_SCENE);
      scenes.push(sceneWords.join(' '));
    }
    
    return scenes;
  }, []);

  const handleImmersionChange = useCallback(async (mode: ImmersionMode) => {
    console.log('🎨 Immersion mode change requested:', mode);
    
    // If switching to focus, do it immediately
    if (mode === 'focus') {
      setImmersionMode(mode);
      setPendingMode(null);
      setImmersionImageUrl(null);
      setImmersionVideoUrl(null);
      setSceneImages(new Map());
      setSceneVideos(new Map());
      setCurrentScene(0);
      return;
    }
    
    // Set pending mode (shows loading state)
    setPendingMode(mode);
    
    // Generate images for ambient/vivid modes, or videos for theater mode
    if ((mode === 'ambient' || mode === 'vivid' || mode === 'theater') && text) {
      setIsGeneratingImage(true);
      const scenes = createScenes(text);
      console.log(`📸 Generating ${scenes.length} scenes for ${mode} mode`);
      
      const newSceneImages = new Map<number, string>();
      const newSceneVideos = new Map<number, string>();
      
      try {
        if (mode === 'theater') {
          // For theater mode, generate BOTH background images (like vivid) AND lipsync videos
          console.log('🎬 Generating background images + lipsync videos for theater mode...');
          
          // Generate images and videos in parallel
          // Generate all scenes in parallel, but activate mode as soon as first is ready
          let firstSceneReady = false;
          
          const contentPromises = scenes.map(async (sceneText, index) => {
            // Generate background image
            const imagePromise = fetch('/api/immersion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: sceneText, mode: 'theater' }),
            }).then(res => res.ok ? res.json() : null);
            
            // Generate TTS audio first, then lipsync video
            const videoPromise = (async () => {
              const ttsResponse = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: sceneText,
                  provider: 'elevenlabs',
                }),
              });
              
              if (!ttsResponse.ok) return null;
              
              const ttsData = await ttsResponse.json();
              console.log(`📦 TTS response for scene ${index}:`, { hasAudio: !!ttsData.audio, audioLength: ttsData.audio?.length });
              
              // Pass audio data directly to lipsync API
              if (!ttsData.audio) {
                console.error(`❌ No audio data in TTS response for scene ${index}`);
                return null;
              }
              
              console.log(`🎥 Calling lipsync API for scene ${index} with audio data`);
              
              const lipsyncResponse = await fetch('/api/lipsync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  audioData: ttsData.audio,  // Pass byte array
                  sceneIndex: index 
                }),
              });
              
              if (!lipsyncResponse.ok) {
                const errorText = await lipsyncResponse.text();
                console.error(`❌ Lipsync API error for scene ${index}:`, {
                  status: lipsyncResponse.status,
                  statusText: lipsyncResponse.statusText,
                  body: errorText,
                });
                return null;
              }
              
              return lipsyncResponse.json();
            })();
            
            const [imageData, videoData] = await Promise.all([imagePromise, videoPromise]);
            
            const result = {
              index,
              imageUrl: imageData?.imageUrl,
              videoUrl: videoData?.videoUrl,
            };
            
            // As soon as first scene is ready, activate the mode
            if (index === 0 && !firstSceneReady && result.imageUrl && result.videoUrl) {
              firstSceneReady = true;
              console.log('✅ First scene ready, activating theater mode');
              setSceneImages(new Map([[0, result.imageUrl]]));
              setSceneVideos(new Map([[0, result.videoUrl]]));
              setCurrentScene(0);
              setImmersionImageUrl(result.imageUrl);
              setImmersionVideoUrl(result.videoUrl);
              setImmersionMode(mode);
              setPendingMode(null);
            }
            
            // For subsequent scenes, add them as they become ready
            if (index > 0 && result.imageUrl && result.videoUrl) {
              console.log(`✅ Scene ${index} ready, adding to maps`);
              setSceneImages(prev => new Map(prev).set(index, result.imageUrl!));
              setSceneVideos(prev => new Map(prev).set(index, result.videoUrl!));
            }
            
            return result;
          });
          
          // Wait for all to complete in background
          const results = await Promise.all(contentPromises);
          
          // Final update with all scenes
          results.forEach(result => {
            if (result) {
              if (result.imageUrl) {
                newSceneImages.set(result.index, result.imageUrl);
              }
              if (result.videoUrl) {
                newSceneVideos.set(result.index, result.videoUrl);
              }
            }
          });
          
          setSceneImages(newSceneImages);
          setSceneVideos(newSceneVideos);
          
          console.log(`✨ All scenes ready: ${newSceneImages.size} images + ${newSceneVideos.size} videos`);
        } else {
          // For ambient/vivid modes, generate images
          const imagePromises = scenes.map(async (sceneText, index) => {
            const response = await fetch('/api/immersion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: sceneText, mode }),
            });
            
            if (response.ok) {
              const data = await response.json();
              return { index, imageUrl: data.imageUrl };
            }
            return null;
          });
          
          const results = await Promise.all(imagePromises);
          
          results.forEach(result => {
            if (result) {
              newSceneImages.set(result.index, result.imageUrl);
            }
          });
          
          setSceneImages(newSceneImages);
          setCurrentScene(0);
          // Set initial image
          if (newSceneImages.has(0)) {
            setImmersionImageUrl(newSceneImages.get(0)!);
          }
          console.log(`✨ Generated ${newSceneImages.size} scene images`);
        }
        
        // For non-theater modes, activate the mode once resources are ready
        // (Theater mode activates early, as soon as first scene is ready)
        if (mode !== 'theater') {
          console.log(`✅ Activating ${mode} mode with resources:`, {
            sceneImages: newSceneImages.size,
            sceneVideos: newSceneVideos.size,
            currentImageUrl: immersionImageUrl ? 'SET' : 'NULL',
            currentVideoUrl: immersionVideoUrl ? 'SET' : 'NULL',
          });
          setImmersionMode(mode);
          setPendingMode(null);
        } else {
          console.log(`✅ Theater mode already activated, all ${newSceneImages.size} scenes now available`);
        }
        
      } catch (error) {
        console.error('Error generating scene content:', error);
        setPendingMode(null); // Clear pending on error
      } finally {
        setIsGeneratingImage(false);
      }
    }
  }, [text, createScenes]);

  const handleUseDemo = useCallback(() => {
    console.log('🎬 Use Demo clicked');
    setText(DEMO_TEXT);
    const newChunks = chunkText(DEMO_TEXT, WORDS_PER_CHUNK);
    console.log(`📝 Created ${newChunks.length} chunks of ${WORDS_PER_CHUNK} words each`);
    setChunks(newChunks);
    setIsDemo(true);
    setShouldAutoPlay(true);
  }, []);

  return (
    <ReaderLayout
      text={text}
      chunks={chunks}
      currentWordIndex={currentWordIndex}
      playbackState={playbackState}
      playbackSpeed={playbackSpeed}
      currentTime={currentTime}
      totalDuration={totalDuration}
      provider={provider}
      onTextChange={handleTextChange}
      onUseDemo={handleUseDemo}
      onPlay={play}
      onPause={pause}
      onSkipForward={skipForward}
      onSkipBackward={skipBackward}
      onSpeedChange={setSpeed}
      onProviderChange={handleProviderChange}
      onWordClick={seekToWord}
      onSeek={seekToTime}
      loadedProgress={loadedProgress}
      immersionMode={immersionMode}
      pendingMode={pendingMode}
      immersionImageUrl={immersionImageUrl}
      immersionVideoUrl={immersionVideoUrl}
      isGeneratingImage={isGeneratingImage}
      onImmersionChange={handleImmersionChange}
    />
  );
}
