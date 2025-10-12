'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioChunk, PlaybackState } from '@/lib/types';
import { getCurrentWordIndex, updateChunkWithTiming } from '@/lib/text-utils';

interface UseAudioManagerProps {
  chunks: AudioChunk[];
  onChunksUpdate: (chunks: AudioChunk[]) => void;
  isDemo: boolean;
}

export function useAudioManager({
  chunks,
  onChunksUpdate,
  isDemo,
}: UseAudioManagerProps) {
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextChunkPreloadedRef = useRef(false);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);

      const currentChunk = chunks[currentChunkIndex];
      if (currentChunk && currentChunk.words.length > 0) {
        const wordIdx = getCurrentWordIndex(currentChunk.words, time);
        const globalIndex = currentChunk.words[wordIdx]?.index;
        
        if (globalIndex !== undefined) {
          setCurrentWordIndex(globalIndex);
        }
      }
    };

    const handleEnded = () => {
      // Move to next chunk
      if (currentChunkIndex < chunks.length - 1) {
        setCurrentChunkIndex(prev => prev + 1);
        nextChunkPreloadedRef.current = false;
      } else {
        setPlaybackState('ended');
        setCurrentWordIndex(0);
      }
    };

    const handleCanPlayThrough = () => {
      console.log('Audio can play through, current state:', playbackState);
      // This event is now mainly for logging, state change happens after load
    };

    const handleLoadedMetadata = () => {
      const duration = audio.duration;
      if (duration && !isNaN(duration)) {
        // Update chunk with actual duration (always update for accuracy)
        const updatedChunks = [...chunks];
        const chunk = updatedChunks[currentChunkIndex];
        if (chunk) {
          console.log('⏱️ Updating timing for chunk', currentChunkIndex, 
                     'from', chunk.duration.toFixed(2) + 's', 
                     'to', duration.toFixed(2) + 's');
          updatedChunks[currentChunkIndex] = updateChunkWithTiming(chunk, duration);
          onChunksUpdate(updatedChunks);
        }
      }
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
          console.error('Play error:', err);
        });
      } else if (audio.paused) {
        // Same source but paused, resume
        console.log('▶️ Resuming playback');
        audio.play().catch(err => {
          console.error('Resume error:', err);
        });
      }
    }
  }, [currentChunkIndex, playbackState, playbackSpeed, chunks]);

  // Preload next chunk when current starts playing
  useEffect(() => {
    if (
      playbackState === 'playing' &&
      !nextChunkPreloadedRef.current &&
      currentChunkIndex < chunks.length - 1
    ) {
      const nextChunk = chunks[currentChunkIndex + 1];
      if (nextChunk && !nextChunk.audioUrl && !nextChunk.isLoading) {
        nextChunkPreloadedRef.current = true;
        loadChunk(currentChunkIndex + 1);
      }
    }
  }, [playbackState, currentChunkIndex, chunks]);

  // Calculate total duration
  useEffect(() => {
    const total = chunks.reduce((sum, chunk) => sum + (chunk.duration || 0), 0);
    setTotalDuration(total);
  }, [chunks]);

  const loadChunk = useCallback(
    async (chunkIndex: number, shouldAutoPlay: boolean = false) => {
      const chunk = chunks[chunkIndex];
      if (!chunk || chunk.audioUrl || chunk.isLoading) return;

      // Mark as loading
      const updatedChunks = [...chunks];
      updatedChunks[chunkIndex] = { ...chunk, isLoading: true };
      onChunksUpdate(updatedChunks);

      try {
        console.log('Fetching TTS for chunk:', chunkIndex, 'Text length:', chunk.text.length, 'isDemo:', isDemo);
        
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: chunk.text,
            chunkId: chunk.id,
            isDemo,
          }),
        });

        console.log('TTS API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('TTS API error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const audioBlob = await response.blob();
        console.log('Received audio blob, size:', audioBlob.size);
        const audioUrl = URL.createObjectURL(audioBlob);

        // Update chunks array without triggering unnecessary re-renders
        const finalChunks = [...chunks];
        finalChunks[chunkIndex] = {
          ...chunk,
          audioUrl,
          isLoading: false,
        };
        
        console.log('Chunk loaded successfully:', chunkIndex);
        
        // Only trigger auto-play if this is the current chunk being loaded
        if (shouldAutoPlay && chunkIndex === currentChunkIndex) {
          console.log('Auto-play triggered for chunk:', chunkIndex);
          // Update chunks first, then trigger playback
          onChunksUpdate(finalChunks);
          setPlaybackState('playing');
        } else {
          // Just update chunks without changing playback state
          onChunksUpdate(finalChunks);
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
    [chunks, onChunksUpdate, isDemo, currentChunkIndex]
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

    if (currentChunk.audioUrl) {
      console.log('▶️ Audio already loaded, starting playback');
      setPlaybackState('playing');
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
    } else if (!currentChunk.isLoading) {
      console.log('⬇️ Audio not loaded, starting download...');
      setPlaybackState('loading');
      await loadChunk(currentChunkIndex, true); // true = auto-play after load
    } else {
      console.log('⏳ Audio is already loading...');
    }
  }, [chunks, currentChunkIndex, loadChunk]);

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
  };
}

