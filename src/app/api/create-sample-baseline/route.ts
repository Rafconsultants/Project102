import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

// Baseline BPM of the original audio file
const BASELINE_BPM = 140; // We'll need to determine this from the audio file

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

    // Path to the baseline audio file
    const baselinePath = join(process.cwd(), 'baseline-heartbeat.wav');
    
    if (!existsSync(baselinePath)) {
      return NextResponse.json(
        { error: 'Baseline audio file not found' },
        { status: 500 }
      );
    }

    // For now, just return the baseline audio file
    // In a full implementation, we would use FFmpeg to create a 3-second sample with whisper overlay
    const audioBuffer = readFileSync(baselinePath);
    
    // Return the baseline audio
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
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
