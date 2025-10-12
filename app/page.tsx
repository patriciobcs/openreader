'use client';

import { useState, useCallback, useEffect } from 'react';
import { ReaderLayout } from '@/components/reader/reader-layout';
import { AudioChunk } from '@/lib/types';
import { chunkText } from '@/lib/text-utils';
import { useAudioManager } from '@/hooks/use-audio-manager';

const DEMO_TEXT = `Once upon a time, in a faraway kingdom, there lived a kind and beautiful young girl named Cinderella. She lived with her stepmother and two stepsisters, who were cruel and unkind to her. They made her do all the housework and treated her like a servant.

One day, the king announced that he was hosting a grand ball at the palace, and all the young ladies in the kingdom were invited. Cinderella's stepsisters were very excited and spent days preparing their fancy dresses. But Cinderella was told she could not go.

On the night of the ball, as Cinderella sat crying in the garden, her fairy godmother appeared. With a wave of her magic wand, she transformed a pumpkin into a golden carriage, mice into horses, and Cinderella's rags into a beautiful gown. But she warned Cinderella that the magic would end at midnight.`;

const WORDS_PER_CHUNK = 50;

export default function Home() {
  const [text, setText] = useState('');
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  const {
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
  } = useAudioManager({
    chunks,
    onChunksUpdate: setChunks,
    isDemo,
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

  const handleUseDemo = useCallback(() => {
    console.log('Use Demo clicked');
    setText(DEMO_TEXT);
    const newChunks = chunkText(DEMO_TEXT, WORDS_PER_CHUNK);
    console.log('Demo chunks created:', newChunks.length, 'chunks');
    console.log('First chunk:', newChunks[0]);
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
      onTextChange={handleTextChange}
      onUseDemo={handleUseDemo}
      onPlay={play}
      onPause={pause}
      onSkipForward={skipForward}
      onSkipBackward={skipBackward}
      onSpeedChange={setSpeed}
    />
  );
}
