// Audio recording for Vertex AI Live API (24kHz PCM16)
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      console.log('🎤 Starting audio recording...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      console.log('✅ Audio recording started');
    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    console.log('🛑 Stopping audio recording...');
    
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
  }
}

// Encode Float32 audio to PCM16 base64 for Vertex AI
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

// Screen recording for Vertex AI vision (1 FPS)
export class ScreenRecorder {
  private stream: MediaStream | null = null;
  private intervalId: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private video: HTMLVideoElement | null = null;

  constructor(private onFrame: (frameData: string) => void) {}

  async start() {
    try {
      console.log('🖥️ Starting screen sharing...');
      
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 1, max: 1 }
        }
      });

      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.play();

      this.canvas = document.createElement('canvas');
      const ctx = this.canvas.getContext('2d');

      // Capture frames at 1 FPS
      this.intervalId = window.setInterval(() => {
        if (!this.video || !this.canvas || !ctx) return;

        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        ctx.drawImage(this.video, 0, 0);
        
        // Convert to JPEG base64
        this.canvas.toBlob((blob) => {
          if (!blob) return;
          
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            this.onFrame(base64);
          };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.8);
      }, 1000);

      console.log('✅ Screen sharing started');
    } catch (error) {
      console.error('❌ Error accessing screen:', error);
      throw error;
    }
  }

  stop() {
    console.log('🛑 Stopping screen sharing...');
    
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    this.canvas = null;
  }
}

// Audio player with queue management for PCM16 playback
class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private buffer: Uint8Array = new Uint8Array(0);
  private readonly MIN_CHUNK_SIZE = 2048; // ~42ms at 24kHz PCM16 for smoother playback

  constructor(private audioContext: AudioContext) {}

  async addToQueue(audioData: Uint8Array) {
    console.log('🔊 Adding audio chunk:', audioData.byteLength, 'bytes');
    console.log('   Current buffer:', this.buffer.byteLength, 'bytes');
    console.log('   Queue length:', this.queue.length, 'chunks');
    
    // Accumulate small chunks into buffer
    const combined = new Uint8Array(this.buffer.length + audioData.byteLength);
    combined.set(this.buffer);
    combined.set(audioData, this.buffer.length);
    this.buffer = combined;
    
    // Only queue when we have enough data
    if (this.buffer.byteLength >= this.MIN_CHUNK_SIZE) {
      console.log('✅ Buffer threshold reached, queueing:', this.buffer.byteLength, 'bytes');
      this.queue.push(this.buffer);
      this.buffer = new Uint8Array(0);
      
      if (!this.isPlaying) {
        await this.playNext();
      }
    } else {
      const remaining = this.MIN_CHUNK_SIZE - this.buffer.byteLength;
      console.log('⏳ Buffering... need', remaining, 'more bytes');
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
      // Validate audio data size
      if (audioData.byteLength < 2) {
        console.warn('⚠️ Audio chunk too small, skipping');
        this.playNext();
        return;
      }
      
      // Validate it's even (PCM16 requires pairs of bytes)
      if (audioData.byteLength % 2 !== 0) {
        console.warn('⚠️ Audio chunk has odd byte count, trimming last byte');
        const trimmed = audioData.slice(0, audioData.byteLength - 1);
        const wavData = this.createWavFromPCM(trimmed);
        const buffer = wavData.buffer.slice(0) as ArrayBuffer;
        const audioBuffer = await this.audioContext.decodeAudioData(buffer);
        
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        
        source.onended = () => this.playNext();
        source.start(0);
        return;
      }
      
      const wavData = this.createWavFromPCM(audioData);
      const buffer = wavData.buffer.slice(0) as ArrayBuffer;
      const audioBuffer = await this.audioContext.decodeAudioData(buffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error('❌ Error playing audio chunk:', error);
      console.error('   Chunk size:', audioData.byteLength, 'bytes');
      this.playNext(); // Continue with next segment
    }
  }

  private createWavFromPCM(pcmData: Uint8Array): Uint8Array {
    console.log('🎵 Creating WAV from PCM, input size:', pcmData.byteLength, 'bytes');
    
    // CRITICAL FIX: Use little-endian byte order (swap the order from before)
    // Little-endian: low byte first, high byte second
    const int16Data = new Int16Array(pcmData.length / 2);
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Data[i / 2] = pcmData[i] | (pcmData[i + 1] << 8);
    }
    
    console.log('✅ Converted to Int16Array, samples:', int16Data.length);
    
    // Create WAV header
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;

    // WAV header (all using little-endian)
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + int16Data.byteLength, true); // true = little-endian
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, int16Data.byteLength, true);

    // Combine header and data
    const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(new Uint8Array(int16Data.buffer as ArrayBuffer), wavHeader.byteLength);
    
    console.log('✅ WAV created, total size:', wavArray.byteLength, 'bytes');
    return wavArray;
  }

  async flush() {
    if (this.buffer.byteLength > 0) {
      console.log('🔚 Flushing remaining buffer:', this.buffer.byteLength, 'bytes');
      this.queue.push(this.buffer);
      this.buffer = new Uint8Array(0);
      
      if (!this.isPlaying) {
        await this.playNext();
      }
    }
  }

  clear() {
    this.queue = [];
    this.buffer = new Uint8Array(0);
    this.isPlaying = false;
  }
}

let audioQueueInstance: AudioQueue | null = null;

export const playAudioData = async (audioContext: AudioContext, audioData: Uint8Array) => {
  if (!audioQueueInstance) {
    audioQueueInstance = new AudioQueue(audioContext);
  }
  await audioQueueInstance.addToQueue(audioData);
};

export const flushAudioQueue = async () => {
  if (audioQueueInstance) {
    await audioQueueInstance.flush();
  }
};

export const clearAudioQueue = () => {
  if (audioQueueInstance) {
    audioQueueInstance.clear();
  }
};

// Camera recording for Vertex AI vision (1 FPS)
export class CameraRecorder {
  private stream: MediaStream | null = null;
  private intervalId: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private video: HTMLVideoElement | null = null;

  constructor(private onFrame: (frameData: string) => void) {}

  async start() {
    try {
      console.log('📹 Starting camera...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user' // Use front camera by default
        }
      });

      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.play();

      this.canvas = document.createElement('canvas');
      const ctx = this.canvas.getContext('2d');

      // Capture frames at 1 FPS (same as screen sharing)
      this.intervalId = window.setInterval(() => {
        if (!this.video || !this.canvas || !ctx) return;

        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        ctx.drawImage(this.video, 0, 0);
        
        // Convert to JPEG base64
        this.canvas.toBlob((blob) => {
          if (!blob) return;
          
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            this.onFrame(base64);
          };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.8);
      }, 1000);

      console.log('✅ Camera started');
    } catch (error) {
      console.error('❌ Error accessing camera:', error);
      throw error;
    }
  }

  stop() {
    console.log('🛑 Stopping camera...');
    
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    this.canvas = null;
  }
}
