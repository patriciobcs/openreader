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
        wordRect.top >= containerRect.top + 100 &&
        wordRect.bottom <= containerRect.bottom - 100;
      
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
    <div
      ref={containerRef}
      className="w-full max-w-4xl mx-auto overflow-y-auto max-h-[70vh] px-6 py-4"
    >
      {allWords.length > 0 ? (
        <div className="text-foreground text-lg md:text-xl leading-relaxed text-justify hyphens-auto">
          {allWords.map((word, idx) => {
            const isActive = idx === currentWordIndex;
            const isRead = idx < currentWordIndex; // Words that have been spoken
            const isUpcoming = idx > currentWordIndex; // Words yet to be spoken
            
            return (
              <span
                key={`word-${idx}`}
                ref={isActive ? activeWordRef : null}
                className={`
                  inline-block transition-all duration-75 px-1 py-0.5 mx-0.5 rounded
                  ${isActive 
                    ? 'bg-primary text-primary-foreground font-semibold scale-105 reader-word-active' 
                    : isRead 
                    ? 'text-foreground/50 bg-muted/30'
                    : 'text-foreground'
                  }
                `}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-12">
          Loading text...
        </div>
      )}
    </div>
  );
}

