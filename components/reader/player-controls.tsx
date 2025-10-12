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
    <Card className="w-full">
      <CardContent className="p-6 space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            disabled={isIdle}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onSkipBackward}
            disabled={!canSkip}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            className="h-12 w-12"
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
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onSkipForward}
            disabled={!canSkip}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">Speed:</span>
          {SPEED_OPTIONS.map((speed) => (
            <Button
              key={speed}
              variant={playbackSpeed === speed ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSpeedChange(speed)}
              disabled={!canChangeSpeed}
              className="min-w-[60px]"
            >
              {speed}x
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

