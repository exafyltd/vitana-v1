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
  private readonly MIN_CHUNK_SIZE = 4096; // ~85ms at 24kHz PCM16

  constructor(private audioContext: AudioContext) {}

  async addToQueue(audioData: Uint8Array) {
    console.log('🔊 Adding audio chunk:', audioData.byteLength, 'bytes');
    
    // Accumulate small chunks into buffer
    const combined = new Uint8Array(this.buffer.length + audioData.byteLength);
    combined.set(this.buffer);
    combined.set(audioData, this.buffer.length);
    this.buffer = combined;
    
    // Only queue when we have enough data
    if (this.buffer.byteLength >= this.MIN_CHUNK_SIZE) {
      console.log('✅ Buffer full, queueing:', this.buffer.byteLength, 'bytes');
      this.queue.push(this.buffer);
      this.buffer = new Uint8Array(0);
      
      if (!this.isPlaying) {
        await this.playNext();
      }
    } else {
      console.log('⏳ Buffering... (', this.buffer.byteLength, '/', this.MIN_CHUNK_SIZE, ')');
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
      const wavData = this.createWavFromPCM(audioData);
      const buffer = wavData.buffer.slice(0) as ArrayBuffer;
      const audioBuffer = await this.audioContext.decodeAudioData(buffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      this.playNext(); // Continue with next segment
    }
  }

  private createWavFromPCM(pcmData: Uint8Array): Uint8Array {
    // Convert bytes to 16-bit samples
    const int16Data = new Int16Array(pcmData.length / 2);
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
    }
    
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

    // WAV header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + int16Data.byteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
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
