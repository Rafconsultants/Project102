import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

// Baseline BPM of the original audio file (estimated)
const BASELINE_BPM = 140; // This is the BPM of the baseline-heartbeat.wav file

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

    // Create BPM-adjusted audio
    const adjustedAudioBuffer = createBPMAdjustedAudio(bpm);
    
    // Return the adjusted audio
    return new NextResponse(adjustedAudioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'inline; filename="bpm-adjusted-heartbeat.wav"',
        'X-Audio-Info': `Original BPM: ${BASELINE_BPM}, Target BPM: ${bpm}, Speed Factor: ${(bpm / BASELINE_BPM).toFixed(2)}x`
      },
    });

  } catch (error) {
    console.error('Error processing audio:', error);
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}

function createBPMAdjustedAudio(targetBpm: number): Buffer {
  try {
    // Read the baseline heartbeat audio
    const baselinePath = join(process.cwd(), 'baseline-heartbeat.wav');
    
    if (!existsSync(baselinePath)) {
      console.error('Baseline audio file not found');
      return createSimpleAudio(targetBpm);
    }
    
    const baselineBuffer = readFileSync(baselinePath);
    
    // Calculate speed factor to adjust BPM
    const speedFactor = targetBpm / BASELINE_BPM;
    
    // For MVP, we'll create a simple speed adjustment
    // This is a basic implementation that changes playback speed
    const adjustedBuffer = adjustAudioSpeed(baselineBuffer, speedFactor);
    
    return adjustedBuffer;
    
  } catch (error) {
    console.error('Error in createBPMAdjustedAudio:', error);
    // Fallback: return a simple synthetic audio
    return createSimpleAudio(targetBpm);
  }
}

function adjustAudioSpeed(audioBuffer: Buffer, speedFactor: number): Buffer {
  try {
    // Parse WAV header
    const sampleRate = audioBuffer.readUInt32LE(24);
    const bitsPerSample = audioBuffer.readUInt16LE(34);
    const channels = audioBuffer.readUInt16LE(22);
    
    // Get the original audio data (skip the 44-byte WAV header)
    const originalDataSize = audioBuffer.readUInt32LE(40);
    const originalSamples = originalDataSize / (channels * bitsPerSample / 8);
    const originalDuration = originalSamples / sampleRate;
    
    // Calculate target duration (8 seconds)
    const targetDuration = 8;
    
    // Calculate how many times we need to repeat the original audio to reach 8 seconds
    const repeatCount = Math.ceil(targetDuration / originalDuration);
    
    // Calculate new sample rate to maintain the target BPM
    const newSampleRate = Math.round(sampleRate * speedFactor);
    
    // Calculate new data size for 8 seconds (use original sample rate for size calculation)
    const newSamples = Math.round(sampleRate * targetDuration);
    const newDataSize = Math.round(newSamples * channels * bitsPerSample / 8);
    
    // Create new buffer with proper size for 8 seconds
    const newBuffer = Buffer.alloc(44 + newDataSize);
    
    // Copy WAV header from original
    audioBuffer.copy(newBuffer, 0, 0, 44);
    
    // Update the sample rate in the WAV header
    newBuffer.writeUInt32LE(newSampleRate, 24);
    
    // Update the byte rate (sample rate * channels * bits per sample / 8)
    const newByteRate = newSampleRate * channels * bitsPerSample / 8;
    
    // Check if byte rate is within valid range for 32-bit integer
    if (newByteRate > 0xFFFFFFFF) {
      console.warn(`Byte rate ${newByteRate} exceeds 32-bit limit, clamping to maximum`);
      newBuffer.writeUInt32LE(0xFFFFFFFF, 28);
    } else {
      newBuffer.writeUInt32LE(Math.round(newByteRate), 28);
    }
    
    // Update the data chunk size
    newBuffer.writeUInt32LE(newDataSize, 40);
    
    // Update the file size in RIFF header
    newBuffer.writeUInt32LE(36 + newDataSize, 4);
    
    // Fill the new buffer with repeated audio data
    let offset = 44;
    for (let i = 0; i < repeatCount; i++) {
      const copySize = Math.min(originalDataSize, newDataSize - (offset - 44));
      if (copySize > 0) {
        audioBuffer.copy(newBuffer, offset, 44, 44 + copySize);
        offset += copySize;
      }
    }
    
    // If we still need more data to reach 8 seconds, pad with silence
    while (offset < 44 + newDataSize) {
      newBuffer.writeUInt16LE(0, offset);
      offset += 2;
    }
    
    console.log(`BPM Adjustment: ${BASELINE_BPM} → ${Math.round(BASELINE_BPM * speedFactor)} BPM (${speedFactor.toFixed(2)}x speed), Duration: ${targetDuration}s`);
    
    return newBuffer;
    
  } catch (error) {
    console.error('Error adjusting audio speed:', error);
    // Return original audio unchanged
    return audioBuffer;
  }
}

function createSimpleAudio(bpm: number): Buffer {
  // Fallback: create a simple synthetic heartbeat
  const sampleRate = 44100;
  const duration = 8; // 8 seconds
  const samples = sampleRate * duration;
  
  // Create a simple heartbeat pattern
  const buffer = Buffer.alloc(44 + samples * 2); // 16-bit mono
  
  // Write WAV header
  writeWavHeader(buffer, samples * 2, sampleRate, 1, 16);
  
  // Generate simple heartbeat sound
  const frequency = 60; // Base frequency
  const samplesPerBeat = Math.round(sampleRate * 60 / bpm);
  
  for (let i = 0; i < samples; i++) {
    const sampleIndex = i % samplesPerBeat;
    const amplitude = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
    const value = Math.round(amplitude * 32767);
    buffer.writeInt16LE(value, 44 + i * 2);
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
