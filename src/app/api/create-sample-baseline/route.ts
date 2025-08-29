import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

// Baseline BPM of the original audio file
const BASELINE_BPM = 140; // We'll need to determine this from the audio file

export async function POST(request: NextRequest) {
  try {
    const { bpm } = await request.json();
    
    if (!bpm || bpm < 60 || bpm > 200) {
      return NextResponse.json(
        { error: 'Invalid BPM value. Must be between 60 and 200.' },
        { status: 400 }
      );
    }

    const baselinePath = join(process.cwd(), 'baseline-heartbeat.wav');
    
    if (!existsSync(baselinePath)) {
      return NextResponse.json(
        { error: 'Baseline audio file not found' },
        { status: 500 }
      );
    }

    // Read the baseline audio file
    const audioBuffer = readFileSync(baselinePath);
    
    // For now, we'll return the baseline audio with metadata
    // The actual sample creation (3 seconds + whisper overlay) will be done client-side
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
        'X-Original-BPM': BASELINE_BPM.toString(),
        'X-Target-BPM': bpm.toString(),
        'X-Sample-Duration': '3', // 3 seconds for sample
        'Content-Disposition': 'attachment; filename="sample-heartbeat.wav"',
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
