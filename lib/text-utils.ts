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
 * Generate word timestamps based on audio duration
 * Distributes time across words based on word length (better estimation)
 */
export function generateWordTimestamps(
  words: string[],
  duration: number
): WordInfo[] {
  // Calculate relative weights based on word length + base time
  const weights = words.map(word => word.length + 2); // +2 for space/pause
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

