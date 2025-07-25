import { NextRequest, NextResponse } from 'next/server';
import { getPDFProcessor } from '@/lib/langchain/tools/pdfProcessor';
import { getEnhancedYouTubeProcessor } from '@/lib/langchain/tools/enhancedYouTubeProcessor';
import { getMemoryManager } from '@/lib/langchain/memory/pineconeMemoryManager';

interface MultimodalResult {
  type: 'pdf' | 'youtube';
  fileName?: string;
  fileSize?: number;
  url?: string;
  analysis: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Multimodal API called');
    
    const formData = await request.formData();
    const type = formData.get('type') as string;
    const userId = formData.get('userId') as string;
    const sessionId = formData.get('sessionId') as string;

    console.log('📋 Request data:', { type, userId, sessionId });

    if (!type || !userId) {
      console.log('❌ Missing required parameters');
      return NextResponse.json({
        error: 'Type and userId are required',
        code: 'MISSING_PARAMETERS'
      }, { status: 400 });
    }

    let result: MultimodalResult;

    if (type === 'pdf') {
      console.log('📄 Processing PDF file');
      
      const file = formData.get('file') as File;
      if (!file) {
        console.log('❌ No PDF file provided');
        return NextResponse.json({
          error: 'PDF file is required',
          code: 'MISSING_FILE'
        }, { status: 400 });
      }

      console.log('📄 File details:', { name: file.name, size: file.size, type: file.type });

      // Validate file type
      if (!file.type.includes('pdf')) {
        console.log('❌ Invalid file type:', file.type);
        return NextResponse.json({
          error: 'File must be a PDF',
          code: 'INVALID_FILE_TYPE'
        }, { status: 400 });
      }

      try {
        // Process PDF
        console.log('🔄 Initializing PDF processor');
        const pdfProcessor = getPDFProcessor();
        
        console.log('🔄 Converting file to buffer');
        const buffer = Buffer.from(await file.arrayBuffer());
        console.log('📄 Buffer size:', buffer.length);
        
        console.log('🔄 Generating PDF analysis');
        const analysis = await pdfProcessor.generateAnalysis(buffer);
        console.log('✅ PDF analysis completed');

        result = {
          type: 'pdf',
          fileName: file.name,
          fileSize: file.size,
          analysis,
          timestamp: new Date().toISOString()
        };
      } catch (pdfError) {
        console.error('❌ PDF processing error:', pdfError);
        
        // Provide a more helpful error message
        let errorMessage = 'Failed to process PDF file';
        if (pdfError instanceof Error) {
          if (pdfError.message.includes('PDF parsing library not available')) {
            errorMessage = 'PDF processing library is not available. Please try again or contact support.';
          } else if (pdfError.message.includes('Invalid PDF')) {
            errorMessage = 'The uploaded file is not a valid PDF document.';
          } else {
            errorMessage = `PDF processing failed: ${pdfError.message}`;
          }
        }
        
        return NextResponse.json({
          error: errorMessage,
          code: 'PDF_PROCESSING_ERROR',
          details: pdfError instanceof Error ? pdfError.message : 'Unknown PDF error'
        }, { status: 500 });
      }

    } else if (type === 'youtube') {
      console.log('🎥 Processing YouTube video');
      
      const url = formData.get('url') as string;
      if (!url) {
        console.log('❌ No YouTube URL provided');
        return NextResponse.json({
          error: 'YouTube URL is required',
          code: 'MISSING_URL'
        }, { status: 400 });
      }

      console.log('🎥 YouTube URL:', url);

      try {
        // Process YouTube video
        console.log('🔄 Initializing YouTube processor');
        const youtubeProcessor = getEnhancedYouTubeProcessor();
        
        console.log('🔄 Generating YouTube analysis');
        const analysis = await youtubeProcessor.generateAnalysis(url);
        console.log('✅ YouTube analysis completed');

        result = {
          type: 'youtube',
          url,
          analysis,
          timestamp: new Date().toISOString()
        };
      } catch (youtubeError) {
        console.error('❌ YouTube processing error:', youtubeError);
        
        // Provide a more helpful error message
        let errorMessage = 'Failed to process YouTube video';
        if (youtubeError instanceof Error) {
          if (youtubeError.message.includes('Could not extract functions')) {
            errorMessage = 'This YouTube video is restricted or unavailable. Please try a different video.';
          } else if (youtubeError.message.includes('Invalid YouTube URL')) {
            errorMessage = 'Please provide a valid YouTube video URL.';
          } else if (youtubeError.message.includes('YouTube processing library not available')) {
            errorMessage = 'YouTube processing library is not available. Please try again or contact support.';
          } else if (youtubeError.message.includes('could not extract video ID')) {
            errorMessage = 'Please provide a valid YouTube video URL (youtube.com or youtu.be).';
          } else {
            errorMessage = `YouTube processing failed: ${youtubeError.message}`;
          }
        }
        
        return NextResponse.json({
          error: errorMessage,
          code: 'YOUTUBE_PROCESSING_ERROR',
          details: youtubeError instanceof Error ? youtubeError.message : 'Unknown YouTube error'
        }, { status: 500 });
      }

    } else {
      console.log('❌ Invalid type:', type);
      return NextResponse.json({
        error: 'Invalid type. Must be "pdf" or "youtube"',
        code: 'INVALID_TYPE'
      }, { status: 400 });
    }

    // Store in memory if sessionId is provided
    if (sessionId && result) {
      try {
        console.log('💾 Storing in memory');
        const memoryManager = getMemoryManager();
        if (memoryManager.isReady()) {
          await memoryManager.storeMemory({
            content: result.analysis,
            metadata: {
              userId,
              sessionId,
              query: `Processed ${type} content`,
              response: result.analysis,
              timestamp: new Date().toISOString(),
              type: 'document',
              tags: [type, 'multimodal'],
              confidence: 0.9,
            },
          });
          console.log(`✅ Stored ${type} analysis in memory for session: ${sessionId}`);
        } else {
          console.warn('⚠️ Memory manager not ready, skipping memory storage');
        }
      } catch (memoryError) {
        console.warn('⚠️ Failed to store multimodal content in memory:', memoryError);
      }
    }

    console.log('✅ Multimodal processing successful');
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: unknown) {
    console.error('❌ Multimodal processing error:', error);
    return NextResponse.json({
      error: 'Failed to process multimodal content',
      code: 'PROCESSING_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Multimodal GET API called');
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'status') {
      console.log('📊 Getting multimodal status');
      
      try {
        const pdfProcessor = getPDFProcessor();
        console.log('✅ PDF processor retrieved');
        
        const youtubeProcessor = getEnhancedYouTubeProcessor();
        console.log('✅ YouTube processor retrieved');

        return NextResponse.json({
          success: true,
          data: {
            pdf: {
              available: !!pdfProcessor,
              description: 'PDF document processing and analysis'
            },
            youtube: {
              available: !!youtubeProcessor,
              description: 'YouTube video processing and analysis'
            }
          }
        });
      } catch (processorError) {
        console.error('❌ Error getting processors:', processorError);
        return NextResponse.json({
          success: false,
          error: 'Failed to initialize processors',
          details: processorError instanceof Error ? processorError.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Default response for GET without action
    return NextResponse.json({
      success: true,
      message: 'Multimodal API is running',
      availableActions: ['status']
    });

  } catch (error: unknown) {
    console.error('❌ Multimodal GET error:', error);
    return NextResponse.json({
      error: 'Failed to get multimodal status',
      code: 'STATUS_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 