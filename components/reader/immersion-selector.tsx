'use client';

import { ImmersionMode } from '@/lib/types';
import { BookOpen, Sparkles, Image, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImmersionSelectorProps {
  currentMode: ImmersionMode;
  pendingMode?: ImmersionMode | null;
  onModeChange: (mode: ImmersionMode) => void;
  disabled?: boolean;
}

const IMMERSION_PRESETS = [
  {
    id: 'focus' as ImmersionMode,
    name: 'Focus',
    icon: BookOpen,
  },
  {
    id: 'ambient' as ImmersionMode,
    name: 'Ambient',
    icon: Sparkles,
  },
  {
    id: 'vivid' as ImmersionMode,
    name: 'Vivid',
    icon: Image,
  },
  {
    id: 'theater' as ImmersionMode,
    name: 'Theater',
    icon: Film,
  },
];

export function ImmersionSelector({ 
  currentMode,
  pendingMode = null,
  onModeChange, 
  disabled = false 
}: ImmersionSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {IMMERSION_PRESETS.map((preset) => {
        const Icon = preset.icon;
        const isActive = currentMode === preset.id;
        const isPending = pendingMode === preset.id;
        
        return (
          <button
            key={preset.id}
            onClick={() => onModeChange(preset.id)}
            disabled={disabled || isPending}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              currentMode === 'focus' || currentMode === 'ambient'
                ? isActive
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                : isActive 
                  ? "bg-white text-black shadow-sm" 
                  : "bg-white/10 text-white hover:bg-white/20",
              isPending && "animate-pulse opacity-75"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
            <span>{preset.name}</span>
          </button>
        );
      })}
    </div>
  );
}

