declare module 'youtube-transcript-api' {
  export interface TranscriptResponse {
    text: string;
    duration: number;
    offset: number;
  }

  export class YoutubeTranscriptApi {
    static getTranscript(videoId: string, options?: any): Promise<TranscriptResponse[]>;
    static listTranscripts(videoId: string): Promise<any>;
  }

  export default YoutubeTranscriptApi;
} 