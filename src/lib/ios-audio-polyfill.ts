/**
 * Cross-platform audio recorder that handles iOS Safari's lack of AudioWorklet support.
 * 
 * - iOS Safari: Uses ScriptProcessorNode (deprecated but fully supported)
 * - Modern browsers: Uses AudioWorklet for better performance
 * - Handles sample rate conversion automatically (iOS forces 48kHz hardware rate)
 */

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// All iOS browsers use WebKit, so treat any iOS browser as "iOS Safari" for audio handling
export const IS_IOS_SAFARI = IS_IOS;

export interface AudioRecorderCallbacks {
  onAudioData: (pcmFloat32: Float32Array) => void;
}

export class CrossPlatformAudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private callbacks: AudioRecorderCallbacks;
  private targetSampleRate: number;
  private _muted: boolean = false;

  constructor(targetSampleRate: number, callbacks: AudioRecorderCallbacks) {
    this.targetSampleRate = targetSampleRate;
    this.callbacks = callbacks;
  }

  get context(): AudioContext | null {
    return this.audioContext;
  }

  get analyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  get isRecording(): boolean {
    return this.workletNode !== null || this.scriptNode !== null;
  }

  get isMuted(): boolean {
    return this._muted;
  }

  mute(): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }
    this._muted = true;
    console.log('[AudioRecorder] Soft-muted (track.enabled = false)');
  }

  unmute(): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
    this._muted = false;
    console.log('[AudioRecorder] Soft-unmuted (track.enabled = true)');
  }

  async start(): Promise<void> {
    // Get microphone
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Don't force sampleRate on iOS - it ignores it and may crash
        ...(IS_IOS_SAFARI ? {} : { sampleRate: this.targetSampleRate }),
      }
    });

    // Create AudioContext - let iOS use its native sample rate
    if (IS_IOS_SAFARI) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('[AudioRecorder] iOS mode - native sample rate:', this.audioContext.sampleRate);
    } else {
      this.audioContext = new AudioContext({ sampleRate: this.targetSampleRate });
      console.log('[AudioRecorder] Standard mode - sample rate:', this.audioContext.sampleRate);
    }

    // Resume context (required for iOS autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Set up analyser for volume monitoring
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.sourceNode.connect(this.analyserNode);

    // Choose recording strategy based on platform
    if (IS_IOS_SAFARI || !this.audioContext.audioWorklet) {
      console.log('[AudioRecorder] Using ScriptProcessorNode fallback (iOS/legacy)');
      this.startWithScriptProcessor();
    } else {
      console.log('[AudioRecorder] Using AudioWorklet (modern browser)');
      await this.startWithWorklet();
    }
  }

  private startWithScriptProcessor(): void {
    if (!this.audioContext || !this.sourceNode) return;

    const bufferSize = 4096;
    // ScriptProcessorNode is deprecated but universally supported on iOS Safari
    this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.scriptNode.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      
      // If native rate differs from target, resample
      if (this.audioContext && this.audioContext.sampleRate !== this.targetSampleRate) {
        const resampled = this.resample(inputData, this.audioContext.sampleRate, this.targetSampleRate);
        this.callbacks.onAudioData(resampled);
      } else {
        // Copy the data (inputBuffer is reused)
        this.callbacks.onAudioData(new Float32Array(inputData));
      }
    };

    this.sourceNode.connect(this.scriptNode);
    // Must connect to destination to keep processing alive (outputs silence)
    this.scriptNode.connect(this.audioContext.destination);
  }

  private async startWithWorklet(): Promise<void> {
    if (!this.audioContext || !this.sourceNode) return;

    await this.audioContext.audioWorklet.addModule('/audio-processor.js');
    this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

    this.workletNode.port.onmessage = (event) => {
      const pcmData = event.data as Float32Array;
      this.callbacks.onAudioData(pcmData);
    };

    this.sourceNode.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination);
  }

  /**
   * Linear interpolation resampling from srcRate to dstRate
   */
  private resample(input: Float32Array, srcRate: number, dstRate: number): Float32Array {
    const ratio = srcRate / dstRate;
    const outputLength = Math.round(input.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcFloor = Math.floor(srcIndex);
      const srcCeil = Math.min(srcFloor + 1, input.length - 1);
      const frac = srcIndex - srcFloor;
      output[i] = input[srcFloor] * (1 - frac) + input[srcCeil] * frac;
    }

    return output;
  }

  stop(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode.onaudioprocess = null;
      this.scriptNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.analyserNode = null;
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
