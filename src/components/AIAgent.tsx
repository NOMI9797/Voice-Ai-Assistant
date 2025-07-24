'use client';

import React, { useState } from 'react';
import VoiceInput from './VoiceInput';
import { Bot, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface AIAgentProps {
  className?: string;
}

interface AgentResponse {
  content: string;
  sources?: string[];
  confidence?: number;
  processingTime?: number;
  searchUsed?: boolean;
}

export default function AIAgent({ className = '' }: AIAgentProps) {
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [agentStatus, setAgentStatus] = useState<'idle' | 'ready' | 'error'>('idle');
  const [toolsStatus, setToolsStatus] = useState<{
    isInitialized: boolean;
    totalTools: number;
    availableTools: Array<{
      name: string;
      description: string;
      isAvailable: boolean;
      isInitialized: boolean;
    }>;
  } | null>(null);

  // Check agent status on component mount
  React.useEffect(() => {
    checkAgentStatus();
    checkToolsStatus();
  }, []);

  const checkAgentStatus = async () => {
    try {
      const res = await fetch('/api/agent');
      const data = await res.json();
      
      if (data.success && data.data.status.isInitialized) {
        setAgentStatus('ready');
      } else {
        setAgentStatus('error');
        setError('Agent is not properly configured. Please check your API keys.');
      }
    } catch {
      setAgentStatus('error');
      setError('Failed to connect to the AI agent.');
    }
  };

  const checkToolsStatus = async () => {
    try {
      const res = await fetch('/api/tools');
      const data = await res.json();
      
      if (data.success) {
        setToolsStatus(data.data.status);
      }
    } catch {
      console.warn('Failed to get tools status');
    }
  };

  const handleTranscript = async (text: string) => {
    setError('');
    setResponse(null);
    
    if (agentStatus !== 'ready') {
      setError('Agent is not ready. Please check your configuration.');
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: text,
          userId: 'user-1', // In a real app, this would come from authentication
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResponse(data.data);
      } else {
        setError(data.error || 'Failed to get response from agent');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const getStatusIcon = () => {
    switch (agentStatus) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    switch (agentStatus) {
      case 'ready':
        return 'Agent Ready';
      case 'error':
        return 'Agent Error';
      default:
        return 'Checking Status...';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Agent Status */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Bot className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-700">AI Research Agent</span>
          <div className="flex items-center gap-2 ml-auto">
            {getStatusIcon()}
            <span className="text-sm text-gray-600">{getStatusText()}</span>
          </div>
        </div>

        {/* Tools Status */}
        {toolsStatus && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Available Tools</h4>
            <div className="space-y-2">
              {toolsStatus.availableTools?.map((tool, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${tool.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-blue-700">{tool.name}</span>
                  <span className="text-xs text-blue-600">({tool.description})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Voice Input */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Step 2: AI Agent Processing
        </h3>
        <VoiceInput
          onTranscript={handleTranscript}
          onError={handleError}
          className="mb-4"
        />
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div>
              <p className="font-medium text-blue-800">Processing your question...</p>
              <p className="text-sm text-blue-600">The AI agent is analyzing your request</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <Bot className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                AI Response
              </h3>
              <div className="flex items-center gap-2 mb-2">
                {response.searchUsed ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    🔍 Web Search
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                    🧠 AI Knowledge
                  </span>
                )}
                {response.processingTime && (
                  <span className="text-sm text-green-600">
                    Processed in {response.processingTime}ms
                    {response.confidence && (
                      <span className="ml-2">
                        • Confidence: {Math.round(response.confidence * 100)}%
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-800">
              {response.content}
            </div>
          </div>

          {response.sources && response.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Sources:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                {response.sources.map((source, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600">{index + 1}.</span>
                    <span>{source}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="text-center text-sm text-gray-500">
        <p>Speak your research question and the AI agent will process it intelligently.</p>
        <p className="mt-1">The agent can help with web searches, document analysis, and more.</p>
      </div>
    </div>
  );
} 