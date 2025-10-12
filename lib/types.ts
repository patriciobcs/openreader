export interface WordInfo {
  text: string;
  startTime: number;
  endTime: number;
  index: number;
}

export interface AudioChunk {
  id: string;
  text: string;
  words: WordInfo[];
  audioUrl: string | null;
  duration: number;
  isLoading: boolean;
  error?: string;
}

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended';

export interface ReaderState {
  chunks: AudioChunk[];
  currentChunkIndex: number;
  currentWordIndex: number;
  playbackState: PlaybackState;
  playbackSpeed: number;
}

