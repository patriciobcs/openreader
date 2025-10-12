'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AudioChunk } from '@/lib/types';

interface ReaderDisplayProps {
  chunks: AudioChunk[];
  currentWordIndex: number;
}

export function ReaderDisplay({ chunks, currentWordIndex }: ReaderDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  // Auto-scroll to keep active word visible
  useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
      const wordElement = activeWordRef.current;
      const container = containerRef.current;
      
      const wordRect = wordElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const isVisible = 
        wordRect.top >= containerRect.top &&
        wordRect.bottom <= containerRect.bottom;
      
      if (!isVisible) {
        wordElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentWordIndex]);

  // Flatten all words from all chunks
  const allWords = chunks.flatMap(chunk => chunk.words);

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div
          ref={containerRef}
          className="prose prose-lg max-w-none overflow-y-auto max-h-[400px] leading-relaxed"
        >
          {allWords.length > 0 ? (
            <div className="text-foreground">
              {allWords.map((word, idx) => {
                const isActive = idx === currentWordIndex;
                return (
                  <span
                    key={`word-${idx}`}
                    ref={isActive ? activeWordRef : null}
                    className={`
                      inline-block transition-all duration-200 px-1 py-0.5 rounded
                      ${isActive 
                        ? 'bg-primary text-primary-foreground font-medium scale-105' 
                        : 'hover:bg-muted'
                      }
                    `}
                  >
                    {word.text}{' '}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              Enter text above to get started
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

