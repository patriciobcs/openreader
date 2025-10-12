'use client';

import { useEffect, useRef, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { AudioChunk, WordInfo } from '@/lib/types';

interface ReaderDisplayProps {
  chunks: AudioChunk[];
  currentWordIndex: number;
}

// Individual word component with smooth sliding cursor
const Word = memo(({ word, isActive, isRead }: { 
  word: WordInfo; 
  isActive: boolean; 
  isRead: boolean;
}) => {
  // Debug: log when word is active
  if (isActive) {
    console.log('Active word:', word.text, 'index:', word.index);
  }
  
  return (
    <span
      className="inline-block px-1 py-0.5 mx-0.5 rounded"
      style={{
        position: 'relative',
        fontWeight: isActive ? 600 : 400,
        zIndex: 10,
        color: isActive ? 'white' : (isRead ? 'black' : 'gray'),
      }}
    >
      {isActive && (
        <motion.span
          layoutId="active-cursor"
          className="absolute rounded"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'black',
            opacity: 0.9,
            zIndex: -10,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 40,
            mass: 0.6,
          }}
        />
      )}
      {isRead && !isActive && (
        <span 
          className="absolute rounded bg-red-500"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '',
            zIndex: -10,
          }}
        />
      )}
      {word.text}
    </span>
  );
});
Word.displayName = 'Word';

export const ReaderDisplay = memo(function ReaderDisplay({ chunks, currentWordIndex }: ReaderDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  // Auto-scroll to keep active word visible (optimized)
  useEffect(() => {
    if (!activeWordRef.current || !containerRef.current) return;
    
    const wordElement = activeWordRef.current;
    const container = containerRef.current;
    
    const wordRect = wordElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // More aggressive scroll margins for better visibility
    const isVisible = 
      wordRect.top >= containerRect.top + 80 &&
      wordRect.bottom <= containerRect.bottom - 80;
    
    if (!isVisible) {
      wordElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [currentWordIndex]);

  // Memoize flattened words to prevent unnecessary re-renders
  // This is CRITICAL - without memoization, chunks.flatMap creates a new array
  // on every render, causing React to re-render all word spans
  const allWords = useMemo(() => {
    return chunks.flatMap(chunk => chunk.words);
  }, [chunks]);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-4xl mx-auto overflow-y-auto max-h-[70vh] px-6 py-4"
    >
        {allWords.length > 0 ? (
        <motion.div 
          className="text-foreground text-lg md:text-xl leading-relaxed text-justify hyphens-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {allWords.map((word) => {
            const isActive = word.index === currentWordIndex;
            const isRead = word.index < currentWordIndex;
            
            return (
              <span
                key={`word-${word.index}`}
                ref={isActive ? activeWordRef : null}
              >
                <Word word={word} isActive={isActive} isRead={isRead} />
              </span>
            );
          })}
        </motion.div>
      ) : (
        <motion.div 
          className="text-center text-muted-foreground py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Loading text...
        </motion.div>
      )}
    </div>
  );
});

