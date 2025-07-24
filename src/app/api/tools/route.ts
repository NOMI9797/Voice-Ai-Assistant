import { NextResponse } from 'next/server';
import { getToolsManager } from '@/lib/langchain/tools';

export async function GET() {
  try {
    const toolsManager = getToolsManager();
    const status = toolsManager.getStatus();

    return NextResponse.json({
      success: true,
      data: {
        status,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Tools status check error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get tools status',
        code: 'TOOLS_STATUS_ERROR'
      },
      { status: 500 }
    );
  }
} 