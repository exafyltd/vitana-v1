import { supabase } from "@/integrations/supabase/client";

export interface AIChatResponse {
  text: string;
  audio: string | null;
  language: string;
  crisisDetected: boolean;
  transcript?: string;
}

export class AIVoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private audioContext: AudioContext | null = null;
  private firstAudioQueued: boolean = false;

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

  async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
    console.log('Recording started');
  }

  async stopRecording(): Promise<Blob> {
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
        console.log('Recording stopped, blob size:', audioBlob.size);
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  async sendVoiceMessage(audioBlob: Blob): Promise<AIChatResponse> {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    console.log('Sending voice message to edge function...');
    
    let conversationId = localStorage.getItem('ai_conversation_id') || undefined;
    
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { 
        audio: base64Audio,
        agentType: 'health',
        conversationId,
        stream: false // Use non-streaming for voice for now
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
    onAudioChunk?: (audioData: string) => void
  ): Promise<AIChatResponse> {
    console.info('[streaming] Sending text message:', text.substring(0, 50));
    this.firstAudioQueued = false;
    
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

    const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        text,
        language,
        agentType: 'health',
        conversationId,
        stream: true
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let fullText = '';
    let detectedLanguage = language || 'en-US';
    let isCrisis = false;
    let finalConversationId = conversationId;

    // Process SSE stream
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            
            if (event.type === 'text') {
              if (!fullText) {
                console.info('[streaming] ⚡ First token received');
              }
              fullText += event.content;
              if (onTextChunk) {
                onTextChunk(event.content);
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
            console.error('Error parsing SSE event:', e);
          }
        }
      }
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
      
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      audio.onerror = () => URL.revokeObjectURL(audioUrl);
      
      await audio.play();
    } catch (err) {
      console.error('[audio] Fallback playback failed:', err);
    }
  }

  private playNextInQueue(): void {
    if (this.audioQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      console.info('[audio] ✓ Audio queue complete');
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;
    
    console.info('[audio] ▶️ Starting audio playback');
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
    source.onended = () => {
      console.info('[audio] Audio chunk ended');
      this.playNextInQueue();
    };
    
    source.start(0);
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
