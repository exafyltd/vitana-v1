/**
 * WAV Debug Utilities - Checkpoint B: Client-side WAV save for debugging
 * 
 * This creates a proper WAV file from raw PCM16 data for offline verification.
 * Use this to save a full turn's audio and play it in VLC/QuickTime to verify
 * if corruption happens before or during playback.
 */

export class TurnRecorder {
  private chunks: Uint8Array[] = [];
  private isRecording = false;

  startTurn() {
    console.log('🎙️ [DEBUG] Starting turn recording');
    this.chunks = [];
    this.isRecording = true;
  }

  addChunk(audioBytes: Uint8Array) {
    if (!this.isRecording) return;
    this.chunks.push(new Uint8Array(audioBytes)); // Deep copy
  }

  stopTurn() {
    if (!this.isRecording) return;
    this.isRecording = false;
    
    // Concatenate all chunks
    const totalLength = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const pcmData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      pcmData.set(chunk, offset);
      offset += chunk.length;
    }
    
    console.log('🎙️ [DEBUG] Turn complete. Total PCM bytes:', pcmData.length);
    
    // Create WAV file
    const wav = this.createWav(pcmData);
    
    // Download WAV file - cast to ArrayBuffer to satisfy TypeScript
    const blob = new Blob([wav.buffer as ArrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-turn-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('💾 [DEBUG] WAV file saved. Play it in VLC/QuickTime to verify if bytes are clean.');
    
    // Clear chunks
    this.chunks = [];
  }

  private createWav(pcmData: Uint8Array): Uint8Array {
    // WAV header for 24kHz, mono, 16-bit PCM
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length;
    
    // Create WAV header (44 bytes)
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    
    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true); // file size - 8
    writeString(8, 'WAVE');
    
    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // sub-chunk size (16 for PCM)
    view.setUint16(20, 1, true);  // audio format (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    
    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Combine header + PCM data
    const wavArray = new Uint8Array(44 + dataSize);
    wavArray.set(new Uint8Array(header), 0);
    wavArray.set(pcmData, 44);
    
    return wavArray;
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

// Singleton instance
let turnRecorderInstance: TurnRecorder | null = null;

export const getTurnRecorder = (): TurnRecorder => {
  if (!turnRecorderInstance) {
    turnRecorderInstance = new TurnRecorder();
  }
  return turnRecorderInstance;
};
