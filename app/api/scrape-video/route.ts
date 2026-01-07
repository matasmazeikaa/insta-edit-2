import { NextRequest, NextResponse } from 'next/server';
import { scrapeVideo } from '@/app/services/videoScraperService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, platform } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const result = await scrapeVideo({ url, platform });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in scrape-video API:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to scrape video' 
      },
      { status: 500 }
    );
  }
}

