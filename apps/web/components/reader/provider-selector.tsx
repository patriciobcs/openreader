'use client';

import { TTSProvider } from '@openreader/core/types';
import { Sparkles, Zap } from 'lucide-react';

interface ProviderSelectorProps {
  provider: TTSProvider;
  onChange: (provider: TTSProvider) => void;
  disabled?: boolean;
}

export function ProviderSelector({ provider, onChange, disabled }: ProviderSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">TTS Provider:</span>
      <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg">
        <button
          onClick={() => onChange('elevenlabs')}
          disabled={disabled}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
            ${provider === 'elevenlabs'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title="ElevenLabs - Perfect sync with character-level timestamps"
        >
          <Sparkles className="h-3 w-3" />
          <span>ElevenLabs</span>
          <span className="text-[9px] opacity-70">(99.9%)</span>
        </button>
        
        <button
          onClick={() => onChange('slng')}
          disabled={disabled}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
            ${provider === 'slng'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title="SLNG - Fast synthesis with audio waveform analysis"
        >
          <Zap className="h-3 w-3" />
          <span>SLNG</span>
          <span className="text-[9px] opacity-70">(99%)</span>
        </button>
      </div>
    </div>
  );
}

