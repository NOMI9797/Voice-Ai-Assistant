'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Youtube, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface MultimodalResult {
  type: 'pdf' | 'youtube';
  fileName?: string;
  fileSize?: number;
  url?: string;
  analysis: string;
  timestamp: string;
}

interface MultiModalUploadProps {
  userId: string;
  sessionId: string;
  onAnalysisComplete: (result: MultimodalResult) => void;
  onError: (error: string) => void;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  fileName?: string;
  fileType?: 'pdf' | 'youtube';
  error?: string;
}

export default function MultiModalUpload({ 
  userId, 
  sessionId, 
  onAnalysisComplete, 
  onError 
}: MultiModalUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0
  });
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'pdf' | 'youtube'>('pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const resetUploadState = () => {
    setUploadState({
      isUploading: false,
      progress: 0
    });
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.includes('pdf')) {
      setUploadState(prev => ({
        ...prev,
        error: 'Please select a valid PDF file'
      }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setUploadState(prev => ({
        ...prev,
        error: 'File size must be less than 10MB'
      }));
      return;
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      fileName: file.name,
      fileType: 'pdf'
    });

    try {
      const formData = new FormData();
      formData.append('type', 'pdf');
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('sessionId', sessionId);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 200);

      const response = await fetch('/api/multimodal', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      setUploadState(prev => ({
        ...prev,
        progress: 100,
        isUploading: false
      }));

      onAnalysisComplete(result.data);

      // Reset after success
      setTimeout(resetUploadState, 2000);

    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Upload failed',
        isUploading: false
      }));
      onError(error instanceof Error ? error.message : 'Upload failed');
    }
  }, [userId, sessionId, onAnalysisComplete, onError]);

  const handleYouTubeAnalysis = async () => {
    if (!youtubeUrl.trim()) {
      setUploadState(prev => ({
        ...prev,
        error: 'Please enter a YouTube URL'
      }));
      return;
    }

    if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
      setUploadState(prev => ({
        ...prev,
        error: 'Please enter a valid YouTube URL'
      }));
      return;
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      fileType: 'youtube'
    });

    try {
      const formData = new FormData();
      formData.append('type', 'youtube');
      formData.append('url', youtubeUrl);
      formData.append('userId', userId);
      formData.append('sessionId', sessionId);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 15, 90)
        }));
      }, 300);

      const response = await fetch('/api/multimodal', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      
      setUploadState(prev => ({
        ...prev,
        progress: 100,
        isUploading: false
      }));

      onAnalysisComplete(result.data);
      setYoutubeUrl('');

      // Reset after success
      setTimeout(resetUploadState, 2000);

    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Analysis failed',
        isUploading: false
      }));
      onError(error instanceof Error ? error.message : 'Analysis failed');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex mb-6 bg-white/5 backdrop-blur-sm rounded-lg p-1 border border-white/10">
        <button
          onClick={() => setActiveTab('pdf')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md transition-all duration-200 ${
            activeTab === 'pdf'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
              : 'text-gray-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText size={18} />
          PDF Document
        </button>
        <button
          onClick={() => setActiveTab('youtube')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md transition-all duration-200 ${
            activeTab === 'youtube'
              ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
              : 'text-gray-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Youtube size={18} />
          YouTube Video
        </button>
      </div>

      {/* PDF Upload */}
      {activeTab === 'pdf' && (
        <div className="space-y-4">
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              uploadState.isUploading
                ? 'border-blue-400 bg-blue-500/10'
                : 'border-gray-600 hover:border-blue-400 hover:bg-white/5'
            }`}
          >
            {uploadState.isUploading ? (
              <div className="space-y-4">
                <Loader2 className="mx-auto h-12 w-12 text-blue-400 animate-spin" />
                <div className="space-y-2">
                  <p className="text-white font-medium">Processing {uploadState.fileName}</p>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-400">{uploadState.progress}% complete</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div>
                  <p className="text-white font-medium mb-2">Upload PDF Document</p>
                  <p className="text-gray-400 text-sm mb-4">
                    Drag and drop your PDF file here, or click to browse
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
                  >
                    Choose File
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Maximum file size: 10MB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* YouTube Analysis */}
      {activeTab === 'youtube' && (
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Enter YouTube URL (e.g., https://youtube.com/watch?v=...)"
                className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={uploadState.isUploading}
              />
              {youtubeUrl && (
                <button
                  onClick={() => setYoutubeUrl('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <button
              onClick={handleYouTubeAnalysis}
              disabled={uploadState.isUploading || !youtubeUrl.trim()}
              className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                uploadState.isUploading || !youtubeUrl.trim()
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-lg hover:scale-105'
              }`}
            >
              {uploadState.isUploading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing Video...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Youtube size={18} />
                  Analyze Video
                </div>
              )}
            </button>
          </div>

          {uploadState.isUploading && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
              <div className="space-y-2">
                <p className="text-white font-medium">Processing YouTube Video</p>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400">{uploadState.progress}% complete</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {uploadState.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-400" size={20} />
          <p className="text-red-400 text-sm">{uploadState.error}</p>
          <button
            onClick={resetUploadState}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Success Display */}
      {uploadState.progress === 100 && !uploadState.isUploading && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="text-green-400" size={20} />
          <p className="text-green-400 text-sm">
            {uploadState.fileType === 'pdf' ? 'PDF processed successfully!' : 'Video analyzed successfully!'}
          </p>
        </div>
      )}
    </div>
  );
} 