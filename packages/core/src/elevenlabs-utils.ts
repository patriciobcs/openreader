/**
 * ElevenLabs Character-to-Word Alignment Utilities
 * Converts character-level timestamps to word-level timestamps
 */

import { WordInfo } from './types';
import type { ElevenLabsAlignment } from './types';

export interface WordTimestamp {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

/**
 * Convert ElevenLabs character-level timestamps to word-level timestamps
 * FIXED: Proper character-to-word alignment that accounts for spaces
 */
export function convertCharacterTimingsToWords(
  text: string,
  alignment: ElevenLabsAlignment,
  globalStartIndex: number = 0
): WordTimestamp[] {
  const words = text.trim().split(/\s+/);
  const wordTimings: WordTimestamp[] = [];
  
  // Remove whitespace characters from alignment and build timing array
  const nonSpaceChars: Array<{ char: string; start: number; end: number }> = [];
  
  // Handle both camelCase (SDK) and snake_case (raw API) properties
  const characters = alignment.characters;
  const startTimes = (alignment as any).characterStartTimesSeconds || (alignment as any).character_start_times_seconds;
  const endTimes = (alignment as any).characterEndTimesSeconds || (alignment as any).character_end_times_seconds;
  
  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    if (char.trim() !== '') {
      nonSpaceChars.push({
        char,
        start: startTimes[i],
        end: endTimes[i]
      });
    }
  }
  
  console.log(`📊 Processing: ${words.length} words, ${nonSpaceChars.length} non-space chars`);
  
  // Match words to character sequences
  let charIndex = 0;
  
  for (let wordIdx = 0; wordIdx < words.length; wordIdx++) {
    const word = words[wordIdx];
    const wordLength = word.length;
    
    // Get timing for this word from its characters
    let wordStart = Infinity;
    let wordEnd = 0;
    let matchedChars = 0;
    
    // Match characters for this word
    for (let i = 0; i < wordLength && charIndex + i < nonSpaceChars.length; i++) {
      const charData = nonSpaceChars[charIndex + i];
      
      // Verify character match (case insensitive)
      if (charData.char.toLowerCase() === word[i].toLowerCase()) {
        wordStart = Math.min(wordStart, charData.start);
        wordEnd = Math.max(wordEnd, charData.end);
        matchedChars++;
      } else {
        console.warn(`⚠️ Character mismatch at word "${word}": expected "${word[i]}", got "${charData.char}"`);
        break;
      }
    }
    
    // If we matched all characters, use the timing
    if (matchedChars === wordLength && wordStart !== Infinity) {
      wordTimings.push({
        text: word,
        start: wordStart,
        end: wordEnd,
        confidence: 1.0 // High confidence for ElevenLabs timestamps
      });
      
      charIndex += wordLength; // Move to next word's characters
    } else {
      // Fallback: estimate based on previous word or default
      let fallbackStart: number;
      let fallbackEnd: number;
      
      if (wordTimings.length > 0) {
        fallbackStart = wordTimings[wordTimings.length - 1].end;
        fallbackEnd = fallbackStart + 0.3;
      } else {
        fallbackStart = 0;
        fallbackEnd = 0.3;
      }
      
      console.warn(`⚠️ Using fallback timing for word "${word}"`);
      
      wordTimings.push({
        text: word,
        start: fallbackStart,
        end: fallbackEnd,
        confidence: 0.5 // Lower confidence for fallback timings
      });
      
      charIndex += wordLength;
    }
  }
  
  console.log(`✨ ElevenLabs: Converted ${nonSpaceChars.length} chars → ${wordTimings.length} words (${charIndex} chars used)`);
  
  return wordTimings;
}

/**
 * Create a visual indicator showing ElevenLabs timing quality
 */
export function getElevenLabsTimingQuality(wordTimings: WordInfo[]): {
  quality: 'excellent' | 'good' | 'fair';
  accuracy: number;
  message: string;
} {
  // ElevenLabs timing is always excellent since it comes from the engine
  const hasValidTimings = wordTimings.every(w => w.endTime > w.startTime);
  
  if (hasValidTimings) {
    return {
      quality: 'excellent',
      accuracy: 99.9,
      message: 'Perfect sync from ElevenLabs engine'
    };
  }
  
  return {
    quality: 'good',
    accuracy: 95,
    message: 'High-quality sync from ElevenLabs'
  };
}

/**
 * Validate ElevenLabs response structure
 */
export function isValidElevenLabsResponse(data: any): boolean {
  return (
    data &&
    typeof data.audio_base64 === 'string' &&
    data.alignment &&
    Array.isArray(data.alignment.characters) &&
    Array.isArray(data.alignment.character_start_times_seconds) &&
    Array.isArray(data.alignment.character_end_times_seconds) &&
    data.alignment.characters.length === data.alignment.character_start_times_seconds.length &&
    data.alignment.characters.length === data.alignment.character_end_times_seconds.length
  );
}


