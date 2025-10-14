// Audio utilities for Vertex AI Live API
// Handles PCM16 audio at 24kHz for bidirectional streaming

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(
    private onAudioData: (audioData: Float32Array) => void,
    private onTrace?: (message: string) => void
  ) {}

  async start() {
    try {
      this.onTrace?.('🎤 Starting audio recorder...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      this.onTrace?.('✅ Audio recorder started');
    } catch (error) {
      this.onTrace?.(`❌ Error accessing microphone: ${error}`);
      throw error;
    }
  }

  stop() {
    this.onTrace?.('🛑 Stopping audio recorder...');
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.onTrace?.('✅ Audio recorder stopped');
  }
}

// Encode Float32 audio to base64 PCM16 for Vertex AI
export const encodeAudioForVertex = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

// Create WAV file from PCM16 data for playback
export const createWavFromPCM = (pcmData: Uint8Array, sampleRate: number = 24000): Uint8Array => {
  // Convert bytes to 16-bit samples (little-endian)
  const int16Data = new Int16Array(pcmData.length / 2);
  for (let i = 0; i < pcmData.length; i += 2) {
    int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
  }
  
  // Create WAV header
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + int16Data.byteLength, true);
  writeString(view, 8, 'WAVE');
  
  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, int16Data.byteLength, true);

  // Combine header and data
  const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
  wavArray.set(new Uint8Array(wavHeader), 0);
  wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
  
  return wavArray;
};

// Audio queue for sequential playback
export class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async addToQueue(audioData: Uint8Array) {
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      const wavData = createWavFromPCM(audioData);
      // Create a copy to ensure it's an ArrayBuffer (not SharedArrayBuffer)
      const buffer = wavData.buffer.slice(0) as ArrayBuffer;
      const audioBuffer = await this.audioContext.decodeAudioData(buffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error('Error playing audio chunk:', error);
      // Continue with next segment even if current fails
      this.playNext();
    }
  }

  clear() {
    this.queue = [];
    this.isPlaying = false;
  }
}

// Singleton instance for audio playback
let audioQueueInstance: AudioQueue | null = null;

export const playAudioData = async (audioContext: AudioContext, audioData: Uint8Array) => {
  if (!audioQueueInstance) {
    audioQueueInstance = new AudioQueue(audioContext);
  }
  await audioQueueInstance.addToQueue(audioData);
};

export const clearAudioQueue = () => {
  if (audioQueueInstance) {
    audioQueueInstance.clear();
    audioQueueInstance = null;
  }
};

// Screen recorder for visual context (1 FPS)
export class ScreenRecorder {
  private stream: MediaStream | null = null;
  private interval: number | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor(
    public onFrame: (base64Image: string) => void,
    private onTrace?: (message: string) => void
  ) {}

  async start() {
    try {
      this.onTrace?.('🖥️ Starting screen recorder...');
      
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1280, height: 720 }
      });

      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.play();

      this.canvas = document.createElement('canvas');
      this.canvas.width = 1280;
      this.canvas.height = 720;

      // Capture at 1 FPS
      this.interval = window.setInterval(() => {
        this.captureFrame();
      }, 1000);
      
      this.onTrace?.('✅ Screen recorder started');
    } catch (error) {
      this.onTrace?.(`❌ Screen capture error: ${error}`);
      throw error;
    }
  }

  private captureFrame() {
    if (!this.videoElement || !this.canvas) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
    const base64Image = this.canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    this.onFrame(base64Image);
  }

  stop() {
    this.onTrace?.('🛑 Stopping screen recorder...');
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.videoElement = null;
    this.canvas = null;
    
    this.onTrace?.('✅ Screen recorder stopped');
  }
}

// Camera recorder for visual context (1 FPS)
export class CameraRecorder {
  private stream: MediaStream | null = null;
  private interval: number | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor(
    public onFrame: (base64Image: string) => void,
    private onTrace?: (message: string) => void
  ) {}

  async start() {
    try {
      this.onTrace?.('📹 Starting camera recorder...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });

      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.play();

      this.canvas = document.createElement('canvas');
      this.canvas.width = 640;
      this.canvas.height = 480;

      // Capture at 1 FPS
      this.interval = window.setInterval(() => {
        this.captureFrame();
      }, 1000);
      
      this.onTrace?.('✅ Camera recorder started');
    } catch (error) {
      this.onTrace?.(`❌ Camera capture error: ${error}`);
      throw error;
    }
  }

  private captureFrame() {
    if (!this.videoElement || !this.canvas) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
    const base64Image = this.canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    this.onFrame(base64Image);
  }

  stop() {
    this.onTrace?.('🛑 Stopping camera recorder...');
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.videoElement = null;
    this.canvas = null;
    
    this.onTrace?.('✅ Camera recorder stopped');
  }
}
