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

export type TTSProvider = 'slng' | 'elevenlabs';

export type ImmersionMode = 'focus' | 'ambient' | 'vivid' | 'theater';

export interface ElevenLabsAlignment {
  characters: string[];
  // Support both SDK camelCase and raw API snake_case
  characterStartTimesSeconds?: number[];
  characterEndTimesSeconds?: number[];
  character_start_times_seconds?: number[];
  character_end_times_seconds?: number[];
}

export interface ElevenLabsResponse {
  // Raw API format (snake_case)
  audio_base64?: string;
  alignment?: ElevenLabsAlignment;
  normalized_alignment?: ElevenLabsAlignment;
  // SDK format (camelCase)
  audioBase64?: string;
  normalizedAlignment?: ElevenLabsAlignment;
}

export interface ReaderState {
  chunks: AudioChunk[];
  currentChunkIndex: number;
  currentWordIndex: number;
  playbackState: PlaybackState;
  playbackSpeed: number;
}
