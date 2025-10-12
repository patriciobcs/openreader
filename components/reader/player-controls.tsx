'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Loader2,
} from 'lucide-react';
import { PlaybackState } from '@/lib/types';
import { formatTime } from '@/lib/text-utils';

interface PlayerControlsProps {
  playbackState: PlaybackState;
  playbackSpeed: number;
  currentTime: number;
  totalDuration: number;
  onPlay: () => void;
  onPause: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek?: (time: number) => void;
  loadedProgress?: number;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function PlayerControls({
  playbackState,
  playbackSpeed,
  currentTime,
  totalDuration,
  onPlay,
  onPause,
  onSkipForward,
  onSkipBackward,
  onSpeedChange,
  onSeek,
  loadedProgress = 100,
}: PlayerControlsProps) {
  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading';
  const isIdle = playbackState === 'idle';
  
  // Skip buttons only work when actually playing
  const canSkip = isPlaying && !isLoading;
  // Speed can be changed anytime we have content
  const canChangeSpeed = !isIdle;

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="w-full space-y-2">
      {/* Playback Controls - Main Row */}
      <div className="flex items-center justify-between gap-3">
        {/* Skip Backward */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onSkipBackward}
          disabled={!canSkip}
          className="h-8 w-8 hover:bg-black/5 dark:hover:bg-white/5"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </Button>

        {/* Progress and Time */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground/70 w-8 text-right">{formatTime(currentTime)}</span>
          
          {/* Slider with loading progress */}
          <div className="flex-1 relative">
            {/* Background - loaded progress (YouTube-style) */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded-full bg-muted overflow-hidden pointer-events-none">
              <div 
                className="h-full bg-muted-foreground/30 transition-all duration-300"
                style={{ width: `${loadedProgress}%` }}
              />
            </div>
            
            {/* Slider on top */}
            <Slider
              value={[currentTime]}
              max={totalDuration || 100}
              step={0.1}
              disabled={isIdle}
              onValueChange={(value) => {
                if (onSeek && value[0] !== undefined) {
                  onSeek(value[0]);
                }
              }}
              className="relative z-10"
            />
          </div>
          
          <span className="text-[9px] text-muted-foreground/70 w-8">{formatTime(totalDuration)}</span>
        </div>

        {/* Main Play Button */}
        <Button
          size="icon"
          className="h-10 w-10 rounded-full shadow-md"
          onClick={() => {
            console.log('🎮 PLAY BUTTON CLICKED!', { isPlaying, playbackState });
            if (isPlaying) {
              console.log('Pausing...');
              onPause();
            } else {
              console.log('Starting playback...');
              onPlay();
            }
          }}
          disabled={false}
          title={isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>

        {/* Skip Forward */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onSkipForward}
          disabled={!canSkip}
          className="h-8 w-8 hover:bg-black/5 dark:hover:bg-white/5"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Speed Control - Compact Row */}
      <div className="flex items-center justify-center gap-1">
        {SPEED_OPTIONS.map((speed) => (
          <button
            key={speed}
            onClick={() => onSpeedChange(speed)}
            disabled={!canChangeSpeed}
            className={`
              px-2 py-0.5 rounded-full text-[9px] font-medium transition-all
              ${playbackSpeed === speed 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10'
              }
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
          >
            {speed}×
          </button>
        ))}
      </div>
    </div>
  );
}

