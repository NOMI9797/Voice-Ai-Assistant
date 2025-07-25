import { Tool } from '@langchain/core/tools';

// Dynamic import to avoid initialization issues
let pdfParse: any = null;

const loadPdfParse = async () => {
  if (!pdfParse) {
    try {
      console.log('🔄 Loading pdf-parse module...');
      const module = await import('pdf-parse');
      pdfParse = module.default || module;
      console.log('✅ pdf-parse loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load pdf-parse:', error);
      throw new Error('PDF parsing library not available');
    }
  }
  return pdfParse;
};

export interface PDFAnalysisResult {
  text: string;
  pageCount: number;
  wordCount: number;
  summary: string;
  keyTopics: string[];
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creationDate?: string;
  };
}

export class PDFProcessorTool extends Tool {
  name = 'pdf_processor';
  description = 'Process and analyze PDF documents to extract text, generate summaries, and identify key topics';

  constructor() {
    super();
  }

  /**
   * Parse PDF date safely
   */
  private parsePDFDate(dateString: string): string | undefined {
    try {
      // PDF dates can be in various formats, try to parse them safely
      if (dateString.startsWith('D:')) {
        // PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
        const year = dateString.substring(2, 6);
        const month = dateString.substring(6, 8);
        const day = dateString.substring(8, 10);
        const hour = dateString.substring(10, 12);
        const minute = dateString.substring(12, 14);
        const second = dateString.substring(14, 16);
        
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
      } else {
        // Try standard date parsing
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      return undefined;
    } catch (error) {
      console.warn('⚠️ Could not parse PDF date:', dateString);
      return undefined;
    }
  }

  /**
   * Process PDF buffer and extract text content
   */
  async processPDFBuffer(buffer: Buffer): Promise<PDFAnalysisResult> {
    try {
      console.log('🔄 Loading pdf-parse library');
      const pdfParseLib = await loadPdfParse();
      
      console.log('🔄 Parsing PDF buffer');
      const data = await pdfParseLib(buffer);
      
      const text = data.text;
      const pageCount = data.numpages;
      const wordCount = text.split(/\s+/).length;
      
      console.log(`✅ PDF parsed successfully: ${pageCount} pages, ${wordCount} words, ${text.length} characters`);
      
      // Check if PDF is very large
      if (text.length > 100000) { // 100KB of text
        console.log(`⚠️ Large PDF detected: ${Math.round(text.length / 1024)}KB of text`);
      }
      
      // Extract metadata
      const metadata = {
        title: data.info?.Title || undefined,
        author: data.info?.Author || undefined,
        subject: data.info?.Subject || undefined,
        creationDate: data.info?.CreationDate ? this.parsePDFDate(data.info.CreationDate) : undefined,
      };

      // Generate summary (first 1000 characters for better overview)
      const summary = text.length > 1000 ? text.substring(0, 1000) + '...' : text;
      
      // Extract key topics (simple keyword extraction)
      const keyTopics = this.extractKeyTopics(text);

      return {
        text,
        pageCount,
        wordCount,
        summary,
        keyTopics,
        metadata
      };
    } catch (error) {
      console.error('❌ PDF processing error:', error);
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract key topics from text using simple keyword analysis
   */
  private extractKeyTopics(text: string): string[] {
    // Enhanced keyword extraction with better filtering
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'a', 'an', 'as', 'from', 'not', 'no', 'yes', 'if', 'then', 'else', 'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose', 'all', 'any', 'each', 'every', 'some', 'such', 'more', 'most', 'many', 'much', 'few', 'several', 'both', 'either', 'neither', 'first', 'second', 'third', 'last', 'next', 'previous', 'current', 'new', 'old', 'good', 'bad', 'big', 'small', 'high', 'low', 'long', 'short', 'time', 'year', 'month', 'day', 'week', 'hour', 'minute', 'second', 'now', 'today', 'yesterday', 'tomorrow', 'here', 'there', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        word.length < 20 && 
        !stopWords.has(word) &&
        !/^\d+$/.test(word) // Exclude pure numbers
      );

    const wordFreq: { [key: string]: number } = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Get top 15 most frequent meaningful words
    const sortedWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([word]) => word);

    return sortedWords;
  }

  /**
   * Generate a comprehensive analysis of the PDF content
   */
  async generateAnalysis(pdfBuffer: Buffer): Promise<string> {
    console.log('🔄 PDF generateAnalysis called with buffer size:', pdfBuffer.length);
    
    try {
      const result = await this.processPDFBuffer(pdfBuffer);
      console.log('✅ PDF processing completed successfully');
      
      return `PDF Analysis Results:

📄 Document Information:
- Pages: ${result.pageCount}
- Words: ${result.wordCount}
- Title: ${result.metadata.title || 'Not specified'}
- Author: ${result.metadata.author || 'Not specified'}
- Subject: ${result.metadata.subject || 'Not specified'}
- Creation Date: ${result.metadata.creationDate || 'Not specified'}

📋 Summary (First 1000 characters):
${result.summary}

🔑 Key Topics (${result.keyTopics.length} identified):
${result.keyTopics.map((topic, index) => `${index + 1}. ${topic}`).join('\n')}

📝 Complete Document Text:
${result.text}

---
📊 Analysis Complete: Extracted ${result.wordCount} words from ${result.pageCount} pages`;
    } catch (error) {
      console.error('❌ PDF generateAnalysis error:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async _call(input: string): Promise<string> {
    // This method is required by the Tool class but we'll use the specific methods above
    throw new Error('Use processPDFBuffer() or generateAnalysis() methods directly');
  }
}

// Singleton instance
let pdfProcessorInstance: PDFProcessorTool | null = null;

export const getPDFProcessor = (): PDFProcessorTool => {
  if (!pdfProcessorInstance) {
    pdfProcessorInstance = new PDFProcessorTool();
  }
  return pdfProcessorInstance;
}; 