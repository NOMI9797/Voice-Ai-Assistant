import { Tool } from '@langchain/core/tools';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface EnhancedYouTubeAnalysisResult {
  title: string;
  description: string;
  duration: string;
  viewCount: string;
  uploadDate: string;
  channel: string;
  url: string;
  transcript: string;
  summary: string;
  keyTopics: string[];
  thumbnail?: string;
  category?: string;
  tags?: string[];
}

export class EnhancedYouTubeProcessorTool extends Tool {
  name = 'enhanced_youtube_processor';
  description = 'Process and analyze YouTube videos using multiple methods for better reliability';

  constructor() {
    super();
  }

  /**
   * Extract video ID from YouTube URL
   */
  private extractVideoId(url: string): string | null {
    console.log('🔄 Extracting video ID from URL:', url);
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
      /youtu\.be\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('✅ Video ID extracted:', match[1]);
        return match[1];
      }
    }
    
    console.log('❌ Could not extract video ID from URL');
    return null;
  }

  /**
   * Get video info using yt-dlp (most reliable method)
   */
  private async getVideoInfoWithYoutubeDl(url: string): Promise<any> {
    try {
      console.log('🔄 Using yt-dlp method...');
      
      // Use yt-dlp binary directly via exec
      const { stdout } = await execAsync(`yt-dlp --dump-json "${url}"`);
      
      const parsedInfo = JSON.parse(stdout);
      console.log('✅ yt-dlp method successful');
      return parsedInfo;
    } catch (error) {
      console.error('❌ yt-dlp method failed:', error);
      return null;
    }
  }

  /**
   * Get video info using ytdl-core (fallback method)
   */
  private async getVideoInfoWithYtdl(url: string): Promise<any> {
    try {
      console.log('🔄 Using ytdl-core fallback method...');
      
      // Dynamic import to avoid initialization issues
      const ytdl = await import('ytdl-core');
      
      if (ytdl.default.validateURL(url)) {
        const info = await ytdl.default.getInfo(url);
        console.log('✅ ytdl-core fallback method successful');
        return info;
      }
    } catch (error) {
      console.error('❌ ytdl-core fallback method failed:', error);
    }
    return null;
  }

  /**
   * Extract transcript using youtube-transcript-api
   */
  private async extractTranscript(videoId: string): Promise<string> {
    try {
      console.log('🔄 Attempting transcript extraction for video ID:', videoId);
      
      // Try to import and use youtube-transcript-api
      const transcriptApi = await import('youtube-transcript-api');
      const YoutubeTranscriptApi = transcriptApi.YoutubeTranscriptApi || transcriptApi.default;
      
      if (YoutubeTranscriptApi) {
        const transcriptData = await YoutubeTranscriptApi.getTranscript(videoId);
        const transcript = transcriptData.map((item: any) => item.text).join(' ');
        console.log('✅ Transcript extracted successfully');
        return transcript;
      }
    } catch (error) {
      console.warn('⚠️ Transcript extraction failed:', error);
    }
    return '';
  }

  /**
   * Format duration from seconds
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format upload date from various formats
   */
  private formatUploadDate(uploadDate: string | number): string {
    try {
      // Handle different date formats from yt-dlp
      let date: Date;
      
      if (typeof uploadDate === 'string') {
        // Try parsing as ISO string first
        if (uploadDate.includes('T') || uploadDate.includes('Z')) {
          date = new Date(uploadDate);
        } else {
          // Try parsing as YYYYMMDD format
          const year = parseInt(uploadDate.substring(0, 4));
          const month = parseInt(uploadDate.substring(4, 6)) - 1; // Month is 0-indexed
          const day = parseInt(uploadDate.substring(6, 8));
          date = new Date(year, month, day);
        }
      } else {
        // Handle timestamp
        date = new Date(uploadDate * 1000);
      }
      
      if (isNaN(date.getTime())) {
        return 'Unknown';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('⚠️ Failed to format upload date:', uploadDate, error);
      return 'Unknown';
    }
  }

  /**
   * Extract key topics from text
   */
  private extractKeyTopics(text: string): string[] {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'a', 'an', 'as', 'from', 'not', 'no', 'yes', 'if', 'then', 'else', 'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose', 'all', 'any', 'each', 'every', 'some', 'such', 'more', 'most', 'many', 'much', 'few', 'several', 'both', 'either', 'neither', 'first', 'second', 'third', 'last', 'next', 'previous', 'current', 'new', 'old', 'good', 'bad', 'big', 'small', 'high', 'low', 'long', 'short', 'time', 'year', 'month', 'day', 'week', 'hour', 'minute', 'second', 'now', 'today', 'yesterday', 'tomorrow', 'here', 'there', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'video', 'youtube', 'watch', 'click', 'subscribe', 'like', 'comment', 'share'
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        word.length < 20 && 
        !stopWords.has(word) &&
        !/^\d+$/.test(word)
      );

    const wordFreq: { [key: string]: number } = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const sortedWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([word]) => word);

    return sortedWords;
  }

  /**
   * Generate comprehensive analysis
   */
  async generateAnalysis(url: string): Promise<string> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Could not extract video ID from URL');
      }

      // Try multiple methods to get video info
      let videoInfo: any = null;
      
      // Method 1: youtube-dl-exec (most reliable)
      videoInfo = await this.getVideoInfoWithYoutubeDl(url);
      
      // Method 2: ytdl-core (fallback)
      if (!videoInfo) {
        videoInfo = await this.getVideoInfoWithYtdl(url);
      }

      // If all methods fail, create fallback info
      if (!videoInfo) {
        videoInfo = {
          title: `YouTube Video (${videoId})`,
          description: 'Video information could not be retrieved. This may be due to video restrictions, age restrictions, or the video being private/deleted.',
          duration: 0,
          view_count: 0,
          upload_date: '',
          uploader: 'Unknown Channel',
          thumbnail: '',
          categories: [],
          tags: []
        };
      }

      // Extract transcript
      const transcript = await this.extractTranscript(videoId);

      // Format video info
      const formattedInfo: EnhancedYouTubeAnalysisResult = {
        title: videoInfo.title || `YouTube Video (${videoId})`,
        description: videoInfo.description || 'No description available',
        duration: videoInfo.duration ? this.formatDuration(videoInfo.duration) : 'Unknown',
        viewCount: videoInfo.view_count ? videoInfo.view_count.toLocaleString() : 'Unknown',
        uploadDate: videoInfo.upload_date ? this.formatUploadDate(videoInfo.upload_date) : 'Unknown',
        channel: videoInfo.uploader || 'Unknown Channel',
        url: url,
        transcript: transcript || 'Transcript not available. This may be due to video restrictions, language settings, or the video not having captions.',
        summary: '',
        keyTopics: [],
        thumbnail: videoInfo.thumbnail,
        category: videoInfo.categories?.[0],
        tags: videoInfo.tags || []
      };

      // Generate summary from description and transcript
      const contentForSummary = `${formattedInfo.description} ${formattedInfo.transcript}`.trim();
      formattedInfo.summary = contentForSummary.length > 1000 
        ? contentForSummary.substring(0, 1000) + '...' 
        : contentForSummary;

      // Extract key topics
      formattedInfo.keyTopics = this.extractKeyTopics(contentForSummary);

      return `🎥 **YouTube Video Processed Successfully!**

YouTube Video Analysis Results:

🎥 Video Information:
- Title: ${formattedInfo.title}
- Channel: ${formattedInfo.channel}
- Duration: ${formattedInfo.duration}
- Views: ${formattedInfo.viewCount}
- Upload Date: ${formattedInfo.uploadDate}
- URL: ${formattedInfo.url}
${formattedInfo.category ? `- Category: ${formattedInfo.category}` : ''}

📋 Summary:
${formattedInfo.summary}

🔑 Key Topics (${formattedInfo.keyTopics.length} identified):
${formattedInfo.keyTopics.map((topic, index) => `${index + 1}. ${topic}`).join('\n')}

📝 Description:
${formattedInfo.description}

📄 Transcript (${formattedInfo.transcript.length > 500 ? 'First 500 characters' : 'Complete'}):
${formattedInfo.transcript.length > 500 ? formattedInfo.transcript.substring(0, 500) + '...' : formattedInfo.transcript}

${formattedInfo.tags && formattedInfo.tags.length > 0 ? `🏷️ Tags: ${formattedInfo.tags.slice(0, 10).join(', ')}${formattedInfo.tags.length > 10 ? '...' : ''}` : ''}

---
📊 Analysis Complete: Extracted ${formattedInfo.transcript.split(' ').length} words from transcript`;

    } catch (error) {
      console.error('❌ Enhanced YouTube processing error:', error);
      throw new Error(`Failed to process YouTube video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async _call(input: string): Promise<string> {
    return this.generateAnalysis(input);
  }
}

// Singleton instance
let enhancedYouTubeProcessorInstance: EnhancedYouTubeProcessorTool | null = null;

export const getEnhancedYouTubeProcessor = (): EnhancedYouTubeProcessorTool => {
  if (!enhancedYouTubeProcessorInstance) {
    enhancedYouTubeProcessorInstance = new EnhancedYouTubeProcessorTool();
  }
  return enhancedYouTubeProcessorInstance;
}; 