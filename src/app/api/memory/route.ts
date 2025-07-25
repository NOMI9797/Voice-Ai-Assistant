import { NextRequest, NextResponse } from 'next/server';
import { getMemoryManager } from '@/lib/langchain/memory/pineconeMemoryManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    const memoryManager = getMemoryManager();

    if (!memoryManager.isReady()) {
      return NextResponse.json({ 
        error: 'Memory system is not available', 
        code: 'MEMORY_NOT_AVAILABLE' 
      }, { status: 503 });
    }

    switch (action) {
      case 'stats':
        const stats = await memoryManager.getMemoryStats(userId || undefined);
        return NextResponse.json({ success: true, data: stats });

      case 'search':
        const query = searchParams.get('query');
        const sessionId = searchParams.get('sessionId');
        if (!query || !userId) {
          return NextResponse.json({ 
            error: 'Query and userId are required for search', 
            code: 'MISSING_PARAMS' 
          }, { status: 400 });
        }
        const searchResults = await memoryManager.searchMemories(query, userId, 5, sessionId || undefined);
        return NextResponse.json({ success: true, data: searchResults });

      case 'recent':
        if (!userId) {
          return NextResponse.json({ 
            error: 'UserId is required for recent memories', 
            code: 'MISSING_USER_ID' 
          }, { status: 400 });
        }
        const recentMemories = await memoryManager.getUserMemories(userId);
        return NextResponse.json({ success: true, data: recentMemories });

      default:
        const status = memoryManager.getStatus();
        return NextResponse.json({ success: true, data: status });
    }

  } catch (error: unknown) {
    console.error('Memory API error:', error);
    return NextResponse.json({ 
      error: 'Failed to process memory request', 
      code: 'MEMORY_ERROR' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const memoryId = searchParams.get('id');
    const userId = searchParams.get('userId');

    const memoryManager = getMemoryManager();
    
    if (!memoryManager.isReady()) {
      return NextResponse.json({ 
        error: 'Memory system is not available', 
        code: 'MEMORY_NOT_AVAILABLE' 
      }, { status: 503 });
    }

    if (action === 'clear') {
      if (!userId) {
        return NextResponse.json({ 
          error: 'UserId is required for clearing memories', 
          code: 'MISSING_USER_ID' 
        }, { status: 400 });
      }

      try {
        // Delete all memories for this user
        const deletedCount = await memoryManager.deleteUserMemories(userId);
        return NextResponse.json({ 
          success: true, 
          message: `Cleared ${deletedCount} memories for user` 
        });
      } catch (error) {
        console.error('Failed to clear user memories:', error);
        return NextResponse.json({ 
          error: 'Failed to clear user memories', 
          code: 'CLEAR_ERROR' 
        }, { status: 500 });
      }
    }

    // Default: delete specific memory
    if (!memoryId) {
      return NextResponse.json({ 
        error: 'Memory ID is required', 
        code: 'MISSING_MEMORY_ID' 
      }, { status: 400 });
    }

    const deleted = await memoryManager.deleteMemory(memoryId);
    
    if (deleted) {
      return NextResponse.json({ success: true, message: 'Memory deleted successfully' });
    } else {
      return NextResponse.json({ 
        error: 'Memory not found', 
        code: 'MEMORY_NOT_FOUND' 
      }, { status: 404 });
    }

  } catch (error: unknown) {
    console.error('Memory deletion error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete memory', 
      code: 'DELETE_ERROR' 
    }, { status: 500 });
  }
} 