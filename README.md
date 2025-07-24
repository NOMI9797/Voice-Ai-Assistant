# Voice-Activated AI Research Assistant

A Next.js web application that lets users speak, search, summarize, and recall knowledge using cutting-edge LLM and memory techniques.

## 🎯 Project Overview

This is a sophisticated voice-activated AI research assistant that combines:
- **Voice Input**: Real-time speech-to-text using Web Speech API
- **Intelligent Agent**: LangChain.js for smart task routing
- **Memory System**: MCP (Model Context Provider) for storing and recalling findings
- **Ultra-Fast LLM**: Groq for sub-second response times
- **Multi-modal Support**: PDF and video analysis capabilities

## 🚀 Step 1: Voice Input System

### ✅ What's Implemented

1. **Voice Input Component** (`src/components/VoiceInput.tsx`)
   - Real-time speech-to-text using Web Speech API
   - Visual feedback with animated indicators
   - Error handling for various speech recognition scenarios
   - Interim transcript display
   - Professional UI with Tailwind CSS

2. **Demo Page** (`src/app/page.tsx`)
   - Clean, modern interface
   - Real-time transcript display
   - Error handling and user feedback
   - Feature preview cards

### 🔧 Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Open Browser**
   Navigate to `http://localhost:3000`

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

**Status**: Step 1 Complete ✅ - Voice Input System Ready
**Next**: Step 2 - LangChain Agent Setup
