'use client';

import { useState, useEffect, useRef } from 'react';
import { TextInput } from './text-input';
import { ReaderDisplay } from './reader-display';
import { PlayerControls } from './player-controls';
import { ProviderSelector } from './provider-selector';
import { AudioChunk, PlaybackState, TTSProvider, ImmersionMode } from '@openreader/core/types';
import { Loader2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShareButton } from './share-button';

interface ReaderLayoutProps {
  text: string;
  chunks: AudioChunk[];
  currentWordIndex: number;
  playbackState: PlaybackState;
  playbackSpeed: number;
  currentTime: number;
  totalDuration: number;
  provider: TTSProvider;
  onTextChange: (text: string) => void;
  onUseDemo: () => void;
  onPlay: () => void;
  onPause: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onSpeedChange: (speed: number) => void;
  onProviderChange: (provider: TTSProvider) => void;
  onWordClick?: (wordIndex: number) => void;
  onSeek?: (time: number) => void;
  loadedProgress?: number;
  immersionMode?: ImmersionMode;
  pendingMode?: ImmersionMode | null;
  immersionImageUrl?: string | null;
  immersionVideoUrl?: string | null;
  isGeneratingImage?: boolean;
  onImmersionChange?: (mode: ImmersionMode) => void;
}

export function ReaderLayout({
  text,
  chunks,
  currentWordIndex,
  playbackState,
  playbackSpeed,
  currentTime,
  totalDuration,
  provider,
  onTextChange,
  onUseDemo,
  onPlay,
  onPause,
  onSkipForward,
  onSkipBackward,
  onSpeedChange,
  onProviderChange,
  onWordClick,
  onSeek,
  loadedProgress,
  immersionMode = 'focus',
  pendingMode = null,
  immersionImageUrl,
  immersionVideoUrl,
  isGeneratingImage = false,
  onImmersionChange,
}: ReaderLayoutProps) {
  const hasContent = chunks.length > 0;
  const isImmersive = hasContent;
  
  // Video element ref for controlling playback
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Track video restart to prevent multiple restarts
  const isRestartingRef = useRef(false);
  
  // Track which images have been loaded
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set());
  
  // Preload images when URL changes
  useEffect(() => {
    if (immersionImageUrl && !loadedImages.has(immersionImageUrl)) {
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(immersionImageUrl));
      };
      img.onerror = () => {
        console.error('Failed to load image:', immersionImageUrl);
      };
      img.src = immersionImageUrl;
    }
  }, [immersionImageUrl, loadedImages]);
  
  // Sync video playback with audio state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (playbackState === 'playing') {
      video.play().catch(err => {
        console.warn('Video play failed:', err);
      });
    } else if (playbackState === 'paused' || playbackState === 'idle' || playbackState === 'ended') {
      video.pause();
    }
  }, [playbackState]);
  
  // Sync video playback speed with audio
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    video.playbackRate = playbackSpeed;
  }, [playbackSpeed]);
  
  // Reset video when URL changes (scene change)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !immersionVideoUrl) return;
    
    // Reset video to start when URL changes
    video.currentTime = 0;
    isRestartingRef.current = false; // Reset the restart flag for new video
    console.log('🔄 Video reset for new scene');
  }, [immersionVideoUrl]);
  
  // Sync video time with audio when seeking (with small buffer)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    
    // Only sync if video time differs significantly from audio time
    const timeDiff = Math.abs(video.currentTime - currentTime);
    if (timeDiff > 0.1) { // 100ms threshold
      video.currentTime = currentTime;
    }
  }, [currentTime]);
  
  // Only show image/video if it's loaded
  const isImageLoaded = immersionImageUrl ? loadedImages.has(immersionImageUrl) : false;
  const isVideoLoaded = immersionVideoUrl ? loadedVideos.has(immersionVideoUrl) : false;
  
  // Theater mode uses BOTH image background (like vivid) AND video narrator
  const showImage = immersionImageUrl && (immersionMode === 'vivid' || immersionMode === 'theater') && isImageLoaded;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Full-Screen Background Image - Covers entire viewport */}
      {showImage && (
        <div
          key={immersionImageUrl}
          className="fixed inset-0 animate-in fade-in duration-1000"
          style={{
            zIndex: 0,
            width: '100vw',
            height: '100vh',
          }}
        >
          <img
            src={immersionImageUrl}
            alt="Scene backdrop"
            className="w-full h-full object-cover"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top', // Keep top visible, crop bottom
            }}
          />
        </div>
      )}

      {/* Loading indicator for image/video generation */}
      {isGeneratingImage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-black/80 text-white rounded-lg text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating scenes...</span>
        </div>
      )}
      
      {/* Loading indicator when waiting for images/videos to load */}
      {!isGeneratingImage && ((immersionMode === 'vivid' && immersionImageUrl && !isImageLoaded) ||
        (immersionMode === 'ambient' && immersionImageUrl && !isImageLoaded) ||
        (immersionMode === 'theater' && ((immersionImageUrl && !isImageLoaded) || (immersionVideoUrl && !isVideoLoaded))) ||
        (immersionMode === 'cinematic' && immersionVideoUrl && !isVideoLoaded)) && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-black/80 text-white rounded-lg text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading scene...</span>
        </div>
      )}

      {/* Fixed Header - Only when immersive */}
      {isImmersive && (
        <div className="fixed top-0 left-0 right-0 z-20 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className={`text-lg font-semibold ${showImage ? 'text-white drop-shadow-lg' : 'text-foreground'}`}>
              OpenReader
            </h1>
            <div className="flex items-center gap-2">
              <ShareButton 
                text={text} 
                immersionMode={immersionMode} 
                disabled={!text}
                isDarkBackground={!!showImage}
              />
              <button
                onClick={() => {
                  onTextChange('');
                }}
                className={`text-sm transition-colors px-3 py-1.5 rounded-md flex items-center gap-2 ${
                  showImage 
                    ? 'text-white/70 hover:text-white hover:bg-white/10 drop-shadow-lg' 
                    : 'text-foreground/70 hover:text-foreground hover:bg-secondary'
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                New Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={`relative z-10 ${showImage ? 'flex items-center justify-center min-h-screen' : ''}`}>
        <div className={`container mx-auto px-6 transition-all duration-500 ${isImmersive ? 'py-4 max-w-5xl' : 'py-8 max-w-4xl'
          } ${showImage ? 'my-auto' : ''}`}>
        <div>
                 {/* Header - Only when NOT immersive */}
                 {!isImmersive && (
                   <div className="flex flex-col items-center text-center mb-8">
                     <h1 className="text-4xl font-bold tracking-tight mb-2">
                       OpenReader
                     </h1>
                     <p className="text-muted-foreground">
                       Transform any text content into immersive experiences
                     </p>
                   </div>
                 )}

                {/* Provider Selector */}
                {!isImmersive && (
                  <div className="flex justify-center mb-6">
                    <ProviderSelector
                      provider={provider}
                      onChange={onProviderChange}
                      disabled={playbackState !== 'idle'}
                    />
                  </div>
                )}

              {/* Main Content */}
              <div className={hasContent ? 'pb-40' : 'space-y-6'}>
                {/* Text Input - Hidden when we have content */}
                {!hasContent && (
                  <TextInput
                    value={text}
                    onChange={onTextChange}
                    onUseDemo={onUseDemo}
                    disabled={false}
                  />
                )}

                {/* Reader Display - Shown when there are chunks (Immersive) */}
                {hasContent && (
                  <div className="relative">
                    {/* Sticky Ambient Image Box - Smaller 16:9 aspect ratio, stays at top */}
                    {immersionMode === 'ambient' && immersionImageUrl && isImageLoaded && (
                      <div
                        key={immersionImageUrl}
                        className="sticky top-16 z-20 w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-2xl animate-in fade-in duration-700"
                        style={{
                          aspectRatio: '16 / 9',
                          maxHeight: '280px',
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
                        }}
                      >
                        <img
                          src={immersionImageUrl}
                          alt="Scene illustration"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    {/* Cinematic Mode Layout - Full-screen talking video with text overlaid */}
                    {immersionMode === 'cinematic' && immersionVideoUrl ? (
                      <div className="fixed inset-0 z-10 flex flex-col">
                        {/* Full-Screen Talking Video */}
                        <div
                          key={immersionVideoUrl}
                          className="flex-1 relative overflow-hidden"
                        >
                          {!isVideoLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black">
                              <Loader2 className="h-12 w-12 animate-spin text-white" />
                            </div>
                          )}
                          <video
                            ref={videoRef}
                            key={immersionVideoUrl}
                            src={immersionVideoUrl}
                            className={cn(
                              "w-full h-full object-cover transition-opacity duration-500",
                              isVideoLoaded ? "opacity-100" : "opacity-0"
                            )}
                            muted
                            playsInline
                            onLoadedData={() => {
                              console.log('✅ Cinematic video loaded:', immersionVideoUrl);
                              console.log('📊 Video duration:', videoRef.current?.duration, 'seconds');
                              setLoadedVideos(prev => new Set(prev).add(immersionVideoUrl));
                              if (playbackState === 'playing') {
                                videoRef.current?.play().catch(err => {
                                  console.warn('Video auto-play failed:', err);
                                });
                              }
                            }}
                            onError={(e) => {
                              console.error('❌ Video load error:', e);
                            }}
                            onEnded={() => {
                              console.log('🔄 Cinematic video ended, restarting from beginning...');
                              const video = videoRef.current;
                              if (video && !isRestartingRef.current) {
                                isRestartingRef.current = true;
                                console.log('  - Video currentTime:', video.currentTime);
                                console.log('  - Video duration:', video.duration);
                                console.log('  - Resetting currentTime to 0');
                                video.currentTime = 0;
                                console.log('  - Attempting to play again...');
                                video.play()
                                  .then(() => {
                                    console.log('✅ Video successfully restarted');
                                    isRestartingRef.current = false;
                                  })
                                  .catch(err => {
                                    console.error('❌ Video restart failed:', err);
                                    isRestartingRef.current = false;
                                  });
                              }
                            }}
                            onTimeUpdate={() => {
                              // Force loop by checking if we're near the end
                              const video = videoRef.current;
                              if (video && video.duration && video.currentTime >= video.duration - 0.05 && !isRestartingRef.current) {
                                console.log('🔄 Video near end (timeupdate), forcing restart...');
                                console.log('  - currentTime:', video.currentTime, 'duration:', video.duration);
                                isRestartingRef.current = true;
                                video.currentTime = 0;
                                if (playbackState === 'playing') {
                                  video.play()
                                    .then(() => {
                                      console.log('✅ Video successfully restarted (timeupdate)');
                                      isRestartingRef.current = false;
                                    })
                                    .catch(err => {
                                      console.error('❌ Video force restart failed:', err);
                                      isRestartingRef.current = false;
                                    });
                                } else {
                                  isRestartingRef.current = false;
                                }
                              }
                            }}
                          />
                          
                          {/* Text Content Overlay at Bottom - No background */}
                          <div className="absolute bottom-0 left-0 right-0 max-h-[40vh] overflow-y-auto scrollbar-hide">
                            <div className="px-12 py-8 mx-auto max-w-4xl">
                              <ReaderDisplay
                                chunks={chunks}
                                currentWordIndex={currentWordIndex}
                                onWordClick={onWordClick}
                                immersionMode="cinematic"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : immersionMode === 'cinematic' && immersionVideoUrl && !isVideoLoaded ? (
                      /* Cinematic mode waiting for video to load - show normal layout temporarily */
                      <div>
                        <ReaderDisplay
                          chunks={chunks}
                          currentWordIndex={currentWordIndex}
                          onWordClick={onWordClick}
                          immersionMode="focus"
                        />
                      </div>
                    ) : immersionMode === 'theater' && immersionVideoUrl ? (
                      <div className="flex gap-8 items-start max-w-7xl mx-auto">
                        {/* Sticky Video Narrator on the Left - Smaller size */}
                        <div
                          key={immersionVideoUrl}
                          className="sticky top-20 z-30 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in duration-700"
                          style={{
                            width: '240px', // Reduced from 320px
                            aspectRatio: '9 / 16', // Portrait video
                            background: 'rgba(0, 0, 0, 0.95)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          {!isVideoLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <Loader2 className="h-8 w-8 animate-spin text-white" />
                            </div>
                          )}
                          <video
                            ref={videoRef}
                            key={immersionVideoUrl} // Force reload on URL change
                            src={immersionVideoUrl}
                            className={cn(
                              "w-full h-full object-cover transition-opacity duration-500",
                              isVideoLoaded ? "opacity-100" : "opacity-0"
                            )}
                            loop
                            muted
                            playsInline
                            onLoadedData={() => {
                              console.log('✅ Video loaded:', immersionVideoUrl);
                              setLoadedVideos(prev => new Set(prev).add(immersionVideoUrl));
                              // Start playing if audio is already playing
                              if (playbackState === 'playing') {
                                videoRef.current?.play().catch(err => {
                                  console.warn('Video auto-play failed:', err);
                                });
                              }
                            }}
                            onError={(e) => {
                              console.error('❌ Video load error:', e);
                            }}
                            onEnded={() => {
                              console.log('🔄 Video ended, looping...');
                            }}
                          />
                        </div>
                        
                        {/* Text Content on the Right with dark glassmorphic background (like Vivid) */}
                        <div className="flex-1 min-w-0">
                          <ReaderDisplay
                            chunks={chunks}
                            currentWordIndex={currentWordIndex}
                            onWordClick={onWordClick}
                            immersionMode={immersionMode}
                          />
                        </div>
                      </div>
                    ) : immersionMode === 'theater' && (immersionVideoUrl || immersionImageUrl) && (!isVideoLoaded || !isImageLoaded) ? (
                      /* Theater mode waiting for video/image to load - show normal layout temporarily */
                      <div>
                        <ReaderDisplay
                          chunks={chunks}
                          currentWordIndex={currentWordIndex}
                          onWordClick={onWordClick}
                          immersionMode="focus"
                        />
                      </div>
                    ) : (
                      /* Normal layout for non-theater modes */
                      <div style={{ paddingTop: immersionMode === 'ambient' && immersionImageUrl && isImageLoaded ? '32px' : '0' }}>
                        <ReaderDisplay
                          chunks={chunks}
                          currentWordIndex={currentWordIndex}
                          onWordClick={onWordClick}
                          immersionMode={immersionMode}
                        />
                      </div>
                    )}
                  </div>
                 )}
               </div>
         </div>

         {/* Main Content without background */}
         {!showImage && (
           <>
             {/* Footer */}
             {!hasContent && (
               <div className="mt-12 text-center text-sm text-muted-foreground">
                 <p>Powered by ElevenLabs, SLNG.AI, LinkUp, Runwere.ai and VEED.io. Created by @patriciobcs for HackBarna.</p>
               </div>
             )}
           </>
         )}
       </div>

        {/* Floating Player Controls - Apple-style glassmorphic card */}
        {hasContent && (
          <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pointer-events-none">
            <div className="container mx-auto max-w-3xl">
              {chunks[0]?.error && (
                <div className="text-sm text-destructive text-center p-2 mb-2 bg-destructive/10 rounded-lg pointer-events-auto">
                  Error: {chunks[0].error}
                </div>
              )}
               <div 
                 className="pointer-events-auto rounded-xl px-8 py-6"
                 style={
                   immersionMode === 'focus' || immersionMode === 'ambient'
                     ? {
                         background: 'rgba(255, 255, 255, 0.9)',
                         backdropFilter: 'blur(20px)',
                         WebkitBackdropFilter: 'blur(20px)',
                         boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                       }
                     : {
                         background: 'rgba(0, 0, 0, 0.4)',
                         backdropFilter: 'blur(20px)',
                         WebkitBackdropFilter: 'blur(20px)',
                         boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                       }
                 }
               >
                 <PlayerControls
                   playbackState={playbackState}
                   playbackSpeed={playbackSpeed}
                   currentTime={currentTime}
                   totalDuration={totalDuration}
                   onPlay={onPlay}
                   onPause={onPause}
                   onSkipForward={onSkipForward}
                   onSkipBackward={onSkipBackward}
                   onSpeedChange={onSpeedChange}
                   onSeek={onSeek}
                   loadedProgress={loadedProgress}
                   immersionMode={immersionMode}
                   pendingMode={pendingMode}
                   onImmersionChange={onImmersionChange}
                 />
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

