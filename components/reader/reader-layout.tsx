'use client';

import { TextInput } from './text-input';
import { ReaderDisplay } from './reader-display';
import { PlayerControls } from './player-controls';
import { AudioChunk, PlaybackState } from '@/lib/types';

interface ReaderLayoutProps {
  text: string;
  chunks: AudioChunk[];
  currentWordIndex: number;
  playbackState: PlaybackState;
  playbackSpeed: number;
  currentTime: number;
  totalDuration: number;
  onTextChange: (text: string) => void;
  onUseDemo: () => void;
  onPlay: () => void;
  onPause: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onSpeedChange: (speed: number) => void;
}

export function ReaderLayout({
  text,
  chunks,
  currentWordIndex,
  playbackState,
  playbackSpeed,
  currentTime,
  totalDuration,
  onTextChange,
  onUseDemo,
  onPlay,
  onPause,
  onSkipForward,
  onSkipBackward,
  onSpeedChange,
}: ReaderLayoutProps) {
  const hasContent = chunks.length > 0;
  const isImmersive = hasContent;

  return (
    <div className="min-h-screen bg-background">
      <div className={`container mx-auto px-4 transition-all duration-500 ${
        isImmersive ? 'py-4 max-w-5xl' : 'py-8 max-w-4xl'
      }`}>
        {/* Header - Smaller when immersive */}
        <div className={`flex items-center justify-between transition-all duration-500 ${
          isImmersive ? 'mb-4' : 'mb-8'
        }`}>
          <div className={`flex-1 text-center ${isImmersive ? 'ml-12' : ''}`}>
            <h1 className={`font-bold tracking-tight transition-all duration-500 ${
              isImmersive ? 'text-2xl mb-1' : 'text-4xl mb-2'
            }`}>
              OpenReader
            </h1>
            {!isImmersive && (
              <p className="text-muted-foreground">
                Transform your text into natural speech
              </p>
            )}
          </div>
          {isImmersive && (
            <button
              onClick={() => {
                onTextChange('');
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted"
            >
              ← New Text
            </button>
          )}
        </div>

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
            <ReaderDisplay
              chunks={chunks}
              currentWordIndex={currentWordIndex}
            />
          )}
        </div>

        {/* Footer */}
        {!hasContent && (
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>Powered by SLNG// TTS API</p>
          </div>
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
            <div className="glass-card pointer-events-auto">
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
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

