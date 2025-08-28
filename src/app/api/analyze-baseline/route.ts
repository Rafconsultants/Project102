import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { existsSync, statSync } from 'fs';

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

    // Get basic file information
    const stats = statSync(baselinePath);
    
    return NextResponse.json({
      success: true,
      metadata: {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        filename: 'baseline-heartbeat.wav'
      },
      message: 'Baseline audio file found successfully'
    });

  } catch (error) {
    console.error('Error analyzing baseline audio:', error);
    return NextResponse.json(
      { error: 'Failed to analyze baseline audio' },
      { status: 500 }
    );
  }
}
