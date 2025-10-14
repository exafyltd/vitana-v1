// Audio recording for Vertex AI Live API (16kHz PCM16)
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private frameCount = 0;
  private lastLevelLog = 0;

  constructor(
    private onAudioData: (audioData: Float32Array) => void,
    private onTrace?: (message: string) => void
  ) {}

  async start() {
    try {
      console.log('🎤 Starting audio recording...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const actualSampleRate = this.audioContext.sampleRate;
      console.log(`🎤 Mic sample rate: requested=16000, actual=${actualSampleRate}`);
      this.onTrace?.(`mic_samplerate: ${actualSampleRate}`);
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Compute RMS for mic level monitoring
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const dB = 20 * Math.log10(Math.max(rms, 0.00001));
        
        // Log mic level every 500ms
        const now = Date.now();
        if (now - this.lastLevelLog > 500) {
          this.onTrace?.(`mic_level: ${dB.toFixed(1)}dB`);
          this.lastLevelLog = now;
        }
        
        // Resample to 16kHz if needed
        let processedData: Float32Array = inputData;
        if (actualSampleRate !== 16000) {
          processedData = resampleFloat32To16k(inputData, actualSampleRate) as Float32Array;
        }
        
        this.frameCount++;
        if (this.frameCount % 50 === 0) {
          this.onTrace?.(`mic_frames_sent: ${this.frameCount}`);
        }
        
        this.onAudioData(processedData);
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

// Resample Float32 audio to 16kHz
const resampleFloat32To16k = (input: Float32Array, inRate: number): Float32Array => {
  const targetRate = 16000;
  
  if (inRate === targetRate) {
    return input;
  }
  
  // Simple downsampling for 48kHz (take every other sample)
  if (inRate === 48000) {
    const output = new Float32Array(input.length / 2);
    for (let i = 0; i < output.length; i++) {
      output[i] = input[i * 2];
    }
    return output;
  }
  
  // Linear interpolation for other rates
  const ratio = inRate / targetRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);
  
  for (let i = 0; i < outputLength; i++) {
    const srcPos = i * ratio;
    const srcIdx = Math.floor(srcPos);
    const frac = srcPos - srcIdx;
    
    if (srcIdx + 1 < input.length) {
      output[i] = input[srcIdx] * (1 - frac) + input[srcIdx + 1] * frac;
    } else {
      output[i] = input[srcIdx];
    }
  }
  
  return new Float32Array(output); // Ensure we return Float32Array
};

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

// Wrap raw PCM16 data with WAV header
export const wrapPCM16ToWav = (pcmBytes: Uint8Array, sampleRate = 24000): Uint8Array => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  // Create WAV header
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.byteLength, true);
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
  view.setUint32(40, pcmBytes.byteLength, true);

  // Combine header and PCM data
  const wavArray = new Uint8Array(wavHeader.byteLength + pcmBytes.byteLength);
  wavArray.set(new Uint8Array(wavHeader), 0);
  wavArray.set(pcmBytes, wavHeader.byteLength);
  
  return wavArray;
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
  private readonly MIN_CHUNK_SIZE = 2048; // ~42ms at 24kHz PCM16 for lower latency

  constructor(private audioContext: AudioContext) {}

  async addToQueue(audioData: Uint8Array) {
    console.warn('⚠️ AudioQueue.addToQueue called - this should not happen with Vertex AI WAV output');
    console.log('🔊 Adding audio chunk:', audioData.byteLength, 'bytes');
    
    // Log first few bytes for debugging
    if (audioData.byteLength >= 8) {
      console.log('📊 First bytes:', Array.from(audioData.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    }
    
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
      
      console.log('🎧 Decoding WAV buffer, size:', buffer.byteLength);
      const audioBuffer = await this.audioContext.decodeAudioData(buffer);
      console.log('✅ Decoded audio buffer:', audioBuffer.duration.toFixed(2), 'seconds');
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        console.log('🏁 Audio chunk finished');
        this.playNext();
      };
      source.start(0);
      console.log('▶️ Audio playback started');
    } catch (error) {
      console.error('❌ Error playing audio chunk:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      this.playNext(); // Continue with next segment even if this one fails
    }
  }

  private createWavFromPCM(pcmData: Uint8Array): Uint8Array {
    console.log('🎵 Creating WAV from PCM, input size:', pcmData.byteLength);
    
    // Use DataView to read 16-bit samples with correct byte order
    // First try little-endian (most common for PCM16)
    const int16Data = new Int16Array(pcmData.length / 2);
    const dataView = new DataView(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);
    
    try {
      // Read as little-endian Int16 samples
      for (let i = 0; i < int16Data.length; i++) {
        int16Data[i] = dataView.getInt16(i * 2, true); // true = little-endian
      }
      console.log('✅ Decoded PCM16 (little-endian):', int16Data.length, 'samples');
    } catch (error) {
      console.error('❌ Error decoding PCM16:', error);
      // Fallback: try big-endian
      console.log('🔄 Trying big-endian...');
      for (let i = 0; i < int16Data.length; i++) {
        int16Data[i] = dataView.getInt16(i * 2, false); // false = big-endian
      }
    }
    
    // Log sample statistics for debugging
    const maxSample = Math.max(...Array.from(int16Data).map(Math.abs));
    console.log('📊 Max sample amplitude:', maxSample, '/ 32768');
    
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
