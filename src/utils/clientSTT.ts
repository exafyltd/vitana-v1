/**
 * Client-side Speech-to-Text using Web Speech API
 * Provides instant transcription without backend latency (~0ms vs ~500ms)
 */

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
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

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  var SpeechRecognition: new () => SpeechRecognition;
  var webkitSpeechRecognition: new () => SpeechRecognition;
}

export interface ClientSTTOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export class ClientSTT {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;

  static isSupported(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  constructor(private options: ClientSTTOptions = {}) {
    if (!ClientSTT.isSupported()) {
      console.warn('[ClientSTT] Web Speech API not supported in this browser');
      return;
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionAPI();
    
    // Configure recognition
    this.recognition.continuous = options.continuous ?? false;
    this.recognition.interimResults = options.interimResults ?? true;
    this.recognition.lang = this.normalizeLanguage(options.language || 'en-US');
    this.recognition.maxAlternatives = 1;

    // Set up event handlers
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      const result = results[event.resultIndex];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;

      console.log(`[ClientSTT] ${isFinal ? '✓ Final' : '⚡ Interim'} transcript:`, transcript);

      if (this.options.onResult) {
        this.options.onResult(transcript, isFinal);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[ClientSTT] Recognition error:', event.error);
      
      if (this.options.onError) {
        this.options.onError(event.error);
      }
      
      this.isListening = false;
    };

    this.recognition.onend = () => {
      console.log('[ClientSTT] Recognition ended');
      this.isListening = false;
      
      if (this.options.onEnd) {
        this.options.onEnd();
      }
    };

    this.recognition.onstart = () => {
      console.log('[ClientSTT] Recognition started');
      this.isListening = true;
    };
  }

  start(): void {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }

    if (this.isListening) {
      console.warn('[ClientSTT] Already listening');
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('[ClientSTT] Failed to start recognition:', error);
      throw error;
    }
  }

  stop(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }

    this.recognition.stop();
  }

  abort(): void {
    if (!this.recognition) {
      return;
    }

    this.recognition.abort();
    this.isListening = false;
  }

  setLanguage(language: string): void {
    if (this.recognition) {
      this.recognition.lang = this.normalizeLanguage(language);
    }
  }

  private normalizeLanguage(languageCode: string): string {
    const lower = languageCode.toLowerCase();

    // Special-case mappings for non-standard codes
    const specialCases: Record<string, string> = {
      'ar-xa': 'ar-SA',
    };

    if (specialCases[lower]) {
      return specialCases[lower];
    }

    const normalizedMap: Record<string, string> = {
      'sr': 'sr-RS',
      'de': 'de-DE',
      'en': 'en-US',
      'ar': 'ar-SA',
      'es': 'es-ES',
      'ru': 'ru-RU',
      'zh': 'zh-CN',
    };

    // Check if it's already in the correct format (e.g., 'en-US')
    if (lower.includes('-')) {
      return languageCode;
    }

    return normalizedMap[lower] || languageCode;
  }

  isActive(): boolean {
    return this.isListening;
  }
}

/**
 * Quick helper function for one-shot transcription
 */
export const transcribeOnce = (language?: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!ClientSTT.isSupported()) {
      reject(new Error('Speech recognition not supported'));
      return;
    }

    const stt = new ClientSTT({
      language,
      continuous: false,
      interimResults: false,
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          resolve(transcript);
        }
      },
      onError: (error) => {
        reject(new Error(error));
      },
    });

    stt.start();
  });
};
