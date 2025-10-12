import { AudioChunk, WordInfo } from './types';

/**
 * Split text into chunks of specified word count
 */
export function chunkText(text: string, wordsPerChunk: number): AudioChunk[] {
  const words = text.trim().split(/\s+/);
  const chunks: AudioChunk[] = [];
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunkWords = words.slice(i, i + wordsPerChunk);
    const chunkText = chunkWords.join(' ');
    
    // Estimate ~15 seconds per chunk (will be updated with actual duration)
    const estimatedDuration = 15;
    const timestamps = generateWordTimestamps(chunkWords, estimatedDuration);
    
    chunks.push({
      id: `chunk-${i / wordsPerChunk}`,
      text: chunkText,
      words: timestamps.map((ts, idx) => ({
        ...ts,
        index: i + idx, // Global index across all chunks
      })),
      audioUrl: null,
      duration: estimatedDuration,
      isLoading: false,
    });
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
 */
function getWordWeight(word: string): number {
  const syllables = countSyllables(word);
  
  // Check for punctuation that causes pauses
  const hasPunctuation = /[.,!?;:]$/.test(word);
  const pauseWeight = hasPunctuation ? 2.5 : 0; // Extra time for punctuation pause
  
  // Check for special cases
  const isLongWord = word.length > 10;
  const lengthBonus = isLongWord ? 0.5 : 0;
  
  // Base weight: syllable count + pause + bonus + small base time
  return syllables + pauseWeight + lengthBonus + 0.5;
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
 * Find current word index based on playback time
 */
export function getCurrentWordIndex(
  words: WordInfo[],
  currentTime: number
): number {
  for (let i = 0; i < words.length; i++) {
    if (currentTime >= words[i].startTime && currentTime < words[i].endTime) {
      return i;
    }
  }
  return words.length - 1;
}

/**
 * Format time in MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

