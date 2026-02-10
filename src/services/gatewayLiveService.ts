/**
 * Gateway Live Service - Mobile Client
 *
 * Connects mobile app to Gateway ORB Live API instead of Supabase Edge Function.
 * Uses SSE (Server-Sent Events) for responses and HTTP POST for audio/video upload.
 *
 * Architecture:
 * - Mobile App → Gateway (/api/v1/orb/live/*) → Vertex AI Live API
 * - Enables Cognee extraction, unified memory, and consistent intelligence
 *
 * Migration from: vertexLiveService.ts (WebSocket → Supabase Edge → Google AI Studio)
 * Migration to: Gateway Live API (SSE + HTTP → Vertex AI)
 */

import { AudioRecorder, ScreenRecorder, CameraRecorder, encodeAudioForVertex } from '@/utils/vertexAudio';

export interface GatewayLiveCallbacks {
  onConnectionChange?: (connected: boolean) => void;
  onConnectionReady?: () => void;
  onGeminiReady?: () => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onTrace?: (message: string) => void;
  onResponseComplete?: () => void;
  onAudioResponse?: (audioBlob: Blob) => void;
}

interface LiveSessionStartRequest {
  lang?: string;
  voice_style?: string;
  response_modalities?: string[];
}

interface LiveSessionStartResponse {
  ok: boolean;
  session_id?: string;
  error?: string;
  meta?: {
    lang: string;
    voice: string;
    modalities: string[];
    model: string;
  };
}

export class GatewayLiveService {
  private sessionId: string | null = null;
  private audioRecorder: AudioRecorder | null = null;
  private screenRecorder: ScreenRecorder | null = null;
  private cameraRecorder: CameraRecorder | null = null;
  private cameraStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private callbacks: GatewayLiveCallbacks = {};
  private isSetupComplete = false;
  private geminiReadyFired = false;
  private eventSource: EventSource | null = null;
  private isIntentionalDisconnect = false;
  private gatewayUrl: string;
  private token: string | null = null;

  // Heartbeat management
  private heartbeatInterval: number | null = null;

  constructor(callbacks: GatewayLiveCallbacks) {
    this.callbacks = callbacks;

    // Use Gateway URL from environment variable
    this.gatewayUrl = (import.meta as any).env?.VITE_GATEWAY_BASE || 'http://localhost:8080';
    console.log('[Gateway Live Service] Using Gateway URL:', this.gatewayUrl);
  }

  async connect(token: string): Promise<void> {
    console.log('🔌 Connecting to Gateway Live API...');
    this.callbacks.onTrace?.('Starting connection to Gateway...');
    this.token = token;

    try {
      // Step 1: Create session with Gateway
      const startUrl = `${this.gatewayUrl}/api/v1/orb/live/session/start`;
      const requestBody: LiveSessionStartRequest = {
        lang: 'en',
        voice_style: 'friendly, calm, empathetic',
        response_modalities: ['audio', 'text'],
      };

      console.log('📤 Creating session:', startUrl);
      const startResponse = await fetch(startUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!startResponse.ok) {
        const errorText = await startResponse.text();
        throw new Error(`Session creation failed: ${startResponse.status} - ${errorText}`);
      }

      const startData: LiveSessionStartResponse = await startResponse.json();
      if (!startData.ok || !startData.session_id) {
        throw new Error(startData.error || 'Failed to create session');
      }

      this.sessionId = startData.session_id;
      console.log('✅ Session created:', this.sessionId);
      this.callbacks.onTrace?.('Session created, opening stream...');

      // Step 2: Open SSE stream
      const streamUrl = `${this.gatewayUrl}/api/v1/orb/live/stream?session_id=${encodeURIComponent(this.sessionId)}`;
      console.log('📡 Opening SSE stream:', streamUrl);

      // EventSource doesn't support custom headers, so we append token as query param
      const streamUrlWithAuth = `${streamUrl}&token=${encodeURIComponent(token)}`;
      this.eventSource = new EventSource(streamUrlWithAuth);

      this.eventSource.onopen = () => {
        console.log('✅ SSE stream opened');
        this.callbacks.onTrace?.('Stream connected');
        this.callbacks.onConnectionReady?.();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (error) {
          console.error('❌ Error parsing SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ SSE error:', error);
        if (!this.isIntentionalDisconnect) {
          this.callbacks.onError?.('Stream connection error');
        }
        this.callbacks.onConnectionChange?.(false);
      };

      // Mark as ready (Gateway sessions are ready immediately)
      this.isSetupComplete = true;
      this.geminiReadyFired = true;
      this.callbacks.onGeminiReady?.();
      this.callbacks.onConnectionChange?.(true);

      // Start heartbeat
      this.heartbeatInterval = window.setInterval(() => {
        // Send periodic audio to keep session alive (Gateway expects activity)
        if (this.isSetupComplete) {
          console.log('💓 Heartbeat ping');
        }
      }, 30000) as unknown as number;

    } catch (error) {
      console.error('❌ Error connecting to Gateway:', error);
      this.callbacks.onError?.('Failed to connect to Gateway');
      throw error;
    }
  }

  private async handleServerMessage(data: any) {
    console.log('📥 Server message:', data.type || Object.keys(data)[0]);

    // Handle different event types
    if (data.type === 'ready') {
      console.log('🎉 Gateway ready');
      return;
    }

    if (data.type === 'error') {
      console.error('❌ Server error:', data.message);
      this.callbacks.onError?.(data.message);
      return;
    }

    if (data.type === 'audio_chunk') {
      // Audio response from Gateway
      if (data.audio && data.mime_type) {
        const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
        const audioBlob = new Blob([audioBytes], { type: data.mime_type });
        this.callbacks.onAudioResponse?.(audioBlob);
      }
      return;
    }

    if (data.type === 'transcript') {
      // Transcript from AI
      this.callbacks.onTranscript?.(data.text, data.is_final || false);
      return;
    }

    if (data.type === 'turn_complete') {
      console.log('🏁 Turn complete');
      this.callbacks.onResponseComplete?.();
      return;
    }

    if (data.type === 'session_ended') {
      console.log('🔌 Session ended by server');
      this.callbacks.onConnectionChange?.(false);
      return;
    }
  }

  async startAudio() {
    if (this.audioRecorder) {
      console.warn('🎤 Mic already recording, ignoring startAudio');
      return;
    }

    if (!this.isSetupComplete || !this.sessionId) {
      throw new Error('Session not ready - cannot start microphone');
    }

    console.log('🎤 Starting audio recording...');

    this.audioRecorder = new AudioRecorder(async (audioData) => {
      if (!this.sessionId || !this.token) return;

      // Encode and send audio to Gateway
      const base64Audio = encodeAudioForVertex(audioData);

      const payload = {
        session_id: this.sessionId,
        data: base64Audio,
        mime_type: 'audio/pcm;rate=24000',
      };

      try {
        const sendUrl = `${this.gatewayUrl}/api/v1/orb/live/stream/send`;
        const response = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.error('❌ Failed to send audio chunk:', response.status);
        }
      } catch (error) {
        console.error('❌ Error sending audio:', error);
      }
    });

    await this.audioRecorder.start();
    console.log('✅ Audio recording started successfully');
  }

  stopAudio() {
    console.log('🛑 Stopping audio recording...');

    if (this.audioRecorder) {
      this.audioRecorder.stop();
      this.audioRecorder = null;
    }

    // Send end-turn signal
    if (this.sessionId && this.token) {
      this.endTurn();
    }
  }

  private async endTurn() {
    if (!this.sessionId || !this.token) return;

    try {
      const endTurnUrl = `${this.gatewayUrl}/api/v1/orb/live/stream/end-turn`;
      await fetch(endTurnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ session_id: this.sessionId }),
      });
      console.log('✅ Turn ended');
    } catch (error) {
      console.error('❌ Error ending turn:', error);
    }
  }

  async startScreen() {
    if (!this.isSetupComplete || !this.sessionId || !this.token) {
      console.warn('⚠️ Setup not complete, waiting...');
      return;
    }

    console.log('🖥️ Starting screen sharing...');

    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });

    this.screenRecorder = new ScreenRecorder(async (frameData) => {
      if (!this.sessionId || !this.token) return;

      const payload = {
        session_id: this.sessionId,
        data: frameData,
        mime_type: 'image/jpeg',
      };

      try {
        const sendUrl = `${this.gatewayUrl}/api/v1/orb/live/stream/send`;
        await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error('❌ Error sending screen frame:', error);
      }
    });

    await this.screenRecorder.start();
  }

  stopScreen() {
    console.log('🛑 Stopping screen sharing...');

    if (this.screenRecorder) {
      this.screenRecorder.stop();
      this.screenRecorder = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
  }

  async startCamera() {
    console.log('📹 Starting camera...');

    this.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    this.cameraRecorder = new CameraRecorder(async (frameData) => {
      if (!this.sessionId || !this.token) return;

      const payload = {
        session_id: this.sessionId,
        data: frameData,
        mime_type: 'image/jpeg',
      };

      try {
        const sendUrl = `${this.gatewayUrl}/api/v1/orb/live/stream/send`;
        await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error('❌ Error sending camera frame:', error);
      }
    });

    await this.cameraRecorder.start();
    console.log('📹 Camera recorder started, capturing frames at 1 FPS');
  }

  stopCamera() {
    console.log('🛑 Stopping camera...');

    if (this.cameraRecorder) {
      this.cameraRecorder.stop();
      this.cameraRecorder = null;
    }

    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
  }

  sendText(text: string) {
    if (!this.sessionId || !this.token || !this.isSetupComplete) {
      console.warn('⚠️ Session not ready');
      return;
    }

    console.log('📤 Sending text:', text);

    const payload = {
      session_id: this.sessionId,
      data: text,
      mime_type: 'text/plain',
    };

    fetch(`${this.gatewayUrl}/api/v1/orb/live/stream/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(payload),
    }).then(async response => {
      if (!response.ok) {
        console.error('❌ Failed to send text:', response.status);
      } else {
        // After sending text, signal end of turn
        await this.endTurn();
      }
    });
  }

  disconnect() {
    console.log('🔌 Disconnecting from Gateway...');

    this.isIntentionalDisconnect = true;

    this.stopAudio();
    this.stopScreen();
    this.stopCamera();

    // Close SSE stream
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Stop session on server
    if (this.sessionId && this.token) {
      const stopUrl = `${this.gatewayUrl}/api/v1/orb/live/session/stop`;
      fetch(stopUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ session_id: this.sessionId }),
      }).catch(error => {
        console.warn('Failed to stop session:', error);
      });
    }

    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.isSetupComplete = false;
    this.geminiReadyFired = false;
    this.sessionId = null;
    this.token = null;

    setTimeout(() => {
      this.isIntentionalDisconnect = false;
    }, 100);
  }

  isConnected(): boolean {
    return this.isSetupComplete && this.sessionId !== null;
  }

  setCameraAudioEnabled(enabled: boolean) {
    if (this.cameraStream) {
      this.cameraStream.getAudioTracks().forEach(t => t.enabled = enabled);
      console.log(`📹 Camera audio ${enabled ? 'enabled' : 'muted'}`);
    }
  }

  setScreenAudioEnabled(enabled: boolean) {
    if (this.screenStream) {
      this.screenStream.getAudioTracks().forEach(t => t.enabled = enabled);
      console.log(`🖥️ Screen audio ${enabled ? 'enabled' : 'muted'}`);
    }
  }

  hasCameraAudioTrack(): boolean {
    return (this.cameraStream?.getAudioTracks().length ?? 0) > 0;
  }

  hasScreenAudioTrack(): boolean {
    return (this.screenStream?.getAudioTracks().length ?? 0) > 0;
  }
}
