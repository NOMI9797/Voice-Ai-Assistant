import { NextRequest, NextResponse } from 'next/server';
import { getChatManager } from '@/lib/database/mongoChatManager';
import { getMemoryManager } from '@/lib/langchain/memory/pineconeMemoryManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action');

    const chatManager = getChatManager();

    if (!chatManager.isReady()) {
      return NextResponse.json({ 
        error: 'Chat system is not available', 
        code: 'CHAT_NOT_AVAILABLE' 
      }, { status: 503 });
    }

    if (!userId) {
      return NextResponse.json({ 
        error: 'UserId is required', 
        code: 'MISSING_USER_ID' 
      }, { status: 400 });
    }

    switch (action) {
      case 'sessions':
        const sessions = await chatManager.getUserSessions(userId);
        return NextResponse.json({ success: true, data: sessions });

      case 'session':
        if (!sessionId) {
          return NextResponse.json({ 
            error: 'SessionId is required', 
            code: 'MISSING_SESSION_ID' 
          }, { status: 400 });
        }
        const session = await chatManager.getChatSession(sessionId);
        return NextResponse.json({ success: true, data: session });

      case 'search':
        const query = searchParams.get('query');
        if (!query) {
          return NextResponse.json({ 
            error: 'Query is required for search', 
            code: 'MISSING_QUERY' 
          }, { status: 400 });
        }
        const searchResults = await chatManager.searchChatSessions(userId, query);
        return NextResponse.json({ success: true, data: searchResults });

      case 'stats':
        const stats = await chatManager.getChatStats(userId);
        return NextResponse.json({ success: true, data: stats });

      default:
        const status = chatManager.getStatus();
        return NextResponse.json({ success: true, data: status });
    }

  } catch (error: unknown) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      error: 'Failed to process chat request', 
      code: 'CHAT_ERROR' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    const chatManager = getChatManager();

    if (!chatManager.isReady()) {
      return NextResponse.json({ 
        error: 'Chat system is not available', 
        code: 'CHAT_NOT_AVAILABLE' 
      }, { status: 503 });
    }

    switch (action) {
      case 'create':
        const { userId, title } = body;
        if (!userId) {
          return NextResponse.json({ 
            error: 'UserId is required', 
            code: 'MISSING_USER_ID' 
          }, { status: 400 });
        }
        const sessionId = await chatManager.createChatSession(userId, title);
        return NextResponse.json({ success: true, data: { sessionId } });

      case 'message':
        const { sessionId: msgSessionId, message } = body;
        if (!msgSessionId || !message) {
          return NextResponse.json({ 
            error: 'SessionId and message are required', 
            code: 'MISSING_PARAMS' 
          }, { status: 400 });
        }
        await chatManager.addMessage(msgSessionId, message);
        return NextResponse.json({ success: true, message: 'Message added' });

      case 'title':
        const { sessionId: titleSessionId, title: newTitle } = body;
        if (!titleSessionId || !newTitle) {
          return NextResponse.json({ 
            error: 'SessionId and title are required', 
            code: 'MISSING_PARAMS' 
          }, { status: 400 });
        }
        await chatManager.updateSessionTitle(titleSessionId, newTitle);
        return NextResponse.json({ success: true, message: 'Title updated' });

      default:
        return NextResponse.json({ 
          error: 'Invalid action', 
          code: 'INVALID_ACTION' 
        }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      error: 'Failed to process chat request', 
      code: 'CHAT_ERROR' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'SessionId is required', 
        code: 'MISSING_SESSION_ID' 
      }, { status: 400 });
    }

    const chatManager = getChatManager();
    const memoryManager = getMemoryManager();
    
    if (!chatManager.isReady()) {
      return NextResponse.json({ 
        error: 'Chat system is not available', 
        code: 'CHAT_NOT_AVAILABLE' 
      }, { status: 503 });
    }

    // First, get the session to find the userId before deleting
    const session = await chatManager.getChatSession(sessionId);
    if (!session) {
      return NextResponse.json({ 
        error: 'Chat session not found', 
        code: 'SESSION_NOT_FOUND' 
      }, { status: 404 });
    }

    // Delete the chat session from MongoDB
    const deleted = await chatManager.deleteChatSession(sessionId);
    
    if (deleted) {
      // Also delete all memories associated with this session from Pinecone
      if (memoryManager.isReady()) {
        try {
          console.log(`🗑️ Deleting memories for session: ${sessionId}`);
          await memoryManager.deleteSessionMemories(sessionId);
          console.log(`✅ Successfully deleted memories for session: ${sessionId}`);
        } catch (error) {
          console.warn('Failed to delete session memories:', error);
          // Don't fail the entire deletion if memory deletion fails
        }
      }
      
      return NextResponse.json({ success: true, message: 'Chat session and associated memories deleted successfully' });
    } else {
      return NextResponse.json({ 
        error: 'Chat session not found', 
        code: 'SESSION_NOT_FOUND' 
      }, { status: 404 });
    }

  } catch (error: unknown) {
    console.error('Chat deletion error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete chat session', 
      code: 'DELETE_ERROR' 
    }, { status: 500 });
  }
} 