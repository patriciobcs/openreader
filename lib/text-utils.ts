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
    
    chunks.push({
      id: `chunk-${i / wordsPerChunk}`,
      text: chunkText,
      words: chunkWords.map((word, idx) => ({
        text: word,
        startTime: 0,
        endTime: 0,
        index: i + idx,
      })),
      audioUrl: null,
      duration: 0,
      isLoading: false,
    });
  }
  
  return chunks;
}

/**
 * Generate word timestamps based on audio duration
 * Distributes time evenly across words (simple estimation)
 */
export function generateWordTimestamps(
  words: string[],
  duration: number
): WordInfo[] {
  const timePerWord = duration / words.length;
  
  return words.map((word, index) => ({
    text: word,
    startTime: index * timePerWord,
    endTime: (index + 1) * timePerWord,
    index,
  }));
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

