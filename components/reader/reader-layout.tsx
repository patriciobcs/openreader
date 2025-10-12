'use client';

import { TextInput } from './text-input';
import { ReaderDisplay } from './reader-display';
import { PlayerControls } from './player-controls';
import { ProviderSelector } from './provider-selector';
import { ImmersionSelector } from './immersion-selector';
import { AudioChunk, PlaybackState, TTSProvider, ImmersionMode } from '@/lib/types';
import { Loader2 } from 'lucide-react';

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
  immersionImageUrl?: string | null;
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
  immersionImageUrl,
  isGeneratingImage = false,
  onImmersionChange,
}: ReaderLayoutProps) {
  const hasContent = chunks.length > 0;
  const isImmersive = hasContent;
  const showImage = immersionImageUrl && (immersionMode === 'vivid' || immersionMode === 'theater');

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Full-Screen Background Image - Covers entire viewport */}
      {showImage && (
        <div
          className="fixed inset-0 transition-opacity duration-1000"
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

      {/* Loading indicator for image generation */}
      {isGeneratingImage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-black/80 text-white rounded-lg text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating scene...</span>
        </div>
      )}

      {/* Fixed Header - Only when immersive */}
      {isImmersive && (
        <div className="fixed top-0 left-0 right-0 z-20 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className={`text-lg font-semibold ${showImage ? 'text-white drop-shadow-lg' : ''}`}>
              OpenReader
            </h1>
            <button
              onClick={() => {
                onTextChange('');
              }}
              className={`text-sm transition-colors px-3 py-1.5 rounded-md ${
                showImage 
                  ? 'text-white/70 hover:text-white hover:bg-white/10 drop-shadow-lg' 
                  : 'text-white hover:text-white hover:bg-secondary'
              }`}
            >
              ← New Text
            </button>
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
                       Transform your text into natural speech
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
                    {immersionMode === 'ambient' && immersionImageUrl && (
                      <div 
                        className="sticky top-16 z-20 w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-2xl transition-opacity duration-1000"
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
                    
                    {/* Add padding top in ambient mode to prevent text from going behind sticky image */}
                    <div style={{ paddingTop: immersionMode === 'ambient' && immersionImageUrl ? '32px' : '0' }}>
                      <ReaderDisplay
                        chunks={chunks}
                        currentWordIndex={currentWordIndex}
                        onWordClick={onWordClick}
                        immersionMode={immersionMode}
                      />
                    </div>
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
                 <p>Powered by ElevenLabs & SLNG TTS APIs</p>
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

