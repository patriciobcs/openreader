'use client';

import { Button } from '@openreader/ui/button';
import { Slider } from '@openreader/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@openreader/ui/popover';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Loader2,
  Gauge,
} from 'lucide-react';
import { PlaybackState, ImmersionMode } from '@openreader/core/types';
import { formatTime } from '@openreader/core/text-utils';
import { ImmersionSelector } from './immersion-selector';

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
  immersionMode?: ImmersionMode;
  pendingMode?: ImmersionMode | null;
  onImmersionChange?: (mode: ImmersionMode) => void;
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
  immersionMode = 'focus',
  pendingMode = null,
  onImmersionChange,
}: PlayerControlsProps) {
  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading';
  const isIdle = playbackState === 'idle';
  
  // Skip buttons only work when actually playing
  const canSkip = isPlaying && !isLoading;
  // Speed can be changed anytime we have content
  const canChangeSpeed = !isIdle;

  // Color scheme based on immersion mode
  const colors = immersionMode === 'focus' || immersionMode === 'ambient'
    ? {
        text: 'text-gray-900',
        textMuted: 'text-gray-600',
        buttonBase: 'text-gray-900',
        buttonHover: 'hover:bg-transparent',
        buttonActive: 'bg-gray-900 text-white',
        buttonInactive: 'bg-gray-100 text-gray-900',
        sliderBg: 'bg-gray-200',
        sliderProgress: 'bg-gray-400',
        popoverBg: 'bg-white',
        popoverText: 'text-gray-900',
      }
    : {
        text: 'text-white',
        textMuted: 'text-white',
        buttonBase: 'text-white',
        buttonHover: 'hover:bg-white/10',
        buttonActive: 'bg-white text-black',
        buttonInactive: 'bg-white/10 text-white',
        sliderBg: 'bg-white/20',
        sliderProgress: 'bg-white/40',
        popoverBg: 'bg-black/90',
        popoverText: 'text-white',
      };

  return (
    <div className="w-full space-y-2">
      {/* Progress Slider - Full Width */}
      <div className="flex items-center gap-2">
        <span className={`text-xs ${colors.text} font-mono min-w-[40px]`}>
          {formatTime(currentTime)}
        </span>
        
        <div className="flex-1 relative">
          {/* Background - loaded progress (YouTube-style) */}
          <div className={`absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded-full ${colors.sliderBg} overflow-hidden pointer-events-none`}>
            <div 
              className={`h-full ${colors.sliderProgress} transition-all duration-300`}
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
        
        <span className={`text-xs ${colors.text} font-mono min-w-[40px] text-right`}>
          {formatTime(totalDuration)}
        </span>
      </div>

      {/* Controls Row: Playback on Left, Immersion on Right */}
      <div className="flex items-center justify-between gap-6">
        {/* Left: Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Main Play Button */}
          <Button
            size="icon"
            className={`h-11 w-11 rounded-full ${colors.buttonActive} hover:opacity-90`}
            onClick={() => {
              if (isPlaying) {
                onPause();
              } else {
                onPlay();
              }
            }}
            disabled={isLoading}
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

          {/* Skip Backward */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSkipBackward}
            disabled={!canSkip}
            className={`h-9 w-9 ${colors.buttonBase} ${colors.buttonHover}`}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Skip Forward */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSkipForward}
            disabled={!canSkip}
            className={`h-9 w-9 ${colors.buttonBase} ${colors.buttonHover}`}
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Speed Control Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!canChangeSpeed}
                className={`h-9 w-9 ${colors.buttonBase} ${colors.buttonHover}`}
                title={`Speed: ${playbackSpeed}×`}
              >
                <Gauge className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-4 border-0 rounded-xl" 
            align="start"
            style={
              immersionMode === 'focus' || immersionMode === 'ambient'
                ? {
                    background: 'rgba(255, 255, 255, 0.95)',
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
            <div className="flex flex-col gap-1">
              <div className={`text-xs font-semibold px-2 py-1 mb-1 ${colors.popoverText}`}>
                Playback Speed
              </div>
              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => onSpeedChange(speed)}
                  className={`
                    px-3 py-1.5 rounded-md text-sm font-medium transition-all text-left
                    ${playbackSpeed === speed 
                      ? colors.buttonActive
                      : `${colors.popoverText} ${colors.buttonHover}`
                    }
                  `}
                >
                  {speed}×
                </button>
              ))}
            </div>
          </PopoverContent>
          </Popover>
        </div>

        {/* Right: Immersion Control */}
        {onImmersionChange && (
          <div className="flex items-center gap-2">
            <ImmersionSelector
              currentMode={immersionMode}
              pendingMode={pendingMode}
              onModeChange={onImmersionChange}
              disabled={playbackState === 'loading'}
            />
          </div>
        )}
      </div>
    </div>
  );
}

