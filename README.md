# Voice-Activated AI Research Assistant

A Next.js web application that lets users speak, search, summarize, and recall knowledge using cutting-edge LLM and memory techniques.

## 🎯 Project Overview

This is a sophisticated voice-activated AI research assistant that combines:
- **Voice Input**: Real-time speech-to-text using Web Speech API
- **Intelligent Agent**: LangChain.js for smart task routing
- **Memory System**: MCP (Model Context Provider) for storing and recalling findings
- **Ultra-Fast LLM**: Groq for sub-second response times
- **Multi-modal Support**: PDF and video analysis capabilities

## 🚀 Project Progress

### ✅ Completed Steps:
- **Step 1**: Voice Input Integration (Web Speech API) ✅
- **Step 2**: AI Agent with LangChain & Groq Integration ✅
- **Step 3**: Web Search Integration (Google Custom Search API) ✅
- **Step 4**: Pinecone Memory Integration ✅
- **Step 4.5**: MongoDB Chat Integration ✅
- **Step 5**: Multi-modal Support (PDF/Video Analysis) ✅

### 🎯 Current Status:
**Step 5: Multi-modal Support** - **COMPLETED** ✅

## 📋 Step 5: Multi-modal Support ✅

### ✅ What's Implemented

1. **PDF Processing** (`src/lib/langchain/tools/pdfProcessor.ts`)
   - PDF text extraction and parsing
   - Document metadata extraction
   - Key topics identification
   - Comprehensive analysis generation

2. **YouTube Processing** (`src/lib/langchain/tools/youtubeProcessor.ts`)
   - YouTube video information extraction
   - Video metadata analysis
   - Content summarization
   - Key topics identification

3. **Multi-modal API** (`src/app/api/multimodal/route.ts`)
   - File upload handling
   - YouTube URL processing
   - Memory integration
   - Error handling and validation

4. **Professional UI** (`src/components/MultiModalUpload.tsx`)
   - Drag-and-drop file upload
   - Tabbed interface (PDF/YouTube)
   - Progress indicators
   - Error handling and success states
   - Professional glassmorphism design

5. **Integration** (`src/components/AIAgent.tsx`)
   - Multi-modal upload button in sidebar
   - Modal interface for file processing
   - Chat integration with processed content
   - Memory storage for analyzed content

### 🔧 Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Install Multi-modal Dependencies**
   ```bash
   npm install pdf-parse multer @types/multer ytdl-core @types/pdf-parse
   ```

3. **Run Development Server**
```bash
npm run dev
   ```

4. **Open Browser**
   Navigate to `http://localhost:3000`

### 📁 Multi-modal Features

#### PDF Processing
- **File Size Limit**: 10MB maximum
- **Supported Formats**: PDF only
- **Features**:
  - Text extraction and parsing
  - Document metadata (title, author, creation date)
  - Key topics identification
  - Page count and word count
  - Comprehensive analysis generation

#### YouTube Processing
- **Supported URLs**: youtube.com and youtu.be
- **Features**:
  - Video information extraction
  - Duration, view count, upload date
  - Channel information
  - Content description analysis
  - Key topics identification

#### Usage Instructions
1. Click "Upload Media" button in the sidebar
2. Choose between PDF or YouTube tab
3. **For PDF**: Drag and drop or click to browse
4. **For YouTube**: Paste YouTube URL and click "Analyze Video"
5. Wait for processing to complete
6. Ask questions about the processed content in chat

### 🔑 Memory Integration
- Processed content is automatically stored in Pinecone memory
- Content is linked to the current chat session
- AI can reference processed content when answering questions
- Content persists across chat sessions for the same user

### 🌐 Browser Compatibility

The voice input system works with:
- ✅ Chrome (recommended)
- ✅ Edge
- ✅ Safari
- ❌ Firefox (limited support)

### 📱 Testing Voice Input

1. Click the microphone button
2. Allow microphone access when prompted
3. Speak clearly and naturally
4. Your transcript will appear in real-time
5. Click the button again to stop listening

### 🔑 Required APIs (Future Steps)

For upcoming steps, you'll need these API keys:

1. **OpenAI API Key** (for Whisper fallback)
   - Sign up at: https://platform.openai.com/
   - Cost: ~$0.006 per minute of audio
   - Used for: More accurate transcription when Web Speech API fails

2. **Groq API Key** (for ultra-fast LLM)
   - Sign up at: https://console.groq.com/
   - Used for: Sub-second response generation

3. **SerpAPI Key** (for web search)
   - Sign up at: https://serpapi.com/
   - Used for: Web search functionality

4. **Vector Database** (ChromaDB/Pinecone)
   - Used for: Memory storage and retrieval

## 🏗️ Project Structure

```
voice-ai-assistant/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main demo page
│   │   ├── layout.tsx        # App layout
│   │   └── globals.css       # Global styles
│   └── components/
│       └── VoiceInput.tsx    # Voice input component
├── public/                   # Static assets
├── package.json             # Dependencies
└── README.md               # This file
```

## 🎨 Features Implemented

### Voice Input System
- ✅ Real-time speech recognition
- ✅ Visual feedback with animations
- ✅ Error handling and user guidance
- ✅ Interim transcript display
- ✅ Professional UI design
- ✅ Browser compatibility checks
- ✅ Microphone permission handling

### UI/UX Features
- ✅ Responsive design
- ✅ Modern gradient background
- ✅ Clean component structure
- ✅ Loading states and animations
- ✅ Error states with helpful messages
- ✅ Feature preview cards

## 🔄 Next Steps

1. **Step 2**: LangChain Agent Setup
   - Install LangChain.js
   - Set up Groq LLM integration
   - Create agent with tool routing

2. **Step 3**: Web Search Integration
   - SerpAPI integration
   - Search result processing
   - Response formatting

3. **Step 4**: Memory System (MCP)
   - Vector database setup
   - Memory storage and retrieval
   - Context management

4. **Step 5**: PDF Analysis
   - Document upload
   - PDF parsing and chunking
   - Question answering

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Quality
- TypeScript for type safety
- ESLint for code quality
- Tailwind CSS for styling
- Lucide React for icons

## 📝 Notes

- The voice input system uses the Web Speech API which is built into modern browsers
- No API keys are required for Step 1
- The system gracefully handles errors and provides helpful feedback
- The UI is designed to be professional and user-friendly
- All components are fully typed with TypeScript

## 🤝 Contributing

This is a client project with specific requirements. Please follow the established patterns and maintain code quality standards.

---

## 🚀 Step 2: LangChain Agent Setup ✅

### ✅ What's Implemented

1. **LangChain Integration** (`src/lib/langchain/`)
   - Groq LLM configuration with ultra-fast inference
   - Research agent with intelligent query processing
   - Error handling and response formatting
   - API route for agent communication

2. **AI Agent Component** (`src/components/AIAgent.tsx`)
   - Integrated voice input with AI processing
   - Real-time agent status monitoring
   - Professional response display with confidence scores
   - Processing time tracking

3. **API Endpoints** (`src/app/api/agent/`)
   - POST `/api/agent` - Process user queries
   - GET `/api/agent` - Check agent status
   - Comprehensive error handling

### 🔧 Setup Instructions

1. **Get Groq API Key**
   - Sign up at: https://console.groq.com/
   - Copy your API key

2. **Configure Environment**
   ```bash
   # Edit .env.local
   GROQ_API_KEY=your_actual_groq_api_key_here
   ```

3. **Test the Agent**
   - Start the development server: `npm run dev`
   - Speak a question and watch the AI process it

### 🎯 Features

- **Ultra-Fast Processing**: Groq LLM with sub-second response times
- **Intelligent Responses**: Context-aware AI with follow-up suggestions
- **Error Handling**: Comprehensive error management and user feedback
- **Status Monitoring**: Real-time agent status and health checks
- **Professional UI**: Clean, modern interface with loading states

## 🚀 Step 3: Web Search Integration ✅

### ✅ What's Implemented

1. **Google Custom Search API Integration** (`src/lib/langchain/tools/webSearch.ts`)
   - Enhanced web search tool with Google Custom Search API
   - Intelligent result parsing and formatting
   - Error handling and fallback mechanisms
   - Source extraction and citation

2. **Tools Management System** (`src/lib/langchain/tools/index.ts`)
   - Centralized tools management
   - Tool availability monitoring
   - Status reporting and health checks

3. **Enhanced Agent** (`src/lib/langchain/agent.ts`)
   - Intelligent query routing to appropriate tools
   - Web search integration with automatic detection
   - Source extraction and citation
   - Fallback to direct LLM when tools unavailable

4. **API Endpoints** (`src/app/api/tools/`)
   - GET `/api/tools` - Check tools status
   - Enhanced agent status with tools information

5. **UI Enhancements** (`src/components/AIAgent.tsx`)
   - Tools status display
   - Real-time availability monitoring
   - Professional tools overview

### 🔧 Setup Instructions

1. **Google Custom Search API** (Already configured)
   - API Key: `AIzaSyDQXW3upeMqvqkCyBMUBfA-_UenGVihCkA`
   - Custom Search Engine ID: `b626d9037280b4e6d`
   - Already configured in `.env.local`

2. **Environment Configuration**
   ```bash
   # Already configured in .env.local
   GOOGLE_API_KEY=AIzaSyDQXW3upeMqvqkCyBMUBfA-_UenGVihCkA
   GOOGLE_CX=b626d9037280b4e6d
   ```

3. **Test Web Search**
   - Start the development server: `npm run dev`
   - Ask questions like "Search for latest news about AI" or "Find information about climate change"
   - Watch the agent automatically use Google Custom Search when appropriate

### 🎯 Features

- **Intelligent Routing**: Agent automatically detects when web search is needed
- **Real-time Results**: Get current information from the web
- **Source Citations**: All results include proper source links
- **Fallback System**: Graceful degradation when tools unavailable
- **Professional Formatting**: Clean, structured search results

### 🔍 Web Search Keywords

The agent automatically uses web search for queries containing:
- "search", "find", "latest", "recent", "news", "current"
- "what is", "who is", "when", "where", "how to"
- "latest news", "current events", "recent developments"

## 🚀 Step 4: Pinecone Memory Integration ✅

### ✅ What's Implemented

1. **Pinecone Memory Manager** (`src/lib/langchain/memory/pineconeMemoryManager.ts`)
   - Managed vector database service
   - Semantic memory storage and retrieval
   - User-specific memory isolation
   - Memory statistics and analytics

2. **Enhanced Agent with Memory** (`src/lib/langchain/agent.ts`)
   - Automatic memory storage for all interactions
   - Memory search for relevant context
   - Memory-enhanced responses with previous context
   - Memory status integration

3. **Memory API Endpoints** (`src/app/api/memory/`)
   - GET `/api/memory` - Memory status and operations
   - DELETE `/api/memory` - Delete specific memories
   - Memory search and statistics

4. **UI Memory Integration** (`src/components/AIAgent.tsx`)
   - Memory system status display
   - Memory context in responses
   - Professional memory overview

### 🔧 Setup Instructions

1. **Pinecone Account Setup**
   - Sign up at: https://www.pinecone.io/
   - Create a free account and verify email

2. **Create Pinecone Index**
   - Index Name: `research-memory`
   - Dimensions: `1536`
   - Metric: `cosine`
   - Choose your preferred cloud region

3. **Get API Key**
   - Copy your Pinecone API key from the console

4. **Configure Environment**
   ```bash
   # Edit .env.local
   PINECONE_API_KEY=your_actual_pinecone_api_key_here
   PINECONE_INDEX_NAME=research-memory
   ```

5. **Test Memory System**
   - Start the development server: `npm run dev`
   - Ask multiple questions and see memory context in responses
   - Check memory status in the UI

### 🎯 Features

- **🧠 Semantic Memory**: Store and retrieve information using vector similarity
- **📚 Context Awareness**: Previous interactions provide context for new queries
- **👤 User Isolation**: Each user has their own memory space
- **🔍 Memory Search**: Find relevant previous interactions
- **📊 Memory Analytics**: Track memory usage and statistics

### 📋 Memory Operations

- **Automatic Storage**: All interactions are automatically stored
- **Context Retrieval**: Relevant memories are retrieved for each query
- **Memory Display**: Previous context shown in responses
- **Memory Management**: View and delete memories via API

## 🚀 Step 4.5: MongoDB Chat Integration ✅

### ✅ What's Implemented

1. **MongoDB Chat Manager** (`src/lib/database/mongoChatManager.ts`)
   - Persistent chat session storage
   - User-specific chat organization
   - Message metadata and tracking
   - Chat session management

2. **Enhanced AI Agent** (`src/components/AIAgent.tsx`)
   - Chat session management UI
   - Create new chat sessions
   - Load existing sessions
   - Persistent chat history across devices

3. **Chat API Endpoints** (`src/app/api/chat/`)
   - POST `/api/chat?action=create` - Create new chat session
   - POST `/api/chat?action=message` - Add message to session
   - GET `/api/chat?action=sessions` - Get user's chat sessions
   - GET `/api/chat?action=session` - Get specific session
   - DELETE `/api/chat` - Delete chat session

4. **Improved Response Formatting**
   - Better visual presentation of AI responses
   - Color-coded sections for different response types
   - Enhanced chat history display
   - Professional UI with session management

### 🔧 Setup Instructions

1. **MongoDB Setup**
   - Follow the detailed guide in `MONGODB_SETUP.md`
   - Choose between local MongoDB or MongoDB Atlas (cloud)

2. **Environment Configuration**
   ```bash
   # Add to .env.local
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB_NAME=voice-ai-assistant
   ```

3. **Test Chat System**
   - Start the development server: `npm run dev`
   - Create new chat sessions
   - Test session persistence across page refreshes
   - Verify chat history storage

### 🎯 Features

- **💬 Chat Sessions**: Create and manage multiple chat sessions
- **💾 Persistent Storage**: Chat history survives page refreshes and device changes
- **🔍 Session Search**: Search through chat history
- **📊 Chat Analytics**: Track session statistics and usage
- **🎨 Enhanced UI**: Professional chat interface with session management

### 📋 Chat Operations

- **Session Management**: Create, load, and delete chat sessions
- **Message Storage**: Persistent storage of all user and AI messages
- **Metadata Tracking**: Store search usage, sources, confidence, and processing time
- **Cross-Device Sync**: Access chat history from any device

**Status**: Step 4.5 Complete ✅ - Enhanced Chat System with MongoDB Ready
**Next**: Step 5 - Multi-modal Support (PDF/Video Analysis)
