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
  const isPlaying = playbackState === 'playing' || playbackState === 'loading';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            OpenReader
          </h1>
          <p className="text-muted-foreground">
            Transform your text into natural speech
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Text Input - Hidden when playing */}
          {!isPlaying && (
            <TextInput
              value={text}
              onChange={onTextChange}
              onUseDemo={onUseDemo}
              disabled={isPlaying}
            />
          )}

          {/* Reader Display - Shown when there are chunks */}
          {chunks.length > 0 && (
            <ReaderDisplay
              chunks={chunks}
              currentWordIndex={currentWordIndex}
            />
          )}

          {/* Player Controls - Shown when there are chunks */}
          {chunks.length > 0 && (
            <div className="space-y-2">
              {chunks[0]?.error && (
                <div className="text-sm text-destructive text-center p-3 bg-destructive/10 rounded-md">
                  Error: {chunks[0].error}
                </div>
              )}
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
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Powered by SLNG// TTS API</p>
        </div>
      </div>
    </div>
  );
}

