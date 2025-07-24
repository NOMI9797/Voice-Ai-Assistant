import { NextRequest, NextResponse } from 'next/server';
import { getResearchAgent, AgentRequest } from '@/lib/langchain/agent';
import { LangChainError } from '@/lib/langchain/config';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { query, context, userId } = body as AgentRequest;

    // Validate request
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Get agent instance
    const agent = getResearchAgent();

    // Check if agent is ready
    if (!agent.isReady()) {
      return NextResponse.json(
        { error: 'Agent is not properly initialized. Please check your API configuration.' },
        { status: 503 }
      );
    }

    // Process the query
    const response = await agent.processQuery({
      query: query.trim(),
      context,
      userId,
    });

    // Return successful response
    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });

  } catch (error: unknown) {
    console.error('API Error:', error);

    // Handle specific LangChain errors
    if (error instanceof LangChainError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code || 'LANGCHAIN_ERROR'
        },
        { status: 400 }
      );
    }

    // Handle API key errors
    if (error instanceof Error && error.message.includes('GROQ_API_KEY')) {
      return NextResponse.json(
        { 
          error: 'API configuration error. Please check your Groq API key.',
          code: 'API_CONFIG_ERROR'
        },
        { status: 500 }
      );
    }

    // Handle general errors
    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again.',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const agent = getResearchAgent();
    const status = agent.getStatus();

    return NextResponse.json({
      success: true,
      data: {
        status,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('Status check error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get agent status',
        code: 'STATUS_ERROR'
      },
      { status: 500 }
    );
  }
} 