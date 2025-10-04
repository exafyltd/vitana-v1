import { supabase } from "@/integrations/supabase/client";

export interface AIChatResponse {
  text: string;
  audio: string; // base64 encoded MP3
  language: string;
  crisisDetected: boolean;
  transcript?: string;
}

export class AIVoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

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
    // Convert audio blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    console.log('Sending voice message to edge function...');
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { audio: base64Audio },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message);
    }

    return data as AIChatResponse;
  }

  async sendTextMessage(text: string): Promise<AIChatResponse> {
    console.log('Sending text message to edge function:', text);
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { text },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message);
    }

    return data as AIChatResponse;
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
}

export const aiVoiceService = new AIVoiceService();
