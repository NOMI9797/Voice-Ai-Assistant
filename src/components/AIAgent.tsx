'use client';

import React, { useState, useEffect } from 'react';
import VoiceInput from './VoiceInput';
import { Bot, Loader2, AlertCircle, CheckCircle, Clock, Info } from 'lucide-react';

interface AgentResponse {
  content: string;
  sources?: string[];
  confidence?: number;
  processingTime?: number;
  searchUsed?: boolean;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  response?: AgentResponse;
}

interface AIAgentProps {
  className?: string;
}

export default function AIAgent({ className = '' }: AIAgentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [agentStatus, setAgentStatus] = useState<{
    isInitialized: boolean;
    model: string;
    temperature: number;
  } | null>(null);
  const [toolsStatus, setToolsStatus] = useState<{
    status: {
      isInitialized: boolean;
      totalTools: number;
      availableTools: Array<{
        name: string;
        description: string;
        isAvailable: boolean;
        isInitialized: boolean;
      }>;
    };
  } | null>(null);
  const [memoryStatus, setMemoryStatus] = useState<{
    isInitialized: boolean;
    pineconeConnected: boolean;
    indexName: string;
  } | null>(null);
  
  // Chat history state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('voice-ai-chat-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setChatHistory(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (error) {
        console.warn('Failed to load chat history:', error);
      }
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('voice-ai-chat-history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    checkAgentStatus();
    checkToolsStatus();
    checkMemoryStatus();
  }, []);

  const checkAgentStatus = async () => {
    try {
      const res = await fetch('/api/agent');
      const data = await res.json();
      if (data.success) {
        setAgentStatus(data.data);
      }
    } catch {
      console.warn('Failed to get agent status');
    }
  };

  const checkToolsStatus = async () => {
    try {
      const res = await fetch('/api/tools');
      const data = await res.json();
      if (data.success) {
        setToolsStatus(data.data);
      }
    } catch {
      console.warn('Failed to get tools status');
    }
  };

  const checkMemoryStatus = async () => {
    try {
      const res = await fetch('/api/memory');
      const data = await res.json();
      if (data.success) {
        setMemoryStatus(data.data);
      }
    } catch {
      console.warn('Failed to get memory status');
    }
  };

  const handleTranscript = async (transcript: string) => {
    if (!transcript.trim()) return;

    setIsProcessing(true);
    setError(null);
    setResponse(null);

    // Add user message to chat history
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: transcript,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: transcript,
          userId: userId
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResponse(data.data);
        
        // Add AI response to chat history
        const aiMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          type: 'ai',
          content: data.data.content,
          timestamp: new Date(),
          response: data.data
        };
        setChatHistory(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Add error message to chat history
      const errorMessageObj: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'ai',
        content: `Error: ${errorMessage}`,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessageObj]);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearChatHistory = () => {
    setChatHistory([]);
    localStorage.removeItem('voice-ai-chat-history');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-3">
        {/* Agent Status */}
        {agentStatus && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">AI Agent</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${agentStatus.isInitialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-blue-700">Groq LLM</span>
                <span className="text-xs text-blue-600">({agentStatus.model})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm text-blue-700">Temperature</span>
                <span className="text-xs text-blue-600">({agentStatus.temperature})</span>
              </div>
            </div>
          </div>
        )}

        {/* Tools Status */}
        {toolsStatus && (
          <div className="p-3 bg-orange-50 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-2">Available Tools</h4>
            <div className="space-y-2">
              {toolsStatus.status.availableTools.map((tool) => (
                <div key={tool.name} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${tool.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-orange-700">{tool.name.replace('_', ' ')}</span>
                  <span className="text-xs text-orange-600">({tool.isAvailable ? 'Available' : 'Not Available'})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memory Status */}
        {memoryStatus && (
          <div className="p-3 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-2">Memory System</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${memoryStatus.isInitialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-purple-700">Pinecone</span>
                <span className="text-xs text-purple-600">({memoryStatus.isInitialized ? 'Connected' : 'Not Available'})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm text-purple-700">Index</span>
                <span className="text-xs text-purple-600">({memoryStatus.indexName})</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat History */}
      {chatHistory.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Chat History</h3>
            <button
              onClick={clearChatHistory}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
            >
              Clear History
            </button>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {chatHistory.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-50 border border-blue-200 ml-8'
                    : 'bg-green-50 border border-green-200 mr-8'
                }`}
              >
                <div className="flex items-start gap-3">
                  {message.type === 'user' ? (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      U
                    </div>
                  ) : (
                    <Bot className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-800">
                        {message.type === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-gray-700 whitespace-pre-wrap">{message.content}</div>
                    {message.response && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {message.response.searchUsed && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              🔍 Web Search
                            </span>
                          )}
                          {!message.response.searchUsed && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                              🧠 AI Knowledge
                            </span>
                          )}
                          {message.response.processingTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {message.response.processingTime}ms
                            </span>
                          )}
                          {message.response.confidence && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {Math.round(message.response.confidence)}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Input */}
      <VoiceInput
        onTranscript={handleTranscript}
        onError={(error) => setError(error)}
        className="w-full"
      />

      {/* Processing State */}
      {isProcessing && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
          <span className="text-yellow-800">Processing your request...</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Current Response Display */}
      {response && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <Bot className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-800 mb-2">AI Response</h3>
              <div className="flex items-center gap-4 text-sm text-green-700 mb-3">
                {response.searchUsed && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    🔍 Web Search
                  </span>
                )}
                {!response.searchUsed && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                    🧠 AI Knowledge
                  </span>
                )}
                {response.processingTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Processed in {response.processingTime}ms
                  </span>
                )}
                {response.confidence && (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Confidence: {Math.round(response.confidence)}%
                  </span>
                )}
              </div>
              <div className="text-gray-800 whitespace-pre-wrap">{response.content}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 