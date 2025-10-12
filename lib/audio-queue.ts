/**
 * Gapless Audio Queue using Web Audio API
 * Schedules and plays audio chunks without gaps
 */

export class AudioQueue {
  private audioContext: AudioContext;
  private gainNode: GainNode;
  private currentSource: AudioBufferSourceNode | null = null;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private nextStartTime: number = 0;
  private isPlaying: boolean = false;
  private playbackRate: number = 1.0;
  
  // Callbacks
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onChunkStart?: (chunkIndex: number) => void;
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }
  
  /**
   * Queue an audio chunk for gapless playback
   */
  async queueChunk(audioUrl: string, chunkIndex: number): Promise<void> {
    try {
      // Fetch and decode audio
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Create source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = this.playbackRate;
      source.connect(this.gainNode);
      
      // Schedule playback
      const startTime = this.nextStartTime || this.audioContext.currentTime;
      source.start(startTime);
      
      // Track scheduled sources
      this.scheduledSources.push(source);
      
      // Update next start time
      this.nextStartTime = startTime + (audioBuffer.duration / this.playbackRate);
      
      // Handle chunk completion
      source.onended = () => {
        const index = this.scheduledSources.indexOf(source);
        if (index > -1) {
          this.scheduledSources.splice(index, 1);
        }
        
        if (this.scheduledSources.length === 0) {
          this.isPlaying = false;
          this.onEnded?.();
        }
      };
      
      console.log(`🎵 Queued chunk ${chunkIndex} at ${startTime.toFixed(2)}s`);
      
    } catch (error) {
      console.error('Error queuing chunk:', error);
      throw error;
    }
  }
  
  /**
   * Start playback
   */
  play(): void {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isPlaying = true;
    this.startTimeTracking();
  }
  
  /**
   * Pause playback
   */
  pause(): void {
    this.audioContext.suspend();
    this.isPlaying = false;
  }
  
  /**
   * Stop and clear queue
   */
  stop(): void {
    this.scheduledSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Already stopped
      }
    });
    this.scheduledSources = [];
    this.currentSource = null;
    this.nextStartTime = 0;
    this.isPlaying = false;
  }
  
  /**
   * Set playback rate
   */
  setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    this.scheduledSources.forEach(source => {
      source.playbackRate.value = rate;
    });
  }
  
  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    return this.audioContext.currentTime;
  }
  
  /**
   * Track time and emit updates
   */
  private startTimeTracking(): void {
    const updateInterval = 50; // 50ms updates
    
    const update = () => {
      if (!this.isPlaying) return;
      
      this.onTimeUpdate?.(this.audioContext.currentTime);
      setTimeout(update, updateInterval);
    };
    
    update();
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    this.gainNode.disconnect();
    this.audioContext.close();
  }
}

