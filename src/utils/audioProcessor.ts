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
      
      // For BPM adjustment, we need to stretch/compress the audio based on tempo ratio
      // Then adjust the duration to match target duration
      const tempoAdjustedLength = Math.floor(audioBuffer.length / tempoRatio);
      const finalDurationRatio = targetDuration / (tempoAdjustedLength / audioBuffer.sampleRate);
      const finalLength = Math.floor(tempoAdjustedLength * finalDurationRatio);

      // Create a new audio buffer with the final length
      const sampleRate = audioBuffer.sampleRate;
      const newAudioBuffer = this.audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        finalLength,
        sampleRate
      );

      // Copy and process the audio data with enhanced tempo adjustment
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel);
        const newData = newAudioBuffer.getChannelData(channel);

        // First apply enhanced tempo adjustment (stretch/compress based on BPM)
        for (let i = 0; i < tempoAdjustedLength; i++) {
          const originalIndex = i * tempoRatio;
          const index1 = Math.floor(originalIndex);
          const index2 = Math.min(index1 + 1, originalData.length - 1);
          const fraction = originalIndex - index1;

          if (index1 < originalData.length) {
            newData[i] = originalData[index1] * (1 - fraction) + originalData[index2] * fraction;
          }
        }

        // Then apply duration adjustment to reach target duration
        const tempData = new Float32Array(newData);
        for (let i = 0; i < finalLength; i++) {
          const tempIndex = (i / finalDurationRatio);
          const index1 = Math.floor(tempIndex);
          const index2 = Math.min(index1 + 1, tempData.length - 1);
          const fraction = tempIndex - index1;

          if (index1 < tempData.length) {
            newData[i] = tempData[index1] * (1 - fraction) + tempData[index2] * fraction;
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
