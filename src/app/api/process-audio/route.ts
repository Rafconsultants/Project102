import { NextRequest, NextResponse } from 'next/server';

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

    // Create a simple audio file for testing
    const sampleAudioData = await createSampleAudio(bpm);
    
    // Return the processed audio as a blob
    return new NextResponse(sampleAudioData, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'attachment; filename="processed-audio.wav"',
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

// Function to create a sample audio file for testing
async function createSampleAudio(targetBpm: number): Promise<ArrayBuffer> {
  // Create a simple sine wave audio (2 seconds, 44.1kHz sample rate)
  const sampleRate = 44100;
  const duration = 2; // 2 seconds
  const frequency = targetBpm / 60; // Convert BPM to Hz (beats per second)
  
  const samples = sampleRate * duration;
  const audioData = new Float32Array(samples);
  
  // Generate a simple sine wave with some variation to simulate heartbeat
  for (let i = 0; i < samples; i++) {
    const time = i / sampleRate;
    const beatPhase = (time * frequency) % 1;
    
    // Create a more realistic heartbeat sound with multiple harmonics
    let amplitude = 0;
    if (beatPhase < 0.3) {
      // Main beat
      amplitude = Math.sin(2 * Math.PI * frequency * time) * 0.4;
      amplitude += Math.sin(2 * Math.PI * frequency * 2 * time) * 0.2;
      amplitude += Math.sin(2 * Math.PI * frequency * 3 * time) * 0.1;
    } else if (beatPhase < 0.6) {
      // Secondary beat (quieter)
      amplitude = Math.sin(2 * Math.PI * frequency * time) * 0.2;
    }
    
    // Add some noise to make it more realistic
    amplitude += (Math.random() - 0.5) * 0.05;
    
    audioData[i] = amplitude;
  }
  
  // Convert to WAV format
  const wavBuffer = createWAVBuffer(audioData, sampleRate);
  
  return wavBuffer;
}

// WAV file creation
function createWAVBuffer(audioData: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + audioData.length * 2);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + audioData.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, audioData.length * 2, true);
  
  // Audio data
  let offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(offset, sample * 0x7FFF, true);
    offset += 2;
  }
  
  return buffer;
}
