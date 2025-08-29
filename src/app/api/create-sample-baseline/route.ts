import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

// Baseline BPM of the original audio file (estimated)
const BASELINE_BPM = 140; 
const SAMPLE_DURATION = 3; // 3 seconds for samples

export async function POST(request: NextRequest) {
  try {
    const { bpm } = await request.json();

    // Validate BPM input
    if (!bpm || bpm < 60 || bpm > 200) {
      return NextResponse.json(
        { error: 'Invalid BPM value. Must be between 60 and 200.' },
        { status: 400 }
      );
    }

    // Create a 3-second sample with whisper overlay
    const sampleAudioBuffer = createSampleWithWhisper(bpm);
    
    // Return the sample audio
    return new NextResponse(sampleAudioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'inline; filename="sample-heartbeat-with-whisper.wav"', // Changed to inline to prevent download
        'X-Sample-Info': `BPM: ${bpm}, Duration: ${SAMPLE_DURATION}s, Includes Whisper Overlay`
      },
    });

  } catch (error) {
    console.error('Error creating sample audio:', error);
    return NextResponse.json(
      { error: 'Failed to create sample audio' },
      { status: 500 }
    );
  }
}

function createSampleWithWhisper(bpm: number): Buffer {
  try {
    // Read the baseline heartbeat audio
    const baselinePath = join(process.cwd(), 'baseline-heartbeat.wav');
    
    if (!existsSync(baselinePath)) {
      console.error('Baseline audio file not found');
      return createSimpleSample(bpm);
    }
    
    const baselineBuffer = readFileSync(baselinePath);
    
    // Try to load actual whisper audio file first
    const whisperBuffer = loadWhisperAudio() || createWhisperAudio();
    
    // Create 3-second heartbeat sample
    const heartbeatSample = createHeartbeatSample(baselineBuffer, SAMPLE_DURATION);
    
    // Stitch heartbeat and whisper together
    const combinedAudio = stitchAudioWithWhisper(heartbeatSample, whisperBuffer, SAMPLE_DURATION);
    
    return combinedAudio;
    
  } catch (error) {
    console.error('Error in createSampleWithWhisper:', error);
    // Fallback: return a simple 3-second sample
    return createSimpleSample(bpm);
  }
}

function loadWhisperAudio(): Buffer | null {
  // Try to load the actual whisper audio file
  // This will be used when the user provides the real whisper audio file
  const whisperPath = join(process.cwd(), 'whisper-audio.wav');
  
  if (existsSync(whisperPath)) {
    try {
      const whisperBuffer = readFileSync(whisperPath);
      console.log('Loaded actual whisper audio file');
      return whisperBuffer;
    } catch (error) {
      console.error('Error loading whisper audio file:', error);
    }
  }
  
  console.log('Using simulated whisper audio (no whisper-audio.wav file found)');
  return null;
}

function createWhisperAudio(): Buffer {
  // For now, we'll create a simulated whisper audio
  // This will be replaced when the user provides the actual whisper audio file
  
  // Create a simple whisper-like audio (soft, gentle tones)
  const sampleRate = 44100;
  const duration = 3; // 3 seconds
  const samples = sampleRate * duration;
  
  // Create a gentle whisper sound using sine waves
  const whisperBuffer = Buffer.alloc(44 + samples * 2); // 16-bit mono
  
  // Write WAV header
  writeWavHeader(whisperBuffer, samples * 2, sampleRate, 1, 16);
  
  // Generate whisper-like audio (soft, gentle tones)
  for (let i = 0; i < samples; i++) {
    const time = i / sampleRate;
    // Create a gentle, whisper-like sound
    const whisper = Math.sin(2 * Math.PI * 200 * time) * 0.1 + // Base whisper tone
                   Math.sin(2 * Math.PI * 400 * time) * 0.05 + // Higher harmonics
                   Math.sin(2 * Math.PI * 600 * time) * 0.03;  // Even higher harmonics
    
    // Add some variation to make it sound more natural
    const variation = Math.sin(2 * Math.PI * 0.5 * time) * 0.02;
    const finalSample = Math.max(-1, Math.min(1, whisper + variation));
    
    // Convert to 16-bit PCM
    const pcmValue = Math.round(finalSample * 32767);
    whisperBuffer.writeInt16LE(pcmValue, 44 + i * 2);
  }
  
  return whisperBuffer;
}

function createHeartbeatSample(baselineBuffer: Buffer, duration: number): Buffer {
  // Extract 3 seconds from the baseline heartbeat
  const sampleRate = 44100;
  const targetSamples = sampleRate * duration;
  const bytesPerSample = 2; // 16-bit
  const targetSize = 44 + targetSamples * bytesPerSample;
  
  const sampleBuffer = Buffer.alloc(targetSize);
  
  // Copy WAV header
  baselineBuffer.copy(sampleBuffer, 0, 0, 44);
  
  // Update header for 3-second duration
  const dataSize = targetSamples * bytesPerSample;
  sampleBuffer.writeUInt32LE(36 + dataSize, 4); // File size
  sampleBuffer.writeUInt32LE(dataSize, 40); // Data chunk size
  
  // Copy first 3 seconds of heartbeat audio
  const copySize = Math.min(baselineBuffer.length - 44, dataSize);
  baselineBuffer.copy(sampleBuffer, 44, 44, 44 + copySize);
  
  // If we need more data, repeat the heartbeat
  if (copySize < dataSize) {
    let offset = 44 + copySize;
    while (offset < targetSize) {
      const remaining = targetSize - offset;
      const repeatSize = Math.min(copySize, remaining);
      baselineBuffer.copy(sampleBuffer, offset, 44, 44 + repeatSize);
      offset += repeatSize;
    }
  }
  
  return sampleBuffer;
}

function stitchAudioWithWhisper(heartbeatBuffer: Buffer, whisperBuffer: Buffer, duration: number): Buffer {
  // Combine heartbeat and whisper audio
  // For now, we'll overlay them by mixing the audio samples
  
  const sampleRate = 44100;
  const samples = sampleRate * duration;
  const bytesPerSample = 2; // 16-bit
  
  const combinedBuffer = Buffer.alloc(44 + samples * bytesPerSample);
  
  // Copy WAV header from heartbeat
  heartbeatBuffer.copy(combinedBuffer, 0, 0, 44);
  
  // Update header for combined audio
  const dataSize = samples * bytesPerSample;
  combinedBuffer.writeUInt32LE(36 + dataSize, 4);
  combinedBuffer.writeUInt32LE(dataSize, 40);
  
  // Mix heartbeat and whisper audio
  for (let i = 0; i < samples; i++) {
    const heartbeatOffset = 44 + i * bytesPerSample;
    const whisperOffset = 44 + i * bytesPerSample;
    
    // Get heartbeat sample
    const heartbeatSample = heartbeatOffset < heartbeatBuffer.length ? 
      heartbeatBuffer.readInt16LE(heartbeatOffset) : 0;
    
    // Get whisper sample
    const whisperSample = whisperOffset < whisperBuffer.length ? 
      whisperBuffer.readInt16LE(whisperOffset) : 0;
    
    // Mix the samples (heartbeat louder, whisper softer)
    const mixedSample = Math.round(
      (heartbeatSample * 0.7) + (whisperSample * 0.3)
    );
    
    // Ensure the sample is within 16-bit range
    const clampedSample = Math.max(-32768, Math.min(32767, mixedSample));
    
    combinedBuffer.writeInt16LE(clampedSample, 44 + i * bytesPerSample);
  }
  
  return combinedBuffer;
}

function createSimpleSample(bpm: number): Buffer {
  // Fallback function that creates a simple 3-second sample
  const sampleRate = 44100;
  const duration = 3;
  const samples = sampleRate * duration;
  const bytesPerSample = 2;
  const bufferSize = 44 + samples * bytesPerSample;
  
  const buffer = Buffer.alloc(bufferSize);
  
  // Write WAV header
  writeWavHeader(buffer, samples * bytesPerSample, sampleRate, 1, 16);
  
  // Generate simple heartbeat-like audio
  for (let i = 0; i < samples; i++) {
    const time = i / sampleRate;
    const heartbeat = Math.sin(2 * Math.PI * (bpm / 60) * time) * 0.3;
    const pcmValue = Math.round(heartbeat * 32767);
    buffer.writeInt16LE(pcmValue, 44 + i * bytesPerSample);
  }
  
  return buffer;
}

function writeWavHeader(buffer: Buffer, dataSize: number, sampleRate: number, channels: number, bitsPerSample: number) {
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28); // byte rate
  buffer.writeUInt16LE(channels * bitsPerSample / 8, 32); // block align
  buffer.writeUInt16LE(bitsPerSample, 34);
  
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
}
