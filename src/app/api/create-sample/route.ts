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

    // Create the 3-second sample audio with whisper overlay
    const sampleAudioData = await createSampleWithWhisper(bpm);
    
    // Return the processed audio as a blob
    return new NextResponse(sampleAudioData, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'attachment; filename="sample-audio.wav"',
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

async function createSampleWithWhisper(targetBpm: number): Promise<ArrayBuffer> {
  // Create a 3-second audio sample with whisper overlay
  const sampleRate = 44100;
  const duration = 3; // 3 seconds for free sample
  const frequency = targetBpm / 60; // Convert BPM to Hz
  
  const samples = sampleRate * duration;
  const audioData = new Float32Array(samples);
  
  // Generate the heartbeat audio
  for (let i = 0; i < samples; i++) {
    const time = i / sampleRate;
    const beatPhase = (time * frequency) % 1;
    
    // Create a more realistic heartbeat sound
    let amplitude = 0;
    if (beatPhase < 0.3) {
      // Main beat
      amplitude = Math.sin(2 * Math.PI * frequency * time) * 0.3;
      amplitude += Math.sin(2 * Math.PI * frequency * 2 * time) * 0.15;
      amplitude += Math.sin(2 * Math.PI * frequency * 3 * time) * 0.1;
    } else if (beatPhase < 0.6) {
      // Secondary beat (quieter)
      amplitude = Math.sin(2 * Math.PI * frequency * time) * 0.15;
    }
    
    // Add some noise to make it more realistic
    amplitude += (Math.random() - 0.5) * 0.03;
    
    audioData[i] = amplitude;
  }
  
  // Add whisper overlay (simulated)
  const whisperData = await createWhisperOverlay(samples, sampleRate);
  
  // Mix the heartbeat and whisper audio
  for (let i = 0; i < samples; i++) {
    // Mix heartbeat (70%) with whisper (30%)
    audioData[i] = audioData[i] * 0.7 + whisperData[i] * 0.3;
  }
  
  // Convert to WAV format
  const wavBuffer = createWAVBuffer(audioData, sampleRate);
  
  return wavBuffer;
}

async function createWhisperOverlay(samples: number, sampleRate: number): Promise<Float32Array> {
  // Create a simulated whisper overlay
  // In the real implementation, this would load the actual whisper audio file
  const whisperData = new Float32Array(samples);
  
  // Create a gentle, soft whisper sound
  for (let i = 0; i < samples; i++) {
    const time = i / sampleRate;
    
    // Create a soft, breathy sound
    let whisper = 0;
    
    // Add some gentle oscillations
    whisper += Math.sin(2 * Math.PI * 200 * time) * 0.1; // Low frequency base
    whisper += Math.sin(2 * Math.PI * 400 * time) * 0.05; // Mid frequency
    whisper += Math.sin(2 * Math.PI * 800 * time) * 0.03; // High frequency
    
    // Add some variation over time
    whisper *= Math.sin(2 * Math.PI * 0.5 * time) * 0.5 + 0.5;
    
    // Add some noise for breathiness
    whisper += (Math.random() - 0.5) * 0.02;
    
    whisperData[i] = whisper;
  }
  
  return whisperData;
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
