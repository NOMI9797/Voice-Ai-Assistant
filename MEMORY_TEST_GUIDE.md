# 🧠 Memory Feature Test Guide

## 🎯 **How to Test the Memory System**

### **Step 1: Open the Application**
1. Go to: `http://localhost:3000`
2. You should see the AI Agent interface with memory status

### **Step 2: Test Memory Storage**

#### **Test Scenario 1: Basic Memory Storage**
1. **Ask Question 1**: "What is artificial intelligence?"
2. **Wait for Response**: The AI will answer and store this interaction
3. **Ask Question 2**: "Tell me more about AI applications"
4. **Check Response**: You should see memory context from the previous question

#### **Test Scenario 2: Web Search Memory**
1. **Ask**: "Search for latest news about climate change"
2. **Wait**: The AI will search the web and store the results
3. **Ask**: "What were the main points from that climate change news?"
4. **Check**: The AI should reference the previous search results

#### **Test Scenario 3: Sequential Learning**
1. **Ask**: "What is machine learning?"
2. **Ask**: "How does it relate to AI?"
3. **Ask**: "Give me examples of ML applications"
4. **Check**: Each response should build on previous context

### **Step 3: Test Memory Retrieval**

#### **Test Scenario 4: Memory Context Display**
1. **Ask Multiple Questions**: Ask 3-4 related questions
2. **Look for Memory Headers**: Responses should show "🧠 Memory Context"
3. **Check Previous Queries**: You should see relevant previous interactions

#### **Test Scenario 5: Memory Search**
1. **Ask**: "What did we discuss about AI earlier?"
2. **Check**: The AI should reference previous AI-related conversations

### **Step 4: Test Memory API**

#### **Check Memory Status**
```bash
curl http://localhost:3000/api/memory
```

#### **Get Memory Statistics**
```bash
curl "http://localhost:3000/api/memory?action=stats&userId=test-user"
```

#### **Search Memories**
```bash
curl "http://localhost:3000/api/memory?action=search&query=artificial%20intelligence&userId=test-user"
```

#### **Get Recent Memories**
```bash
curl "http://localhost:3000/api/memory?action=recent&userId=test-user"
```

## 🎯 **Expected Memory Features**

### **✅ What You Should See:**

1. **Memory Context Headers**
   ```
   🧠 Memory Context
   
   I found 2 relevant previous interactions that might be helpful:
   
   1. Previous Query: What is artificial intelligence?
      Response: Artificial intelligence (AI) is a branch of computer science...
      Similarity: 85%
   
   ---
   
   🧠 AI Knowledge Response
   
   [Current response here]
   ```

2. **Memory Status in UI**
   - Pinecone connection status
   - Index name display
   - Real-time status updates

3. **Enhanced Responses**
   - References to previous conversations
   - Context-aware answers
   - Follow-up suggestions

### **🔍 Memory Indicators:**

- **🔍 Web Search Results**: When web search is used
- **🧠 AI Knowledge Response**: When using LLM knowledge
- **🧠 Memory Context**: When relevant memories are found
- **📊 Processing Time**: Shows how fast responses are generated

## 🧪 **Test Data Examples**

### **Sample Conversation Flow:**

**User**: "What is machine learning?"
**AI**: [Explains ML with memory context if available]

**User**: "How does it work?"
**AI**: [Builds on previous ML context]

**User**: "Give me real-world examples"
**AI**: [References previous ML discussion + provides examples]

**User**: "What about deep learning?"
**AI**: [Connects to previous ML context + explains deep learning]

### **Memory Test Questions:**

1. **Basic Knowledge**: "What is quantum computing?"
2. **Follow-up**: "How does it differ from classical computing?"
3. **Application**: "What are its practical uses?"
4. **Current Events**: "Search for latest quantum computing news"
5. **Recall**: "What did we discuss about quantum computing?"

## 🚨 **Troubleshooting**

### **If Memory Context Doesn't Appear:**
1. Check if Pinecone is properly configured
2. Verify API key in `.env.local`
3. Ensure index exists in Pinecone console
4. Check browser console for errors

### **If Responses Are Slow:**
1. This is normal for first-time queries
2. Subsequent queries should be faster due to memory
3. Check network connection to Pinecone

### **If Memory API Fails:**
1. Check server logs for errors
2. Verify Pinecone index name matches `.env.local`
3. Ensure Pinecone API key is valid

## 🎉 **Success Indicators**

You'll know the memory system is working when:

✅ **Memory context appears in responses**
✅ **Previous conversations are referenced**
✅ **Responses build on earlier context**
✅ **Memory status shows "Connected" in UI**
✅ **API endpoints return successful responses**

## 📊 **Memory Analytics**

The system tracks:
- Total memories stored
- Memory types (conversation, web_search, document)
- User-specific memory isolation
- Similarity scores for memory retrieval
- Processing times and performance metrics 