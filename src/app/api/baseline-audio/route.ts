import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

export async function GET() {
  try {
    // Path to the baseline audio file
    const baselinePath = join(process.cwd(), 'baseline-heartbeat.wav');
    
    if (!existsSync(baselinePath)) {
      return NextResponse.json(
        { error: 'Baseline audio file not found' },
        { status: 500 }
      );
    }

    // Read and return the audio file
    const audioBuffer = readFileSync(baselinePath);
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error serving baseline audio:', error);
    return NextResponse.json(
      { error: 'Failed to serve baseline audio' },
      { status: 500 }
    );
  }
}
