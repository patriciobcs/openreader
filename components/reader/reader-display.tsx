'use client';

import { useEffect, useRef, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { AudioChunk, WordInfo } from '@/lib/types';

import { ImmersionMode } from '@/lib/types';

interface ReaderDisplayProps {
  chunks: AudioChunk[];
  currentWordIndex: number;
  onWordClick?: (wordIndex: number) => void;
  immersionMode?: ImmersionMode;
}

// Mode-specific styling configurations
// To add a new immersion mode:
// 1. Add the mode name to ImmersionMode type in lib/types.ts
// 2. Add the mode preset to IMMERSION_PRESETS in components/reader/immersion-selector.tsx
// 3. Add a new configuration object here with container, text, and cursor styles
const IMMERSION_STYLES = {
  focus: {
    container: {
      background: 'transparent',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      boxShadow: 'none',
    },
    text: {
      base: '#374151', // gray-700
      read: '#111827', // gray-900
      unread: '#9CA3AF', // gray-400
    },
    cursor: {
      bg: '#111827', // gray-900
      textColor: '#FFFFFF',
    },
  },
  ambient: {
    container: {
      background: 'transparent',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      boxShadow: 'none',
    },
    text: {
      base: '#374151', // gray-700
      read: '#111827', // gray-900
      unread: '#9CA3AF', // gray-400
    },
    cursor: {
      bg: '#111827', // gray-900
      textColor: '#FFFFFF',
    },
  },
  vivid: {
    container: {
      background: 'transparent',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      boxShadow: 'none',
    },
    text: {
      base: '#FFFFFF',
      read: '#FFFFFF',
      unread: 'rgba(255, 255, 255, 0.5)',
    },
    cursor: {
      bg: '#FFFFFF',
      textColor: '#000000',
    },
  },
  theater: {
    container: {
      background: 'transparent', // No background in theater mode
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      boxShadow: 'none',
    },
    text: {
      base: '#FFFFFF',
      read: '#FFFFFF',
      unread: 'rgba(255, 255, 255, 0.5)',
    },
    cursor: {
      bg: '#FFFFFF',
      textColor: '#000000',
    },
  },
};

// Individual word component with smooth sliding cursor
const Word = memo(({ word, isActive, isRead, onClick, modeStyles }: { 
  word: WordInfo; 
  isActive: boolean; 
  isRead: boolean;
  onClick?: (index: number) => void;
  modeStyles: typeof IMMERSION_STYLES.focus;
}) => {
  return (
    <span
      className="inline-block px-1 py-0.5 mx-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => onClick?.(word.index)}
      style={{
        position: 'relative',
        fontWeight: isActive ? 600 : 400,
        zIndex: 10,
        color: isActive ? modeStyles.cursor.textColor : (isRead ? modeStyles.text.read : modeStyles.text.unread),
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
            backgroundColor: modeStyles.cursor.bg,
            opacity: 1,
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
          className="absolute rounded"
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

export const ReaderDisplay = memo(function ReaderDisplay({ 
  chunks, 
  currentWordIndex, 
  onWordClick,
  immersionMode = 'focus' 
}: ReaderDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  // Get styles for current mode
  const modeStyles = IMMERSION_STYLES[immersionMode];

  // Auto-scroll to keep active word visible (optimized)
  useEffect(() => {
    if (!activeWordRef.current || !containerRef.current) return;
    
    const wordElement = activeWordRef.current;
    const container = containerRef.current;
    
    const wordRect = wordElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Define margins based on mode
    // In ambient mode, account for sticky image at top
    const topMargin = immersionMode === 'ambient' ? 380 : 120;
    const bottomMargin = immersionMode === 'ambient' ? 200 : 200;
    
    // Calculate the center zone where we want the cursor to stay
    // Start scrolling when word approaches the middle third of the viewport
    const viewportHeight = containerRect.height;
    const middleZoneTop = containerRect.top + (viewportHeight * 0.35); // 35% from top
    const middleZoneBottom = containerRect.bottom - (viewportHeight * 0.35); // 35% from bottom
    
    // Check if word is in comfortable reading zone
    const isInComfortZone = 
      wordRect.top >= middleZoneTop &&
      wordRect.bottom <= middleZoneBottom;
    
    // Also check minimum margins for safety (especially in ambient mode)
    const hasMinimumMargins =
      wordRect.top >= containerRect.top + topMargin &&
      wordRect.bottom <= containerRect.bottom - bottomMargin;
    
    // Scroll if word is outside comfort zone or too close to edges
    if (!isInComfortZone || !hasMinimumMargins) {
      if (immersionMode === 'ambient') {
        // For ambient mode, scroll to position word below sticky image
        const elementTop = wordElement.offsetTop;
        const scrollOffset = elementTop - topMargin;
        
        container.scrollTo({
          top: Math.max(0, scrollOffset),
          behavior: 'smooth'
        });
      } else {
        // For other modes, smoothly position word in the comfortable middle zone
        const elementTop = wordElement.offsetTop;
        const containerScrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        
        // Calculate scroll position to place word at 40% from top (comfortable reading position)
        const targetScrollTop = elementTop - (containerHeight * 0.4);
        
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
      }
    }
  }, [currentWordIndex, immersionMode]);

  // Memoize flattened words to prevent unnecessary re-renders
  // This is CRITICAL - without memoization, chunks.flatMap creates a new array
  // on every render, causing React to re-render all word spans
  const allWords = useMemo(() => {
    return chunks.flatMap(chunk => chunk.words);
  }, [chunks]);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-4xl mx-auto overflow-y-auto max-h-[65vh] px-16 rounded-xl scrollbar-hide"
      style={{
        ...modeStyles.container,
        paddingTop: '3rem',
        paddingBottom: '3rem',
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
      }}
    >
        {allWords.length > 0 ? (
        <motion.div 
          className="text-lg md:text-xl leading-relaxed text-justify hyphens-auto"
          style={{ color: modeStyles.text.base }}
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
                <Word 
                  word={word} 
                  isActive={isActive} 
                  isRead={isRead}
                  onClick={onWordClick}
                  modeStyles={modeStyles}
                />
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

