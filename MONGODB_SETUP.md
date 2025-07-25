# MongoDB Setup Guide

## 🗄️ **MongoDB Integration for Chat Sessions**

This guide will help you set up MongoDB for persistent chat storage in your Voice AI Research Assistant.

## 📋 **Prerequisites**

1. **MongoDB Installation**:
   - **Local**: Install MongoDB Community Server
   - **Cloud**: Use MongoDB Atlas (free tier available)

2. **Node.js**: Already installed in your project

## 🚀 **Setup Options**

### **Option 1: MongoDB Atlas (Recommended - Cloud)**

1. **Create MongoDB Atlas Account**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account
   - Create a new cluster (free tier: M0)

2. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

3. **Update Environment Variables**:
   Add to your `.env.local` file:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voice-ai-assistant?retryWrites=true&w=majority
   MONGODB_DB_NAME=voice-ai-assistant
   ```

### **Option 2: Local MongoDB**

1. **Install MongoDB Community Server**:
   ```bash
   # macOS (using Homebrew)
   brew tap mongodb/brew
   brew install mongodb-community
   
   # Start MongoDB service
   brew services start mongodb/brew/mongodb-community
   ```

2. **Update Environment Variables**:
   Add to your `.env.local` file:
   ```env
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB_NAME=voice-ai-assistant
   ```

## 🔧 **Environment Variables**

Add these to your `.env.local` file:

```env
# MongoDB Database
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=voice-ai-assistant
```

## 📊 **Database Structure**

The MongoDB integration will create the following collections:

### **chat_sessions Collection**
```json
{
  "_id": "ObjectId",
  "id": "chat_1234567890_abc123",
  "userId": "user_1234567890_xyz789",
  "title": "Chat 12/25/2024",
  "createdAt": "2024-12-25T10:00:00.000Z",
  "updatedAt": "2024-12-25T10:30:00.000Z",
  "messages": [
    {
      "id": "msg_1234567890_def456",
      "role": "user",
      "content": "What is artificial intelligence?",
      "timestamp": "2024-12-25T10:00:00.000Z"
    },
    {
      "id": "msg_1234567890_ghi789",
      "role": "assistant",
      "content": "Artificial intelligence is...",
      "timestamp": "2024-12-25T10:00:05.000Z",
      "metadata": {
        "searchUsed": true,
        "sources": ["https://example.com/ai"],
        "confidence": 0.95,
        "processingTime": 5000
      }
    }
  ],
  "metadata": {
    "topic": "AI Discussion",
    "tags": ["artificial-intelligence", "technology"],
    "summary": "Discussion about AI fundamentals"
  }
}
```

## 🎯 **Features**

### **Chat Session Management**
- ✅ Create new chat sessions
- ✅ Load existing sessions
- ✅ Persistent storage across devices
- ✅ Session metadata and organization

### **Message Storage**
- ✅ User and AI messages
- ✅ Message metadata (search used, sources, confidence)
- ✅ Timestamp tracking
- ✅ Processing time tracking

### **Search and Retrieval**
- ✅ Search chat sessions by content
- ✅ Get user's chat history
- ✅ Session statistics
- ✅ Recent sessions tracking

## 🧪 **Testing the Setup**

1. **Start the Development Server**:
   ```bash
   npm run dev
   ```

2. **Test Chat Session Creation**:
   ```bash
   curl -X POST "http://localhost:3000/api/chat?action=create" \
     -H "Content-Type: application/json" \
     -d '{"userId": "test-user", "title": "Test Chat"}'
   ```

3. **Test Message Storage**:
   ```bash
   curl -X POST "http://localhost:3000/api/chat?action=message" \
     -H "Content-Type: application/json" \
     -d '{"sessionId": "chat_123", "message": {"role": "user", "content": "Hello"}}'
   ```

4. **Test Session Retrieval**:
   ```bash
   curl "http://localhost:3000/api/chat?action=sessions&userId=test-user"
   ```

## 🔍 **Troubleshooting**

### **Connection Issues**
- Verify MongoDB is running
- Check connection string format
- Ensure network access (for Atlas)

### **Permission Issues**
- Check MongoDB user permissions
- Verify database access rights

### **Environment Variables**
- Ensure `.env.local` is in the correct location
- Restart the development server after changes

## 📈 **Performance Considerations**

- **Indexes**: Automatically created for better performance
- **Connection Pooling**: Handled by MongoDB driver
- **Data Size**: Monitor collection sizes for large chat histories

## 🔒 **Security Notes**

- Use environment variables for sensitive data
- Implement proper authentication for production
- Consider data encryption for sensitive conversations
- Regular backups for important chat data

## 🎉 **Next Steps**

Once MongoDB is set up:

1. **Test the chat system** in the web interface
2. **Create multiple chat sessions** to verify persistence
3. **Test session switching** and message loading
4. **Verify chat history** persists across page refreshes

Your Voice AI Research Assistant now has a robust chat management system! 🚀 