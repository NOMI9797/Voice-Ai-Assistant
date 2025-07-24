'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2, AlertCircle, Info } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function VoiceInput({ onTranscript, onError, className = '' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleFinalTranscript = useCallback((transcript: string) => {
    setIsProcessing(true);
    
    // Clean up the transcript
    const cleanedTranscript = transcript.trim();
    
    if (cleanedTranscript) {
      console.log('Final transcript:', cleanedTranscript);
      onTranscript(cleanedTranscript);
    }
    
    setIsProcessing(false);
    setInterimTranscript('');
  }, [onTranscript]);

  // Initialize speech recognition
  useEffect(() => {
    console.log('Initializing speech recognition...');
    
    // Check if we're on HTTPS (required for production)
    const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    console.log('HTTPS check:', { protocol: window.location.protocol, hostname: window.location.hostname, isHttps });
    
    if (!isHttps) {
      const errorMsg = 'Speech recognition requires HTTPS. Please use localhost for development or deploy to HTTPS.';
      setError(errorMsg);
      setDebugInfo('Protocol: ' + window.location.protocol);
      console.error(errorMsg);
      return;
    }

    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    console.log('SpeechRecognition available:', !!SpeechRecognition);
    
    if (!SpeechRecognition) {
      const errorMsg = 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.';
      setError(errorMsg);
      setDebugInfo('Browser: ' + navigator.userAgent);
      console.error(errorMsg);
      return;
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setError(null);
        setInterimTranscript('');
        setDebugInfo('Listening started');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('Speech recognition result:', event);
        let finalTranscript = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }

        setInterimTranscript(interim);
        setDebugInfo(`Interim: "${interim}" | Final: "${finalTranscript}"`);

        if (finalTranscript) {
          handleFinalTranscript(finalTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event);
        setIsListening(false);
        setIsProcessing(false);
        
        let errorMessage = 'Speech recognition error occurred.';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone access denied. Please check your microphone permissions.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed. Please check your browser settings.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        setError(errorMessage);
        setDebugInfo(`Error: ${event.error} - ${event.message}`);
        if (onError) onError(errorMessage);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        setIsProcessing(false);
        setDebugInfo('Recognition ended');
      };

      setDebugInfo('Speech recognition initialized successfully');
      console.log('Speech recognition initialized successfully');

    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setError('Failed to initialize speech recognition. Please refresh the page and try again.');
      setDebugInfo('Initialization error: ' + (error as Error).message);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping recognition:', error);
        }
      }
    };
  }, [onError, handleFinalTranscript]);

  const toggleListening = () => {
    console.log('Toggle listening clicked. Current state:', { isListening, hasRecognition: !!recognitionRef.current });
    
    if (!recognitionRef.current) {
      const errorMsg = 'Speech recognition is not available.';
      setError(errorMsg);
      setDebugInfo('No recognition instance available');
      console.error(errorMsg);
      return;
    }

    if (isListening) {
      console.log('Stopping speech recognition');
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    } else {
      console.log('Starting speech recognition');
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setError('Failed to start speech recognition. Please try again.');
        setDebugInfo('Start error: ' + (error as Error).message);
      }
    }
  };

  const getButtonIcon = () => {
    if (isProcessing) {
      return <Loader2 className="w-6 h-6 animate-spin" />;
    }
    if (isListening) {
      return <MicOff className="w-6 h-6" />;
    }
    return <Mic className="w-6 h-6" />;
  };

  const getButtonText = () => {
    if (isProcessing) return 'Processing...';
    if (isListening) return 'Stop Listening';
    return 'Start Listening';
  };

  const getButtonClass = () => {
    const baseClass = 'flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    if (isListening) {
      return `${baseClass} bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 shadow-lg transform scale-105`;
    }
    
    if (isProcessing) {
      return `${baseClass} bg-gray-500 text-white cursor-not-allowed`;
    }
    
    return `${baseClass} bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500 shadow-md hover:shadow-lg`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Voice Input Button */}
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={toggleListening}
          disabled={isProcessing || !recognitionRef.current}
          className={getButtonClass()}
        >
          {getButtonIcon()}
          <span>{getButtonText()}</span>
        </button>

        {/* Status Indicators */}
        {isListening && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span>Listening...</span>
          </div>
        )}

        {/* Interim Transcript Display */}
        {interimTranscript && (
          <div className="w-full max-w-md p-3 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">Interim transcript:</p>
            <p className="text-gray-800 italic">{interimTranscript}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg max-w-md">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Debug Info (for development) */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Debug Info:</p>
              <p className="text-xs">{debugInfo}</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-gray-500 max-w-md mx-auto">
        <p>Click the microphone button to start voice input. Speak clearly and naturally.</p>
        <p className="mt-1">Supported browsers: Chrome, Edge, Safari</p>
        <p className="mt-1 text-xs">Make sure to allow microphone access when prompted</p>
      </div>
    </div>
  );
} 