/**
 * Audio Analysis for Word-Level Timing Detection
 * Uses Web Audio API to analyze waveform and detect speech segments
 */

import { getWordWeight } from './text-utils';

export interface AudioSegment {
  start: number;
  end: number;
  amplitude: number;
}

export interface WordTimestamp {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

/**
 * Analyze audio blob and detect speech segments based on amplitude
 */
export async function analyzeAudioSegments(
  audioBlob: Blob
): Promise<AudioSegment[]> {
  try {
    // Check browser support
    if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
      console.warn('⚠️ Web Audio API not supported, skipping analysis');
      return [];
    }
    
    const AudioCtx = AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioCtx();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log('🎵 Analyzing audio:', {
      duration: audioBuffer.duration.toFixed(2) + 's',
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels
    });
    
    const segments = detectSpeechSegments(audioBuffer);
    
    console.log('📊 Detected', segments.length, 'speech segments');
    
    // Clean up
    await audioContext.close();
    
    return segments;
  } catch (error) {
    console.error('❌ Audio analysis failed:', error);
    return [];
  }
}

/**
 * Detect speech segments from audio buffer using amplitude analysis
 */
function detectSpeechSegments(audioBuffer: AudioBuffer): AudioSegment[] {
  const channelData = audioBuffer.getChannelData(0); // Use first channel
  const sampleRate = audioBuffer.sampleRate;
  
  // Configuration
  const AMPLITUDE_THRESHOLD = 0.02; // Minimum amplitude to consider as speech
  const MIN_SEGMENT_DURATION = 0.08; // 80ms minimum segment
  const MIN_SILENCE_DURATION = 0.05; // 50ms minimum silence between words
  const WINDOW_SIZE = Math.floor(sampleRate * 0.01); // 10ms analysis window
  
  const segments: AudioSegment[] = [];
  let segmentStart: number | null = null;
  let silenceDuration = 0;
  let maxAmplitude = 0;
  
  // Analyze in windows
  for (let i = 0; i < channelData.length; i += WINDOW_SIZE) {
    const windowEnd = Math.min(i + WINDOW_SIZE, channelData.length);
    
    // Calculate RMS (Root Mean Square) amplitude for this window
    let sum = 0;
    for (let j = i; j < windowEnd; j++) {
      sum += channelData[j] * channelData[j];
    }
    const rms = Math.sqrt(sum / (windowEnd - i));
    const time = i / sampleRate;
    
    if (rms > AMPLITUDE_THRESHOLD) {
      // Speech detected
      if (segmentStart === null) {
        segmentStart = time;
        maxAmplitude = rms;
      } else {
        maxAmplitude = Math.max(maxAmplitude, rms);
      }
      silenceDuration = 0;
    } else {
      // Silence detected
      silenceDuration += WINDOW_SIZE / sampleRate;
      
      // End segment if we have enough silence
      if (segmentStart !== null && silenceDuration >= MIN_SILENCE_DURATION) {
        const segmentEnd = time - silenceDuration;
        const duration = segmentEnd - segmentStart;
        
        // Only add if segment is long enough
        if (duration >= MIN_SEGMENT_DURATION) {
          segments.push({
            start: segmentStart,
            end: segmentEnd,
            amplitude: maxAmplitude
          });
        }
        
        segmentStart = null;
        maxAmplitude = 0;
      }
    }
  }
  
  // Add final segment if exists
  if (segmentStart !== null) {
    segments.push({
      start: segmentStart,
      end: channelData.length / sampleRate,
      amplitude: maxAmplitude
    });
  }
  
  return segments;
}

/**
 * Align detected audio segments to word array
 * Uses intelligent mapping when segment count doesn't match word count
 */
export function alignSegmentsToWords(
  segments: AudioSegment[],
  words: string[],
  totalDuration: number
): WordTimestamp[] {
  console.log('🔄 Aligning', segments.length, 'segments to', words.length, 'words');
  
  // Perfect match - one segment per word
  if (segments.length === words.length) {
    return segments.map((seg, idx) => ({
      text: words[idx],
      start: seg.start,
      end: seg.end,
      confidence: 1.0
    }));
  }
  
  // More segments than words - merge segments
  if (segments.length > words.length) {
    return mergeSegmentsToWords(segments, words);
  }
  
  // Fewer segments than words - split segments
  return splitSegmentsToWords(segments, words, totalDuration);
}

/**
 * Merge extra segments to match word count
 */
function mergeSegmentsToWords(
  segments: AudioSegment[],
  words: string[]
): WordTimestamp[] {
  const wordTimestamps: WordTimestamp[] = [];
  const segmentsPerWord = segments.length / words.length;
  
  for (let i = 0; i < words.length; i++) {
    const startIdx = Math.floor(i * segmentsPerWord);
    const endIdx = Math.floor((i + 1) * segmentsPerWord);
    const wordSegments = segments.slice(startIdx, endIdx);
    
    if (wordSegments.length > 0) {
      wordTimestamps.push({
        text: words[i],
        start: wordSegments[0].start,
        end: wordSegments[wordSegments.length - 1].end,
        confidence: 0.8
      });
    }
  }
  
  return wordTimestamps;
}

/**
 * Split segments to match word count using syllable-based distribution
 */
function splitSegmentsToWords(
  segments: AudioSegment[],
  words: string[],
  totalDuration: number
): WordTimestamp[] {
  const wordTimestamps: WordTimestamp[] = [];
  
  // If no segments detected, fall back to syllable-based estimation
  if (segments.length === 0) {
    console.warn('⚠️ No segments detected, using fallback estimation');
    const weights = words.map(w => getWordWeight(w));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    let currentTime = 0;
    for (let i = 0; i < words.length; i++) {
      const duration = (weights[i] / totalWeight) * totalDuration;
      wordTimestamps.push({
        text: words[i],
        start: currentTime,
        end: currentTime + duration,
        confidence: 0.5 // Low confidence - estimated
      });
      currentTime += duration;
    }
    
    return wordTimestamps;
  }
  
  // Distribute words across available segments proportionally
  const wordsPerSegment = words.length / segments.length;
  let wordIndex = 0;
  
  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const segment = segments[segIdx];
    const segmentDuration = segment.end - segment.start;
    
    // Calculate how many words belong to this segment
    const startWordIdx = Math.floor(segIdx * wordsPerSegment);
    const endWordIdx = Math.floor((segIdx + 1) * wordsPerSegment);
    const segmentWords = words.slice(startWordIdx, endWordIdx);
    
    if (segmentWords.length === 0) continue;
    
    // Distribute segment duration across words using weights
    const weights = segmentWords.map(w => getWordWeight(w));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    let currentTime = segment.start;
    for (let i = 0; i < segmentWords.length; i++) {
      const wordDuration = (weights[i] / totalWeight) * segmentDuration;
      wordTimestamps.push({
        text: segmentWords[i],
        start: currentTime,
        end: currentTime + wordDuration,
        confidence: 0.7 // Medium confidence - interpolated
      });
      currentTime += wordDuration;
    }
  }
  
  return wordTimestamps;
}

/**
 * Generate cache key for audio analysis results
 */
export function getAnalysisCacheKey(chunkId: string, text: string): string {
  // Simple hash of text
  const textHash = text.split('').reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0);
  }, 0);
  
  return `audio-analysis-${chunkId}-${Math.abs(textHash)}`;
}

/**
 * Store analysis results in localStorage
 */
export function cacheAnalysisResults(
  cacheKey: string,
  results: WordTimestamp[]
): void {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(results));
    console.log('💾 Cached analysis results for:', cacheKey);
  } catch (error) {
    console.warn('⚠️ Failed to cache analysis:', error);
  }
}

/**
 * Retrieve cached analysis results
 */
export function getCachedAnalysisResults(
  cacheKey: string
): WordTimestamp[] | null {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      console.log('✅ Using cached analysis for:', cacheKey);
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('⚠️ Failed to load cached analysis:', error);
  }
  return null;
}

