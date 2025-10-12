'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioChunk, PlaybackState, TTSProvider } from '@/lib/types';
import { getCurrentWordIndex, updateChunkWithTiming } from '@/lib/text-utils';
import {
  analyzeAudioSegments,
  alignSegmentsToWords,
  getAnalysisCacheKey,
  cacheAnalysisResults,
  getCachedAnalysisResults,
  type WordTimestamp
} from '@/lib/audio-analysis';
import { convertCharacterTimingsToWords } from '@/lib/elevenlabs-utils';

interface UseAudioManagerProps {
  chunks: AudioChunk[];
  onChunksUpdate: (chunks: AudioChunk[]) => void;
  isDemo: boolean;
  provider: TTSProvider;
}

export function useAudioManager({
  chunks,
  onChunksUpdate,
  isDemo,
  provider,
}: UseAudioManagerProps) {
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextChunkPreloadedRef = useRef(false);
  
  // Store all audio URLs to prevent chunk reloading during playback
  const audioUrlsRef = useRef<Map<number, string>>(new Map());
  
  // Cumulative time offsets for each chunk
  const chunkOffsetsRef = useRef<number[]>([]);

  // Initialize audio element with optimal settings
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 1.0;
      // Optimize for low latency transitions
      (audioRef.current as any).preservesPitch = false; // Better for speed changes
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);

      // Find word in current chunk
      const currentChunk = chunks[currentChunkIndex];
      if (currentChunk && currentChunk.words.length > 0) {
        // Direct lookup - no delays, instant response
        const wordIdx = getCurrentWordIndex(
          currentChunk.words, 
          time,
          audio.playbackRate
        );
        const globalIndex = currentChunk.words[wordIdx]?.index;
        
        // Update immediately if changed
        if (globalIndex !== undefined && globalIndex !== currentWordIndex) {
          setCurrentWordIndex(globalIndex);
        }
      }
    };

        const handleEnded = () => {
          // Move to next chunk if available
          if (currentChunkIndex < chunks.length - 1) {
            const nextChunkIndex = currentChunkIndex + 1;
            const nextAudioUrl = audioUrlsRef.current.get(nextChunkIndex) || chunks[nextChunkIndex]?.audioUrl;
            
            if (nextAudioUrl) {
              // Seamless transition: load and play immediately
              console.log(`🔄 Transitioning to chunk ${nextChunkIndex}`);
              audio.src = nextAudioUrl;
              audio.playbackRate = playbackSpeed;
              setCurrentChunkIndex(nextChunkIndex);
              
              // Play with error handling
              audio.play().catch(err => {
                console.error('❌ Chunk transition play error:', err.message);
                setPlaybackState('paused');
              });
            } else {
              console.warn('⚠️ Next chunk not preloaded, pausing');
              setPlaybackState('paused');
            }
          } else {
            // All done
            console.log('✅ Playback completed');
            setPlaybackState('ended');
            setCurrentWordIndex(0);
            setCurrentChunkIndex(0);
          }
        };

    const handleCanPlayThrough = () => {
      console.log('Audio can play through, current state:', playbackState);
      // This event is now mainly for logging, state change happens after load
    };

    const handleLoadedMetadata = () => {
      // Don't update chunks during playback - it causes flickering
      // We don't need to update durations during playback anyway
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [chunks, currentChunkIndex, playbackState, onChunksUpdate]);

  // Update playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Load and play current chunk
  useEffect(() => {
    const currentChunk = chunks[currentChunkIndex];
    if (!currentChunk || !audioRef.current) return;

    const audio = audioRef.current;

    // Only update src and play if we need to
    if (currentChunk.audioUrl && playbackState === 'playing') {
      // Check if we're already playing this chunk
      const currentSrc = audio.src;
      const newSrc = currentChunk.audioUrl;

      if (currentSrc !== newSrc) {
        console.log('📼 Loading new audio source for chunk:', currentChunkIndex);
        audio.src = newSrc;
        audio.playbackRate = playbackSpeed;
        audio.play().catch(err => {
          console.error('❌ Play error (browser restriction):', err.message);
          // If autoplay fails, pause and let user click play
          setPlaybackState('paused');
        });
      } else if (audio.paused) {
        // Same source but paused, resume
        console.log('▶️ Resuming playback');
        audio.play().catch(err => {
          console.error('❌ Resume error:', err.message);
          setPlaybackState('paused');
        });
      }
    }
  }, [currentChunkIndex, playbackState, playbackSpeed, chunks]);

  // Calculate cumulative time offsets when chunks change
  useEffect(() => {
    let offset = 0;
    const offsets: number[] = [];
    
    for (const chunk of chunks) {
      offsets.push(offset);
      offset += chunk.duration || 0;
    }
    
    chunkOffsetsRef.current = offsets;
  }, [chunks]);
  
  // Preload ALL chunks ONCE when idle (use ref to track if already done)
  const hasPreloadedRef = useRef(false);
  const chunksLengthRef = useRef(0);
  
  useEffect(() => {
    // Reset preload flag when chunks change (new text loaded)
    if (chunks.length !== chunksLengthRef.current) {
      hasPreloadedRef.current = false;
      chunksLengthRef.current = chunks.length;
      audioUrlsRef.current.clear(); // Clear cached URLs
    }
    
    if (playbackState === 'idle' && chunks.length > 0 && !hasPreloadedRef.current) {
      console.log(`📥 Preloading ${chunks.length} chunks...`);
      hasPreloadedRef.current = true;
      
      // Load all chunks in background
      chunks.forEach((chunk, index) => {
        if (!chunk.audioUrl && !chunk.isLoading) {
          loadChunk(index, false);
        }
      });
    }
  }, [chunks.length, playbackState]); // Only depend on LENGTH, not chunks array itself

  // Calculate total duration once when chunks load (not during playback)
  useEffect(() => {
    const total = chunks.reduce((sum, chunk) => sum + (chunk.duration || 0), 0);
    if (total > 0 && playbackState === 'idle') {
      setTotalDuration(total);
    }
  }, [chunks, playbackState]);

  /**
   * SIMPLIFIED: Don't analyze or update anything during playback
   * Analysis happens BEFORE playback starts or AFTER it ends
   */
  const analyzeAudioForAccurateTiming = async (
    audioBlob: Blob,
    chunk: AudioChunk,
    chunkIndex: number
  ) => {
    // Skip entirely if playing - we'll analyze when paused/stopped
    if (playbackState === 'playing') {
      console.log('⏸️ Skipping analysis during playback');
      return;
    }
    
    // Check cache first
    const cacheKey = getAnalysisCacheKey(chunk.id, chunk.text);
    const cached = getCachedAnalysisResults(cacheKey);
    
    if (cached) {
      console.log('📊 Using cached timings for chunk:', chunkIndex);
      // Update immediately since we're not playing
      updateChunkTimings(chunkIndex, cached);
      return;
    }
    
    console.log('🎵 Analyzing audio for chunk:', chunkIndex);
    
    try {
      const segments = await analyzeAudioSegments(audioBlob);
      if (segments.length === 0) return;
      
      const audio = new Audio(URL.createObjectURL(audioBlob));
      await new Promise(resolve => { audio.onloadedmetadata = resolve; });
      
      const wordTimings = alignSegmentsToWords(
        segments,
        chunk.words.map(w => w.text),
        audio.duration
      );
      
      cacheAnalysisResults(cacheKey, wordTimings);
      updateChunkTimings(chunkIndex, wordTimings);
      
    } catch (error) {
      console.error('❌ Analysis error:', error);
    }
  };
  
  /**
   * Update chunk timings ONLY when not playing
   */
  const updateChunkTimings = (chunkIndex: number, wordTimings: WordTimestamp[]) => {
    if (playbackState !== 'idle' && playbackState !== 'paused') {
      return; // Don't update during playback
    }
    
    const updatedChunks = [...chunks];
    const chunk = updatedChunks[chunkIndex];
    
    chunk.words = chunk.words.map((word, idx) => ({
      ...word,
      startTime: wordTimings[idx]?.start ?? word.startTime,
      endTime: wordTimings[idx]?.end ?? word.endTime,
    }));
    
    if (wordTimings.length > 0) {
      chunk.duration = wordTimings[wordTimings.length - 1].end;
    }
    
    onChunksUpdate(updatedChunks);
  };

  const loadChunk = useCallback(
    async (chunkIndex: number, shouldAutoPlay: boolean = false) => {
      const chunk = chunks[chunkIndex];
      
      // Check if already loaded in ref (prevents duplicate loads)
      if (!chunk || chunk.audioUrl || chunk.isLoading || audioUrlsRef.current.has(chunkIndex)) {
        return;
      }

      console.log(`🔄 Loading chunk ${chunkIndex}...`);

      // Mark as loading ONLY if not playing (to prevent state updates during playback)
      if (playbackState !== 'playing') {
        const updatedChunks = [...chunks];
        updatedChunks[chunkIndex] = { ...chunk, isLoading: true };
        onChunksUpdate(updatedChunks);
      }

      try {
        // Get context from adjacent chunks for better continuity
        const previousText = chunkIndex > 0 ? chunks[chunkIndex - 1].text : undefined;
        const nextText = chunkIndex < chunks.length - 1 ? chunks[chunkIndex + 1].text : undefined;

        console.log(`Fetching TTS for chunk ${chunkIndex} using ${provider}:`, {
          textLength: chunk.text.length,
          hasPrevious: !!previousText,
          hasNext: !!nextText,
          isDemo,
          provider
        });

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: chunk.text,
            chunkId: chunk.id,
            isDemo,
            provider,
            previousText,
            nextText,
          }),
        });

        console.log('TTS API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('TTS API error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        // Handle ElevenLabs JSON response vs SLNG blob response
        let audioUrl: string;
        let wordTimings: WordTimestamp[] | null = null;

        if (provider === 'elevenlabs') {
          const data = await response.json();
          console.log('✨ ElevenLabs data received:', {
            audioBytes: data.audio.length,
            hasAlignment: !!data.alignment,
            characters: data.alignment?.characters?.length
          });

          // Convert audio array to blob
          const audioBytes = new Uint8Array(data.audio);
          const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
          audioUrl = URL.createObjectURL(audioBlob);

          // Convert character timings to word timings
          if (data.alignment) {
            const globalStartIndex = chunk.words[0]?.index || 0;
            wordTimings = convertCharacterTimingsToWords(
              chunk.text,
              data.alignment,
              globalStartIndex
            );
            console.log('🎯 Perfect word timings from ElevenLabs:', wordTimings.length, 'words');
          }
        } else {
          // SLNG returns audio blob directly
          const audioBlob = await response.blob();
          console.log('Received audio blob, size:', audioBlob.size);
          audioUrl = URL.createObjectURL(audioBlob);
        }

        // Update chunks array with audio URL and timings
        const finalChunks = [...chunks];
        let updatedChunk = {
          ...chunk,
          audioUrl,
          isLoading: false,
        };

        // If ElevenLabs provided word timings, use them immediately!
        if (wordTimings && wordTimings.length > 0) {
          updatedChunk.words = updatedChunk.words.map((word, idx) => ({
            ...word,
            startTime: wordTimings[idx]?.startTime ?? word.startTime,
            endTime: wordTimings[idx]?.endTime ?? word.endTime,
          }));
          // Update duration from last word's end time
          updatedChunk.duration = wordTimings[wordTimings.length - 1].endTime;
          console.log('✅ Using ElevenLabs precise timings:', updatedChunk.duration.toFixed(2) + 's');
        }

        finalChunks[chunkIndex] = updatedChunk;
        
        // Store audio URL in ref FIRST (prevents duplicate loads)
        audioUrlsRef.current.set(chunkIndex, audioUrl);
        
        console.log(`✅ Chunk ${chunkIndex} loaded (${updatedChunk.words.length} words, ${updatedChunk.duration.toFixed(2)}s)`);
        
        // Update state ONLY if not playing (prevents flickering)
        if (playbackState !== 'playing') {
          onChunksUpdate(finalChunks);
        }
        
        // Trigger auto-play if needed (requires user interaction)
        if (shouldAutoPlay && chunkIndex === currentChunkIndex) {
          console.log('🎬 Auto-play triggered for chunk:', chunkIndex);
          // Set to playing, but the useEffect will handle actual playback
          // If browser blocks it, we'll catch the error and set to paused
          setPlaybackState('playing');
        }
        
        // For SLNG: Analyze BEFORE playback (ElevenLabs already has perfect timings)
        if (provider === 'slng' && playbackState === 'idle') {
          const audioBlob = await fetch(audioUrl).then(r => r.blob());
          analyzeAudioForAccurateTiming(audioBlob, updatedChunk, chunkIndex).catch(err => {
            console.warn('Analysis failed:', err);
          });
        }
      } catch (error) {
        console.error('Error loading chunk:', chunkIndex, error);
        const errorChunks = [...chunks];
        errorChunks[chunkIndex] = {
          ...chunk,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load audio',
        };
        onChunksUpdate(errorChunks);
      }
    },
    [chunks, onChunksUpdate, isDemo, currentChunkIndex, provider, playbackState]
  );

  const play = useCallback(async () => {
    console.log('🎵 PLAY FUNCTION CALLED');
    console.log('Chunks available:', chunks.length);
    console.log('Current chunk index:', currentChunkIndex);
    
    const currentChunk = chunks[currentChunkIndex];
    if (!currentChunk) {
      console.error('❌ No current chunk available');
      return;
    }

    console.log('✅ Current chunk:', {
      id: currentChunk.id,
      hasAudio: !!currentChunk.audioUrl,
      isLoading: currentChunk.isLoading,
      textPreview: currentChunk.text.substring(0, 50) + '...'
    });

    const audio = audioRef.current;
    if (!audio) return;

    const audioUrl = audioUrlsRef.current.get(currentChunkIndex) || currentChunk.audioUrl;

    if (audioUrl) {
      console.log('▶️ Audio already loaded, starting playback');
      audio.src = audioUrl;
      audio.playbackRate = playbackSpeed;
      setPlaybackState('playing');
      
      // User-initiated play - should work
      try {
        await audio.play();
        console.log('✅ Playback started');
      } catch (err: any) {
        console.error('❌ Play blocked:', err.message);
        setPlaybackState('paused');
      }
    } else if (!currentChunk.isLoading) {
      console.log('⬇️ Audio not loaded, starting download...');
      setPlaybackState('loading');
      await loadChunk(currentChunkIndex, true); // true = auto-play after load
    } else {
      console.log('⏳ Audio is already loading...');
    }
  }, [chunks, currentChunkIndex, loadChunk, playbackSpeed]);

  const pause = useCallback(() => {
    setPlaybackState('paused');
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const skipForward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.currentTime + 10,
        audioRef.current.duration
      );
    }
  }, []);

  const skipBackward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        audioRef.current.currentTime - 10,
        0
      );
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  const seekToWord = useCallback((wordIndex: number) => {
    console.log('🎯 Seeking to word index:', wordIndex);
    
    // Find which chunk contains this word
    let targetChunkIndex = 0;
    let wordTimeInChunk = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const firstWordIndex = chunk.words[0]?.index || 0;
      const lastWordIndex = chunk.words[chunk.words.length - 1]?.index || 0;
      
      if (wordIndex >= firstWordIndex && wordIndex <= lastWordIndex) {
        targetChunkIndex = i;
        // Find the word within this chunk
        const wordInChunk = chunk.words.find(w => w.index === wordIndex);
        if (wordInChunk) {
          wordTimeInChunk = wordInChunk.startTime;
        }
        break;
      }
    }
    
    console.log(`📍 Found word in chunk ${targetChunkIndex} at time ${wordTimeInChunk.toFixed(2)}s`);
    
    const audio = audioRef.current;
    if (!audio) return;
    
    const targetChunk = chunks[targetChunkIndex];
    const audioUrl = audioUrlsRef.current.get(targetChunkIndex) || targetChunk?.audioUrl;
    
    if (audioUrl) {
      // Load the chunk if it's different
      if (targetChunkIndex !== currentChunkIndex) {
        console.log(`🔄 Switching to chunk ${targetChunkIndex}`);
        audio.src = audioUrl;
        audio.playbackRate = playbackSpeed;
        setCurrentChunkIndex(targetChunkIndex);
      }
      
      // Seek to the word's time
      audio.currentTime = wordTimeInChunk;
      setCurrentWordIndex(wordIndex);
      
      // Start playing if not already
      if (playbackState !== 'playing') {
        setPlaybackState('playing');
        audio.play().catch(err => {
          console.error('Play error after seek:', err.message);
          setPlaybackState('paused');
        });
      }
      
      console.log('✅ Seeked successfully');
    } else {
      console.warn('⚠️ Target chunk not loaded yet');
    }
  }, [chunks, currentChunkIndex, playbackState, playbackSpeed]);

  return {
    currentChunkIndex,
    currentWordIndex,
    playbackState,
    playbackSpeed,
    currentTime,
    totalDuration,
    play,
    pause,
    skipForward,
    skipBackward,
    setSpeed,
    seekToWord,
  };
}

