import { Tool } from '@langchain/core/tools';

// Dynamic import to avoid initialization issues
let ytdl: any = null;
let transcriptApi: any = null;

const loadYtdl = async () => {
  if (!ytdl) {
    try {
      console.log('🔄 Loading ytdl-core module...');
      const module = await import('ytdl-core');
      ytdl = module.default || module;
      console.log('✅ ytdl-core loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load ytdl-core:', error);
      throw new Error('YouTube processing library not available');
    }
  }
  return ytdl;
};

const loadTranscriptApi = async () => {
  if (!transcriptApi) {
    try {
      console.log('🔄 Loading youtube-transcript-api module...');
      const module = await import('youtube-transcript-api');
      transcriptApi = module.default || module;
      console.log('✅ youtube-transcript-api loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load youtube-transcript-api:', error);
    }
  }
  return transcriptApi;
};

export interface YouTubeAnalysisResult {
  videoInfo: {
    title: string;
    description: string;
    duration: string;
    viewCount: string;
    uploadDate: string;
    channel: string;
    url: string;
  };
  transcript?: string;
  summary: string;
  keyTopics: string[];
}

export class YouTubeProcessorTool extends Tool {
  name = 'youtube_processor';
  description = 'Process and analyze YouTube videos to extract information, transcripts, and generate summaries';

  constructor() {
    super();
  }

  /**
   * Extract video information from YouTube URL
   */
  async getVideoInfo(url: string): Promise<YouTubeAnalysisResult> {
    try {
      console.log('🔄 Processing YouTube URL:', url);
      
      // Extract video ID from URL
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL - could not extract video ID');
      }

      console.log('🔄 Video ID extracted:', videoId);

      // Try to get basic video info first
      let videoInfo = {
        title: 'Unknown Title',
        description: 'No description available',
        duration: 'Unknown',
        viewCount: 'Unknown',
        uploadDate: 'Unknown',
        channel: 'Unknown Channel',
        url: url
      };

      // Try ytdl-core first
      try {
        console.log('🔄 Attempting ytdl-core method...');
        const ytdlLib = await loadYtdl();
        
        if (ytdlLib.validateURL(url)) {
          console.log('✅ URL validated by ytdl-core');
          const info = await ytdlLib.getInfo(url);
          console.log('✅ Video info retrieved from ytdl-core');
          const videoDetails = info.videoDetails;
          
          videoInfo = {
            title: videoDetails.title || 'Unknown Title',
            description: videoDetails.description || 'No description available',
            duration: videoDetails.lengthSeconds ? this.formatDuration(parseInt(videoDetails.lengthSeconds)) : 'Unknown',
            viewCount: videoDetails.viewCount || 'Unknown',
            uploadDate: videoDetails.uploadDate || 'Unknown',
            channel: videoDetails.author?.name || 'Unknown Channel',
            url: url
          };
          console.log('✅ ytdl-core method successful:', {
            title: videoInfo.title,
            channel: videoInfo.channel,
            duration: videoInfo.duration
          });
        } else {
          console.warn('⚠️ URL not validated by ytdl-core');
        }
      } catch (ytdlError) {
        console.error('❌ ytdl-core method failed:', ytdlError);
        // Continue with fallback approach
      }

      // Extract transcript using youtube-transcript-api
      let transcript = '';
      try {
        console.log('🔄 Attempting transcript extraction...');
        const transcriptLib = await loadTranscriptApi();
        if (transcriptLib && transcriptLib.YoutubeTranscriptApi) {
          const transcriptData = await transcriptLib.YoutubeTranscriptApi.getTranscript(videoId);
          transcript = transcriptData.map((item: any) => item.text).join(' ');
          console.log('✅ Transcript extracted successfully');
        } else {
          console.warn('⚠️ youtube-transcript-api not available');
        }
      } catch (transcriptError) {
        console.warn('⚠️ Transcript extraction failed:', transcriptError);
        // Use description as fallback
        transcript = videoInfo.description || '';
      }

      // If we still have no video info, try a simple fallback
      if (videoInfo.title === 'Unknown Title') {
        console.log('🔄 Using fallback video info...');
        videoInfo = {
          title: `YouTube Video (${videoId})`,
          description: 'Video information could not be retrieved. This may be due to video restrictions, age restrictions, or the video being private/deleted. Please try a different video.',
          duration: 'Unknown',
          viewCount: 'Unknown',
          uploadDate: 'Unknown',
          channel: 'Unknown Channel',
          url: url
        };
      }

      // If transcript is empty, provide a helpful message
      if (!transcript) {
        transcript = 'Transcript not available. This may be due to video restrictions, language settings, or the video not having captions.';
      }

      // Generate summary from description and transcript
      const summary = this.generateSummary(videoInfo.description, transcript);
      
      // Extract key topics
      const keyTopics = this.extractKeyTopics(videoInfo.description + ' ' + transcript);

      return {
        videoInfo,
        transcript: transcript || undefined,
        summary,
        keyTopics
      };
    } catch (error) {
      console.error('❌ YouTube processing error:', error);
      throw new Error(`Failed to process YouTube video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
   * Format duration from seconds to readable format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Generate summary from video description and transcript
   */
  private generateSummary(description: string, transcript: string): string {
    const content = description + ' ' + transcript;
    
    if (content.length > 500) {
      return content.substring(0, 500) + '...';
    }
    return content;
  }

  /**
   * Extract key topics from video content
   */
  private extractKeyTopics(content: string): string[] {
    // Simple keyword extraction
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordFreq: { [key: string]: number } = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Get top 8 most frequent words
    const sortedWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([word]) => word);

    return sortedWords;
  }

  /**
   * Generate a comprehensive analysis of the YouTube video
   */
  async generateAnalysis(url: string): Promise<string> {
    console.log('🔄 YouTube generateAnalysis called with URL:', url);
    
    try {
      const result = await this.getVideoInfo(url);
      console.log('✅ YouTube processing completed successfully');
      
      return `YouTube Video Analysis Results:

🎥 Video Information:
- Title: ${result.videoInfo.title}
- Channel: ${result.videoInfo.channel}
- Duration: ${result.videoInfo.duration}
- Views: ${result.videoInfo.viewCount}
- Upload Date: ${result.videoInfo.uploadDate}
- URL: ${result.videoInfo.url}

📋 Summary:
${result.summary}

🔑 Key Topics:
${result.keyTopics.map((topic, index) => `${index + 1}. ${topic}`).join('\n')}

📝 Description:
${result.videoInfo.description.substring(0, 500)}${result.videoInfo.description.length > 500 ? '...' : ''}

${result.transcript ? `📄 Transcript (First 500 characters):
${result.transcript.substring(0, 500)}${result.transcript.length > 500 ? '...' : ''}` : '📄 Transcript: Not available'}`;
    } catch (error) {
      console.error('❌ YouTube generateAnalysis error:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async _call(input: string): Promise<string> {
    // This method is required by the Tool class but we'll use the specific methods above
    throw new Error('Use getVideoInfo() or generateAnalysis() methods directly');
  }
}

// Singleton instance
let youtubeProcessorInstance: YouTubeProcessorTool | null = null;

export const getYouTubeProcessor = (): YouTubeProcessorTool => {
  if (!youtubeProcessorInstance) {
    youtubeProcessorInstance = new YouTubeProcessorTool();
  }
  return youtubeProcessorInstance;
}; 