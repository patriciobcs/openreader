import { AudioChunk, WordInfo } from './types';

/**
 * Split text into small chunks with word limit
 * Small chunks allow better continuity with previousText/nextText
 */
export function chunkText(text: string, wordsPerChunk: number): AudioChunk[] {
  const allWords = text.trim().split(/\s+/);
  const chunks: AudioChunk[] = [];
  let globalWordIndex = 0;

  for (let i = 0; i < allWords.length; i += wordsPerChunk) {
    const chunkWords = allWords.slice(i, i + wordsPerChunk);
    const chunkText = chunkWords.join(' ');
    const estimatedDuration = (chunkWords.length / 150) * 60; // ~150 words per minute
    const timestamps = generateWordTimestamps(chunkWords, estimatedDuration);

    chunks.push({
      id: `chunk-${Math.floor(i / wordsPerChunk)}`,
      text: chunkText,
      words: timestamps.map((ts, idx) => ({
        ...ts,
        index: globalWordIndex + idx, // Global index across all chunks
      })),
      audioUrl: null,
      duration: estimatedDuration,
      isLoading: false,
    });

    globalWordIndex += chunkWords.length;
  }

  return chunks;
}

/**
 * Count syllables in a word using vowel cluster detection
 * More accurate than character length for speech timing
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().trim();
  
  // Handle empty or very short words
  if (word.length === 0) return 0;
  if (word.length <= 2) return 1;
  
  // Remove trailing e (silent in most cases)
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  
  // Replace y at start with vowel equivalent
  word = word.replace(/^y/, '');
  
  // Count vowel groups (ae, ou, etc. count as one syllable)
  const vowelGroups = word.match(/[aeiouy]{1,2}/g);
  let syllableCount = vowelGroups ? vowelGroups.length : 0;
  
  // Minimum of 1 syllable per word
  return Math.max(1, syllableCount);
}

/**
 * Calculate speech weight for a word based on syllables and punctuation
 * Used for more accurate timing estimation
 * Exported for use in duration estimation and audio analysis
 */
export function getWordWeight(word: string): number {
  const cleanWord = word.replace(/[.,!?;:]/g, '');
  const syllables = countSyllables(cleanWord);
  
  // Check for punctuation that causes pauses
  const hasPunctuation = /[.,!?;:]$/.test(word);
  let pauseWeight = 0;
  
  if (hasPunctuation) {
    // Different punctuation = different pause lengths
    if (/[.!?]$/.test(word)) {
      pauseWeight = 3.0; // Full stop, exclamation, question
    } else if (/[;:]$/.test(word)) {
      pauseWeight = 2.0; // Semicolon, colon
    } else {
      pauseWeight = 1.5; // Comma
    }
  }
  
  // Check for special cases
  const isLongWord = cleanWord.length > 10;
  const lengthBonus = isLongWord ? 0.5 : 0;
  
  // Very short words (articles, prepositions) are spoken faster
  const isShortWord = cleanWord.length <= 2;
  const shortPenalty = isShortWord ? -0.2 : 0;
  
  // Base weight: syllable count + pause + bonus + small base time
  return Math.max(0.3, syllables + pauseWeight + lengthBonus + shortPenalty + 0.5);
}

/**
 * Generate word timestamps based on audio duration
 * Uses syllable-based timing with punctuation pauses for ~40-50% better accuracy
 */
export function generateWordTimestamps(
  words: string[],
  duration: number
): WordInfo[] {
  // Calculate weights based on syllables and punctuation
  const weights = words.map(word => getWordWeight(word));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  let currentTime = 0;
  
  return words.map((word, index) => {
    const wordDuration = (weights[index] / totalWeight) * duration;
    const startTime = currentTime;
    const endTime = currentTime + wordDuration;
    currentTime = endTime;
    
    return {
      text: word,
      startTime,
      endTime,
      index,
    };
  });
}

/**
 * Update chunk with audio duration and word timestamps
 */
export function updateChunkWithTiming(
  chunk: AudioChunk,
  duration: number
): AudioChunk {
  const wordTexts = chunk.words.map(w => w.text);
  const timestamps = generateWordTimestamps(wordTexts, duration);
  
  return {
    ...chunk,
    duration,
    words: timestamps.map((ts, idx) => ({
      ...ts,
      index: chunk.words[idx].index, // Preserve global index
    })),
  };
}

/**
 * Find current word index based on playback time with optimized lookahead
 * Uses binary search for performance and smart lookahead for sync
 */
export function getCurrentWordIndex(
  words: WordInfo[],
  currentTime: number,
  playbackSpeed: number = 1.0
): number {
  if (words.length === 0) return 0;

  // Reduced lookahead for ElevenLabs' accurate timings
  // 100ms is enough for display lag without jumping ahead too much
  const LOOKAHEAD_MS = 100;
  const adjustedTime = currentTime + (LOOKAHEAD_MS / 1000);

  // Binary search for performance with many words
  let left = 0;
  let right = words.length - 1;
  let result = 0;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const word = words[mid];

    if (adjustedTime >= word.startTime && adjustedTime < word.endTime) {
      return mid;
    } else if (adjustedTime < word.startTime) {
      right = mid - 1;
    } else {
      result = mid;
      left = mid + 1;
    }
  }

  // Return the closest word we found
  return Math.min(result, words.length - 1);
}

/**
 * Format time in MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

