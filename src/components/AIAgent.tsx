'use client';

import React, { useState, useEffect } from 'react';
import VoiceInput from './VoiceInput';
import { Bot, Loader2, AlertCircle, CheckCircle, Clock, Info, MessageSquare, Plus, Trash2, Search, FileText, Brain, Sparkles, Zap, Globe, Database, Menu, X } from 'lucide-react';

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

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
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
  const [chatStatus, setChatStatus] = useState<{
    isInitialized: boolean;
    mongoConnected: boolean;
    dbName: string;
  } | null>(null);
  
  // Chat session state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Set userId on client-side mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try to get existing userId from localStorage
      const existingUserId = localStorage.getItem('voice-ai-user-id');
      if (existingUserId) {
        console.log('🔑 Using existing userId from localStorage:', existingUserId);
        setUserId(existingUserId);
      } else {
        // Generate new userId if none exists
        const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('voice-ai-user-id', newUserId);
        console.log('🔑 Generated new userId:', newUserId);
        setUserId(newUserId);
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) return; // Don't initialize until userId is set
    
    const initializeApp = async () => {
      await checkAgentStatus();
      await checkToolsStatus();
      await checkMemoryStatus();
      await checkChatStatus();
      
      // Load existing sessions only - don't create new ones automatically
      await loadChatSessions();
    };
    
    initializeApp();
  }, [userId]); // Add userId as dependency

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

  const checkChatStatus = async () => {
    try {
      const res = await fetch('/api/chat?userId=' + userId);
      const data = await res.json();
      if (data.success) {
        setChatStatus(data.data);
      }
    } catch {
      console.warn('Failed to get chat status');
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch('/api/chat?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          title: `New Chat`
        }),
      });
      const data = await res.json();
      if (data.success) {
        const sessionId = data.data.sessionId;
        console.log(`✅ Created new session: ${sessionId}`);
        setCurrentSessionId(sessionId);
        setChatHistory([]);
        loadChatSessions(); // Refresh sidebar
        return sessionId; // Return the sessionId for immediate use
      }
    } catch (error) {
      console.warn('Failed to create chat session:', error);
    }
    return null;
  };

  const loadChatSessions = async () => {
    try {
      const res = await fetch(`/api/chat?action=sessions&userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setChatSessions(data.data);
        // If there are existing sessions, load the most recent one
        if (data.data && data.data.length > 0) {
          const mostRecentSession = data.data[0]; // Assuming sessions are sorted by date
          await loadSession(mostRecentSession.id);
        } else {
          // If no sessions exist, create a new one
          await createNewSession();
        }
      }
    } catch (error) {
      console.warn('Failed to load chat sessions:', error);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat?action=session&userId=${userId}&sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setCurrentSessionId(sessionId);
        // Convert MongoDB messages to our format
        const messages = data.data.messages?.map((msg: any) => ({
          id: msg.id,
          type: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          response: msg.metadata ? {
            searchUsed: msg.metadata.searchUsed,
            sources: msg.metadata.sources,
            confidence: msg.metadata.confidence,
            processingTime: msg.metadata.processingTime
          } : undefined
        })) || [];
        setChatHistory(messages);
        setSidebarOpen(false); // Close sidebar on mobile
      }
    } catch (error) {
      console.warn('Failed to load session:', error);
    }
  };

  const handleTranscript = async (transcript: string) => {
    if (!transcript.trim()) return;

    // Ensure we have a session before processing
    let sessionId = currentSessionId;
    if (!sessionId) {
      console.log('⚠️ No session ID available, creating new session...');
      sessionId = await createNewSession();
      if (!sessionId) {
        console.error('❌ Failed to create session');
        return;
      }
    }

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

    // Save user message to MongoDB if session exists
    if (sessionId) {
      try {
        await fetch('/api/chat?action=message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            message: {
              role: 'user',
              content: transcript
            }
          }),
        });
      } catch (error) {
        console.warn('Failed to save user message:', error);
      }
    }

    try {
      console.log(`📤 Sending request with sessionId: ${sessionId}, userId: ${userId}`);
      if (!sessionId) {
        console.error('❌ No sessionId available for request!');
        return;
      }
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: transcript,
          userId: userId,
          sessionId: sessionId
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

        // Save AI message to MongoDB if session exists
        if (sessionId) {
          try {
            await fetch('/api/chat?action=message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: sessionId,
                message: {
                  role: 'assistant',
                  content: data.data.content,
                  metadata: {
                    searchUsed: data.data.searchUsed,
                    sources: data.data.sources,
                    confidence: data.data.confidence,
                    processingTime: data.data.processingTime
                  }
                }
              }),
            });
          } catch (error) {
            console.warn('Failed to save AI message:', error);
          }
        }

        // Update session title with first user message
        if (chatHistory.length === 0 && sessionId) {
          try {
            await fetch('/api/chat?action=title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: sessionId,
                title: transcript.length > 30 ? transcript.substring(0, 30) + '...' : transcript
              }),
            });
            loadChatSessions(); // Refresh sidebar
          } catch (error) {
            console.warn('Failed to update session title:', error);
          }
        }
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
  };

  const clearUserData = async () => {
    if (typeof window !== 'undefined') {
      // Delete all memories for this user from Pinecone
      if (userId) {
        try {
          console.log('🗑️ Clearing all memories for user:', userId);
          await fetch('/api/memory?action=clear&userId=' + userId, {
            method: 'DELETE',
          });
          console.log('✅ All memories cleared');
        } catch (error) {
          console.warn('Failed to clear memories:', error);
        }
      }
      
      localStorage.removeItem('voice-ai-user-id');
      setChatHistory([]);
      setChatSessions([]);
      setCurrentSessionId(null);
      // Reload the page to generate a new userId
      window.location.reload();
    }
  };

  const formatResponse = (content: string, response: AgentResponse) => {
    const lines = content.split('\n');
    const formattedLines: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      if (line.startsWith('🔍 **Web Search Results**')) {
        formattedLines.push(
          <div key={index} className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-xl p-4 mb-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-blue-300">Web Search Results</span>
            </div>
            {response.sources && response.sources.length > 0 && (
              <div className="text-sm text-blue-200 mb-3">
                <strong className="text-blue-300">Sources:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {response.sources.map((source, i) => (
                    <li key={i} className="truncate text-blue-200/80">{source}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      } else if (line.startsWith('🧠 **AI Knowledge Response**')) {
        formattedLines.push(
          <div key={index} className="bg-gradient-to-r from-emerald-900/20 to-green-900/20 border border-emerald-500/30 rounded-xl p-4 mb-4 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-emerald-300">AI Knowledge Response</span>
            </div>
          </div>
        );
      } else if (line.startsWith('🧠 **Memory Context**')) {
        formattedLines.push(
          <div key={index} className="bg-gradient-to-r from-purple-900/20 to-violet-900/20 border border-purple-500/30 rounded-xl p-4 mb-4 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-purple-300">Memory Context</span>
            </div>
          </div>
        );
      } else if (line.trim()) {
        formattedLines.push(<div key={index} className="mb-3 text-gray-200 leading-relaxed break-words">{line}</div>);
      } else {
        formattedLines.push(<div key={index} className="mb-3">&nbsp;</div>);
      }
    });

    return formattedLines;
  };

  return (
    <div className={`flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 ${className}`}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-80 bg-black/20 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-white font-semibold">Voice AI</h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

                     {/* New Chat Button */}
           <div className="p-4 space-y-2">
             <button
               onClick={createNewSession}
               className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-300"
             >
               <Plus className="w-4 h-4" />
               New Chat
             </button>
             <button
               onClick={clearUserData}
               className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-all duration-300"
             >
               <Trash2 className="w-4 h-4" />
               Clear All Data
             </button>
           </div>

          {/* Chat Sessions List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                    currentSessionId === session.id
                      ? 'bg-white/20 border border-white/30'
                      : 'hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white truncate">
                        {session.title}
                      </div>
                      {session.messages.length > 0 && (
                        <div className="text-xs text-gray-400 truncate mt-1">
                          {session.messages[session.messages.length - 1]?.content.substring(0, 50)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

             {/* Main Content */}
       <div className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-black/20 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-white font-semibold">Voice AI Assistant</h1>
          <div className="w-10"></div>
        </div>

        {/* System Status */}
        <div className="p-4 border-b border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {agentStatus && (
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${agentStatus.isInitialized ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-red-400'}`}></div>
                <span className="text-white text-sm">AI Agent</span>
              </div>
            )}
            {toolsStatus && (
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${toolsStatus.status.isInitialized ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-red-400'}`}></div>
                <span className="text-white text-sm">Tools</span>
              </div>
            )}
            {memoryStatus && (
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${memoryStatus.isInitialized ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-red-400'}`}></div>
                <span className="text-white text-sm">Memory</span>
              </div>
            )}
            {chatStatus && (
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${chatStatus.isInitialized ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-red-400'}`}></div>
                <span className="text-white text-sm">Storage</span>
              </div>
            )}
          </div>
        </div>

                 {/* Chat Messages */}
         <div className="flex-1 overflow-y-auto p-4 space-y-6 min-w-0">
           {chatHistory.length === 0 && !isProcessing && (
             <div className="flex items-center justify-center h-full">
               <div className="text-center max-w-2xl mx-auto">
                 <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                   <Sparkles className="w-8 h-8 text-white" />
                 </div>
                 <h3 className="text-white font-semibold text-xl mb-2">Welcome to Voice AI Assistant</h3>
                 <p className="text-gray-400">Click the microphone and start speaking to begin a conversation.</p>
               </div>
             </div>
           )}

           {chatHistory.map((message) => (
             <div
               key={message.id}
               className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
             >
               <div
                 className={`max-w-3xl w-full rounded-2xl p-6 ${
                   message.type === 'user'
                     ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/25'
                     : 'bg-white/5 backdrop-blur-sm border border-white/10 text-gray-200'
                 }`}
               >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-white/20' 
                      : 'bg-gradient-to-r from-purple-500 to-cyan-500'
                  }`}>
                    {message.type === 'user' ? (
                      <span className="text-white font-medium">U</span>
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium opacity-80">
                      {message.type === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                    <p className="text-xs opacity-60">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                                 <div className="text-sm leading-relaxed break-words overflow-hidden">
                   {message.type === 'ai' && message.response ? (
                     formatResponse(message.content, message.response)
                   ) : (
                     <div className="whitespace-pre-wrap">{message.content}</div>
                   )}
                 </div>
              </div>
            </div>
          ))}

          {/* Processing State */}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    <div className="absolute inset-0 w-6 h-6 border-2 border-cyan-400/30 rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <p className="text-white font-medium">Processing your request...</p>
                    <p className="text-gray-400 text-sm">AI is analyzing and generating response</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex justify-start">
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <div>
                    <p className="text-red-300 font-medium">Error occurred</p>
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Voice Input */}
        <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-xl">
          <VoiceInput onTranscript={handleTranscript} />
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
} 