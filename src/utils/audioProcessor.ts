export interface AudioProcessingOptions {
  bpm: number;
  targetDuration?: number; // in seconds
  volume?: number; // 0-1
}

export interface ProcessedAudioResult {
  audioBuffer: ArrayBuffer;
  duration: number;
  bpm: number;
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async processAudio(audioFile: File, options: AudioProcessingOptions): Promise<ProcessedAudioResult> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    try {
      // Load the audio file
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Calculate the tempo change factor with enhanced effect
      const originalBPM = 140; // Baseline BPM of the original audio
      
      // Enhanced tempo ratio calculation for more dramatic effect
      let tempoRatio = originalBPM / options.bpm;
      
      // Apply additional scaling for more dramatic differences
      if (options.bpm > originalBPM) {
        // For higher BPM (faster), make it even faster
        tempoRatio *= 0.7; // 30% more dramatic
      } else if (options.bpm < originalBPM) {
        // For lower BPM (slower), make it even slower
        tempoRatio *= 1.4; // 40% more dramatic
      }

      // Calculate target duration
      const targetDuration = options.targetDuration || 8; // Default to 8 seconds
      
      // Calculate the final length needed for the target duration
      const finalLength = Math.floor(targetDuration * audioBuffer.sampleRate);

      // Create a new audio buffer with the final length
      const sampleRate = audioBuffer.sampleRate;
      const newAudioBuffer = this.audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        finalLength,
        sampleRate
      );

      // Process each channel with improved algorithm
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel);
        const newData = newAudioBuffer.getChannelData(channel);

        // Use a single-pass algorithm that combines tempo and duration adjustment
        for (let i = 0; i < finalLength; i++) {
          // Calculate the position in the original audio
          // This combines both tempo adjustment and duration scaling
          const originalPosition = (i / finalLength) * originalData.length * tempoRatio;
          
          // Ensure we don't go beyond the original data bounds
          if (originalPosition >= originalData.length - 1) {
            newData[i] = originalData[originalData.length - 1];
          } else {
            // Use cubic interpolation for smoother results
            const index = Math.floor(originalPosition);
            const fraction = originalPosition - index;
            
            // Get surrounding samples for interpolation
            const sample0 = index > 0 ? originalData[index - 1] : originalData[index];
            const sample1 = originalData[index];
            const sample2 = originalData[Math.min(index + 1, originalData.length - 1)];
            const sample3 = originalData[Math.min(index + 2, originalData.length - 1)];
            
            // Cubic interpolation for smoother audio
            newData[i] = this.cubicInterpolate(sample0, sample1, sample2, sample3, fraction);
          }
        }
      }

      // Apply volume adjustment if specified
      if (options.volume !== undefined) {
        for (let channel = 0; channel < newAudioBuffer.numberOfChannels; channel++) {
          const data = newAudioBuffer.getChannelData(channel);
          for (let i = 0; i < data.length; i++) {
            data[i] *= options.volume;
          }
        }
      }

      // Convert back to WAV format
      const wavBuffer = this.audioBufferToWav(newAudioBuffer);

      return {
        audioBuffer: wavBuffer,
        duration: newAudioBuffer.duration,
        bpm: options.bpm
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      throw new Error('Failed to process audio');
    }
  }

  // Cubic interpolation for smoother audio quality
  private cubicInterpolate(y0: number, y1: number, y2: number, y3: number, mu: number): number {
    const mu2 = mu * mu;
    const mu3 = mu2 * mu;
    const m0 = (y2 - y0) * 0.5;
    const m1 = (y3 - y1) * 0.5;
    
    return (2 * mu3 - 3 * mu2 + 1) * y1 + 
           (mu3 - 2 * mu2 + mu) * m0 + 
           (-2 * mu3 + 3 * mu2) * y2 + 
           (mu3 - mu2) * m1;
  }

  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }

  async createSampleAudio(audioFile: File, options: AudioProcessingOptions): Promise<ProcessedAudioResult> {
    // For sample audio, we want 3 seconds with whisper overlay
    const sampleOptions = {
      ...options,
      targetDuration: 3,
      volume: 0.7 // Reduce volume for whisper effect
    };

    return this.processAudio(audioFile, sampleOptions);
  }

  async loadBaselineAudio(): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    try {
      const response = await fetch('/api/baseline-audio');
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Error loading baseline audio:', error);
      throw new Error('Failed to load baseline audio');
    }
  }
}

// Export a singleton instance
export const audioProcessor = new AudioProcessor();
