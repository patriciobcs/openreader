'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ReaderLayout } from '@/components/reader/reader-layout';
import { AudioChunk, TTSProvider } from '@/lib/types';
import { chunkText } from '@/lib/text-utils';
import { useAudioManager } from '@/hooks/use-audio-manager';

const DEMO_TEXT = `Once upon a time, in a faraway kingdom, there lived a kind and beautiful young girl named Cinderella. She lived with her stepmother and two stepsisters, who were cruel and unkind to her. They made her do all the housework and treated her like a servant.

One day, the king announced that he was hosting a grand ball at the palace, and all the young ladies in the kingdom were invited. Cinderella's stepsisters were very excited and spent days preparing their fancy dresses. But Cinderella was told she could not go.

On the night of the ball, as Cinderella sat crying in the garden, her fairy godmother appeared. With a wave of her magic wand, she transformed a pumpkin into a golden carriage, mice into horses, and Cinderella's rags into a beautiful gown. But she warned Cinderella that the magic would end at midnight.`;

const WORDS_PER_CHUNK = 1000; // For ElevenLabs: generate entire text as one chunk (no cuts!)

export default function Home() {
  const [text, setText] = useState('');
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [provider, setProvider] = useState<TTSProvider>('elevenlabs'); // Default to ElevenLabs for best accuracy

  // Stable callback for chunk updates to prevent unnecessary re-renders
  const handleChunksUpdate = useCallback((newChunks: AudioChunk[]) => {
    setChunks(newChunks);
  }, []);

  const {
    currentWordIndex,
    playbackState,
    playbackSpeed,
    currentTime,
    totalDuration,
    loadedProgress,
    play,
    pause,
    skipForward,
    skipBackward,
    setSpeed,
    seekToWord,
    seekToTime,
  } = useAudioManager({
    chunks,
    onChunksUpdate: handleChunksUpdate,
    isDemo,
    provider,
  });

  // Auto-play when chunks are loaded
  useEffect(() => {
    if (shouldAutoPlay && chunks.length > 0 && playbackState === 'idle') {
      console.log('🎬 Auto-playing with', chunks.length, 'chunks');
      setShouldAutoPlay(false);
      // Small delay to ensure everything is ready
      setTimeout(() => {
        play();
      }, 50);
    }
  }, [chunks, shouldAutoPlay, playbackState, play]);

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    if (newText.trim()) {
      const newChunks = chunkText(newText, WORDS_PER_CHUNK);
      console.log('Text changed, created chunks:', newChunks.length);
      setChunks(newChunks);
      setIsDemo(false);
      setShouldAutoPlay(true);
    } else {
      setChunks([]);
      setShouldAutoPlay(false);
    }
  }, []);

  const handleProviderChange = useCallback((newProvider: TTSProvider) => {
    console.log('Provider changed to:', newProvider);
    setProvider(newProvider);
    // Clear chunks to force re-fetch with new provider
    if (chunks.length > 0) {
      const resetChunks = chunks.map(chunk => ({
        ...chunk,
        audioUrl: null,
        isLoading: false,
      }));
      setChunks(resetChunks);
    }
  }, [chunks]);

  const handleUseDemo = useCallback(() => {
    console.log('🎬 Use Demo clicked');
    setText(DEMO_TEXT);
    const newChunks = chunkText(DEMO_TEXT, WORDS_PER_CHUNK);
    console.log(`📝 Created ${newChunks.length} chunks of ${WORDS_PER_CHUNK} words each`);
    setChunks(newChunks);
    setIsDemo(true);
    setShouldAutoPlay(true);
  }, []);

  return (
    <ReaderLayout
      text={text}
      chunks={chunks}
      currentWordIndex={currentWordIndex}
      playbackState={playbackState}
      playbackSpeed={playbackSpeed}
      currentTime={currentTime}
      totalDuration={totalDuration}
      provider={provider}
      onTextChange={handleTextChange}
      onUseDemo={handleUseDemo}
      onPlay={play}
      onPause={pause}
      onSkipForward={skipForward}
      onSkipBackward={skipBackward}
      onSpeedChange={setSpeed}
      onProviderChange={handleProviderChange}
      onWordClick={seekToWord}
      onSeek={seekToTime}
      loadedProgress={loadedProgress}
    />
  );
}
