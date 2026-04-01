import { supabase } from "@/integrations/supabase/client";
import { ClientSTT } from "@/utils/clientSTT";

export interface AIChatResponse {
  text: string;
  audio: string | null;
  language: string;
  crisisDetected: boolean;
  transcript?: string;
}

export interface RecordingOptions {
  useClientSTT?: boolean; // Default: true - use instant client-side transcription
  language?: string;
}

export class AIVoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private audioContext: AudioContext | null = null;
  private firstAudioQueued: boolean = false;
  private hasStartedAudioPlayback: boolean = false; // Track actual playback start
  private clientSTT: ClientSTT | null = null;
  private currentTranscript: string = '';
  private isRecordingWithClientSTT: boolean = false;
  private currentLanguage: string = 'en-US'; // Store language for client-side STT

  constructor() {
    // Initialize audio context lazily
    if (typeof window !== 'undefined') {
      this.audioContext = new AudioContext();
    }
  }

  async resumeAudio(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.info('[audio] Resuming AudioContext');
      await this.audioContext.resume();
    }
  }

  /**
   * Start recording with optional client-side STT for instant transcription
   * @param options - Recording configuration
   */
  async startRecording(options: RecordingOptions = {}): Promise<void> {
    const useClientSTT = options.useClientSTT ?? true; // Default to instant STT
    
    console.log('[Recording] 🎙️ Starting recording with options:', {
      useClientSTT,
      language: options.language,
      clientSTTSupported: ClientSTT.isSupported(),
      audioContextState: this.audioContext?.state,
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia
    });
    
    // Store language for later use
    this.currentLanguage = options.language || 'en-US';
    console.log('[Recording] Language set to:', this.currentLanguage);
    
    if (useClientSTT && ClientSTT.isSupported()) {
      console.log('[Recording] ⚡ Using instant client-side STT');
      this.isRecordingWithClientSTT = true;
      this.currentTranscript = '';
      
      try {
        // Start client-side STT for instant transcription
        this.clientSTT = new ClientSTT({
          language: options.language || 'en-US',
          continuous: true,
          interimResults: true,
          onResult: (transcript, isFinal) => {
            if (transcript && transcript.trim()) {
              // Always keep the latest transcript (interim or final)
              this.currentTranscript = transcript;
            }
            if (isFinal) {
              console.log('[ClientSTT] ✅ Final transcript:', transcript);
            } else {
              console.log('[ClientSTT] 📝 Interim transcript:', transcript.substring(0, 50));
            }
          },
          onError: (error) => {
            console.error('[ClientSTT] ❌ Error:', error);
          },
        });
        
        this.clientSTT.start();
        console.log('[Recording] ✅ Started with instant STT');
      } catch (error) {
        console.error('[Recording] ❌ ClientSTT initialization failed:', error);
        throw error;
      }
    } else {
      console.log('[Recording] Using backend STT (fallback), reason:', 
        !useClientSTT ? 'disabled in preferences' : 'ClientSTT not supported'
      );
      this.isRecordingWithClientSTT = false;
      
      try {
        // Fallback to MediaRecorder for backend STT
        console.log('[Recording] 🎤 Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[Recording] ✅ Microphone access granted');
        
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            console.log('[Recording] 📦 Audio chunk received, size:', event.data.size);
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.start();
        console.log('[Recording] ✅ Started with backend STT');
      } catch (error) {
        console.error('[Recording] ❌ MediaRecorder initialization failed:', error);
        throw error;
      }
    }
  }

  async stopRecording(): Promise<Blob | null> {
    if (this.isRecordingWithClientSTT) {
      // Stop client STT
      this.clientSTT?.stop();
      this.clientSTT = null;
      // Give a brief moment for final results to arrive
      await new Promise((r) => setTimeout(r, 200));
      console.log('[Recording] Stopped client STT (transcript chars):', this.currentTranscript.length);
      return null; // No audio blob needed
    }
    
    // Stop MediaRecorder for backend STT
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
        this.mediaRecorder = null;
        this.audioChunks = [];
        console.log('[Recording] Stopped, blob size:', audioBlob.size);
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Get the transcript from client-side STT (if used)
   */
  getClientTranscript(): string {
    return this.currentTranscript;
  }

  /**
   * Check if currently using client-side STT
   */
  isUsingClientSTT(): boolean {
    return this.isRecordingWithClientSTT;
  }

  /**
   * Send voice message - optimized for client-side STT
   * @param audioBlob - Audio blob (null if using client STT)
   * @param transcript - Pre-transcribed text from client STT (optional)
   */
  async sendVoiceMessage(audioBlob: Blob | null, transcript?: string): Promise<AIChatResponse> {
    // Prefer a client transcript if available (passed-in or captured)
    const effectiveTranscript = (transcript ?? this.currentTranscript)?.trim();

    if (effectiveTranscript) {
      console.log('[Voice] ⚡ Using client transcript (length):', effectiveTranscript.length);
      console.log('[Voice] Sending with language:', this.currentLanguage);
      // Reset flag AFTER using it
      this.isRecordingWithClientSTT = false;
      // Send as text message but mark as voice input
      return this.sendTextMessage(effectiveTranscript, this.currentLanguage, undefined, undefined, true);
    }
    
    // Reset flag for fallback case
    this.isRecordingWithClientSTT = false;
    
    // Fallback: use backend STT
    if (!audioBlob) {
      throw new Error('No audio or transcript captured. Please try again.');
    }

    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    console.log('[Voice] Sending to backend for STT...');
    
    let conversationId = localStorage.getItem('ai_conversation_id') || undefined;
    
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { 
        audio: base64Audio,
        agentType: 'health',
        conversationId,
        stream: false
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message);
    }

    if (data.conversationId) {
      localStorage.setItem('ai_conversation_id', data.conversationId);
    }

    return {
      text: data.text,
      audio: data.audioContent ?? null,
      language: data.detectedLanguage ?? 'en-US',
      crisisDetected: data.isCrisis ?? false,
      transcript: data.transcript
    };
  }

  async sendTextMessage(
    text: string,
    language?: string,
    onTextChunk?: (chunk: string) => void,
    onAudioChunk?: (audioData: string) => void,
    isVoiceInput?: boolean,  // Track if this came from voice
    onLink?: (url: string) => void
  ): Promise<AIChatResponse> {
    console.info('[streaming] Sending text message:', text.substring(0, 50));
    
    // RULE 8: Assert language is valid before sending
    const ALLOWED_LANGUAGES = ['en-US', 'sr-RS', 'de-DE', 'ar-XA', 'es-ES', 'ru-RU', 'zh-CN', 'fr-FR', 'pt-PT', 'pl-PL'];
    if (language && !ALLOWED_LANGUAGES.includes(language)) {
      console.error('[streaming] Invalid language:', language);
      throw new Error(`Invalid language: ${language}`);
    }
    
    console.log('[streaming] RULE: using language=', language);
    
    this.firstAudioQueued = false;
    this.hasStartedAudioPlayback = false; // Reset for new message
    
    let conversationId = localStorage.getItem('ai_conversation_id') || undefined;
    
    // Get Supabase URL and key for direct SSE call
    const supabaseUrl = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWtodndkY3V5aG54a2dmdnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjY2MzcsImV4cCI6MjA3MTQ0MjYzN30._-QX8ZFgDsKgLM7eDlyc64vi73F-Hwc4ttnDPHjZgVw';
    
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token;
    
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    // RULE 2: Always send override_language
    const requestBody: any = {
      text,
      override_language: language,  // RULE-BASED: mandatory override
      agentType: 'health',
      conversationId,
      stream: true,
      isVoiceInput: isVoiceInput || false
    };

    const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status === 402) {
        throw new Error('Payment required. Please add credits to your workspace.');
      }
      throw new Error(`HTTP error! status: ${response.status}: ${errorText}`);
    }

    let fullText = '';
    let detectedLanguage = language || 'en-US';
    let isCrisis = false;
    let finalConversationId = conversationId;

    // Process SSE stream
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lineBuffer = ''; // For handling incomplete JSON lines
    
    // Word buffering for smooth display
    let textBuffer = '';
    let textEventCount = 0; // Debug counter

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (let line of lines) {
        // Handle CRLF
        if (line.endsWith('\r')) {
          line = line.slice(0, -1);
        }
        
        // Skip SSE comments and empty lines
        if (line.startsWith(':') || line.trim() === '') {
          continue;
        }
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          // Skip [DONE] marker
          if (data === '[DONE]') {
            continue;
          }
          
          try {
            // Try to parse JSON - if it fails, it might be incomplete
            const event = JSON.parse(data);
            lineBuffer = ''; // Clear line buffer on successful parse
            
            if (event.type === 'text') {
              textEventCount++;
              if (textEventCount <= 3) {
                console.info(`[streaming] Text event #${textEventCount}, length: ${event.content?.length || 0}, content:`, JSON.stringify(event.content));
              }
              if (!fullText) {
                console.info('[streaming] ⚡ First token received');
              }
              fullText += event.content;
              
              // Buffer tokens and emit only complete words
              if (onTextChunk) {
                textBuffer += event.content;
                
                // Check for word boundaries (spaces, punctuation, newlines)
                const wordBoundaryRegex = /[\s.!?,;:\n]+/;
                if (wordBoundaryRegex.test(textBuffer)) {
                  // Split by word boundaries but keep the delimiters
                  const parts = textBuffer.split(/([\s.!?,;:\n]+)/);
                  
                  // Emit all complete parts except the last one (might be incomplete)
                  if (parts.length > 1) {
                    const completeText = parts.slice(0, -1).join('');
                    onTextChunk(completeText);
                    textBuffer = parts[parts.length - 1] || '';
                  }
                }
              }
            } else if (event.type === 'audio') {
              if (!this.firstAudioQueued) {
                console.info('[streaming] 🔊 First audio chunk queued');
                this.firstAudioQueued = true;
              }
              if (onAudioChunk) {
                onAudioChunk(event.content);
              }
              // Queue audio for playback
              await this.queueAudio(event.content);
            } else if (event.type === 'link') {
              console.info('[streaming] 🔗 Link event:', event.url);
              if (onLink && event.url) {
                onLink(event.url);
              }
            } else if (event.type === 'audio_error') {
              console.warn('[streaming] ⚠️ TTS synthesis failed:', event.message);
              // Continue with text-only response
            } else if (event.type === 'done') {
              console.info('[streaming] ✓ Stream done');
              detectedLanguage = event.detectedLanguage || detectedLanguage;
              isCrisis = event.isCrisis || false;
              finalConversationId = event.conversationId || conversationId;
              
              if (finalConversationId) {
                localStorage.setItem('ai_conversation_id', finalConversationId);
              }
            }
          } catch (e) {
            // JSON parse failed - might be incomplete, buffer it
            if (lineBuffer) {
              // We already had a buffered line, this is probably corrupted
              console.warn('[streaming] Failed to parse after buffering:', data.substring(0, 50));
              lineBuffer = '';
            } else {
              // First failure - buffer the line
              lineBuffer = data;
              console.info('[streaming] Buffering incomplete JSON line');
            }
          }
        } else if (lineBuffer) {
          // Try to combine buffered line with this line
          try {
            const combined = lineBuffer + line;
            const event = JSON.parse(combined);
            console.info('[streaming] ✓ Successfully parsed buffered line');
            lineBuffer = '';
            
            // Process the event (same logic as above)
            if (event.type === 'text') {
              textEventCount++;
              if (textEventCount <= 3) {
                console.info(`[streaming] Text event #${textEventCount} (buffered), length: ${event.content?.length || 0}`);
              }
              if (!fullText) {
                console.info('[streaming] ⚡ First token received (from buffer)');
              }
              fullText += event.content;
              
              if (onTextChunk) {
                textBuffer += event.content;
                const wordBoundaryRegex = /[\s.!?,;:\n]+/;
                if (wordBoundaryRegex.test(textBuffer)) {
                  const parts = textBuffer.split(/([\s.!?,;:\n]+)/);
                  if (parts.length > 1) {
                    const completeText = parts.slice(0, -1).join('');
                    onTextChunk(completeText);
                    textBuffer = parts[parts.length - 1] || '';
                  }
                }
              }
            }
          } catch (e) {
            // Combined line still failed
            console.warn('[streaming] Combined line parse failed');
            lineBuffer = '';
          }
        }
      }
    }

    // Flush any remaining buffered text
    if (textBuffer && onTextChunk) {
      console.info('[streaming] Flushing remaining buffer:', textBuffer);
      onTextChunk(textBuffer);
    }

    return {
      text: fullText,
      audio: null, // Audio is streamed via chunks
      language: detectedLanguage,
      crisisDetected: isCrisis,
      transcript: text
    };
  }

  private async queueAudio(base64Audio: string): Promise<void> {
    if (!this.audioContext) return;

    console.info('[audio] Received audio chunk to queue');
    
    // Resume audio context if suspended (user gesture required)
    await this.resumeAudio();

    try {
      // Try AudioContext decoding first
      const audioBlob = this.base64ToBlob(base64Audio, 'audio/mp3');
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      if (this.audioContext.state !== 'running') {
        console.warn('[audio] AudioContext not running, using HTML Audio fallback');
        await this.playAudioFallback(base64Audio);
        return;
      }
      
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioQueue.push(audioBuffer);
      
      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (error) {
      console.error('[audio] Failed to queue audio, using fallback:', error);
      await this.playAudioFallback(base64Audio);
    }
  }

  private async playAudioFallback(base64Audio: string): Promise<void> {
    try {
      const audioBlob = this.base64ToBlob(base64Audio, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.volume = 1.0;
      
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      audio.onerror = () => URL.revokeObjectURL(audioUrl);
      
      await audio.play();
    } catch (err) {
      console.error('[audio] Fallback playback failed:', err);
    }
  }

  private async createSilentBuffer(durationMs: number = 50): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
    
    const sampleRate = this.audioContext.sampleRate;
    const numSamples = Math.floor((durationMs / 1000) * sampleRate);
    const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
    
    // Fill with zeros (silence)
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < numSamples; i++) {
      channelData[i] = 0;
    }
    
    return buffer;
  }

  private playNextInQueue(): void {
    if (this.audioQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      console.info('[audio] ✓ Audio queue complete');
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;
    const isFirstChunk = !this.hasStartedAudioPlayback;
    
    if (isFirstChunk) {
      console.info('[audio] ▶️ Starting FIRST audio chunk with warm-up + pre-roll');
      
      // Play silent buffer first to warm up pipeline
      this.createSilentBuffer(50).then(silentBuffer => {
        const silentSource = this.audioContext!.createBufferSource();
        silentSource.buffer = silentBuffer;
        silentSource.connect(this.audioContext!.destination);
        silentSource.start(this.audioContext!.currentTime);
        
        console.info('[audio] 🔇 Silent warm-up buffer playing');
      }).catch(err => console.warn('[audio] Failed to create silent buffer:', err));
      
      // Schedule actual content with increased pre-roll
      const startTime = this.audioContext.currentTime + 0.14; // 140ms pre-roll
      console.info(`[audio] Scheduling first chunk at ${startTime.toFixed(3)}s (current: ${this.audioContext.currentTime.toFixed(3)}s)`);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        console.info('[audio] Audio chunk ended');
        this.playNextInQueue();
      };
      
      source.start(startTime); // Schedule in future with no content offset
      this.hasStartedAudioPlayback = true;
    } else {
      console.info('[audio] ▶️ Starting audio chunk');
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        console.info('[audio] Audio chunk ended');
        this.playNextInQueue();
      };
      
      source.start(0); // Play immediately
    }
  }

  async playAudio(base64Audio: string): Promise<void> {
    const audioBlob = this.base64ToBlob(base64Audio, 'audio/mp3');
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = (e) => {
        URL.revokeObjectURL(audioUrl);
        reject(e);
      };
      audio.play().catch(reject);
    });
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  clearAudioQueue(): void {
    this.audioQueue = [];
    this.isPlaying = false;
  }
}

export const aiVoiceService = new AIVoiceService();
