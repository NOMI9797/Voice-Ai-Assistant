# 🎯 Pinecone Setup Guide

## 🚀 **Why Pinecone?**

- ✅ **Managed Service**: No local setup required
- ✅ **Production Ready**: Scalable and reliable
- ✅ **Free Tier**: Available for development
- ✅ **Better Performance**: Optimized for vector search
- ✅ **Easy Integration**: Simple API

## 📋 **Setup Steps**

### **1. Create Pinecone Account**
1. Go to [https://www.pinecone.io/](https://www.pinecone.io/)
2. Sign up for a free account
3. Verify your email

### **2. Get API Key**
1. Log into Pinecone Console
2. Go to API Keys section
3. Copy your API key

### **3. Create Index**
1. In Pinecone Console, click "Create Index"
2. **Index Name**: `research-memory`
3. **Dimensions**: `1536` (for OpenAI embeddings)
4. **Metric**: `cosine`
5. **Cloud**: Choose your preferred region
6. Click "Create Index"

### **4. Update Environment Variables**
Edit `.env.local`:
```bash
# Pinecone Vector Database
PINECONE_API_KEY=your_actual_pinecone_api_key_here
PINECONE_INDEX_NAME=research-memory
```

### **5. Test the Setup**
```bash
# Start the development server
npm run dev

# Check memory API
curl http://localhost:3000/api/memory
```

## 🎯 **Features**

- **🧠 Semantic Memory**: Store and retrieve information using vector similarity
- **📚 Context Awareness**: Previous interactions provide context for new queries
- **👤 User Isolation**: Each user has their own memory space
- **🔍 Memory Search**: Find relevant previous interactions
- **📊 Memory Analytics**: Track memory usage and statistics

## 🚀 **Ready to Use!**

Once you've set up Pinecone, the memory system will automatically:
1. Store all interactions in Pinecone
2. Search for relevant memories when processing queries
3. Provide memory context in responses
4. Show memory status in the UI

## 💡 **Tips**

- The free tier includes 1 index and 100,000 vectors
- Perfect for development and small projects
- Easy to scale to paid plans for production 