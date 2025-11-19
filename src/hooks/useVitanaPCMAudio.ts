import { useRef, useCallback, useState } from 'react';

interface AudioQueueItem {
  audioData: Uint8Array;
  onComplete?: () => void;
}

export function useVitanaPCMAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueueItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

  const createWavHeader = useCallback((dataLength: number): Uint8Array => {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);

    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // "RIFF" chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataLength, true); // File size - 8
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitsPerSample, true); // BitsPerSample

    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataLength, true); // Subchunk2Size

    return new Uint8Array(header);
  }, []);

  const playNextInQueue = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const item = audioQueueRef.current.shift()!;

    try {
      const audioContext = initAudioContext();
      
      // Create WAV file with header
      const wavHeader = createWavHeader(item.audioData.length);
      const wavData = new Uint8Array(wavHeader.length + item.audioData.length);
      wavData.set(wavHeader, 0);
      wavData.set(item.audioData, wavHeader.length);

      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(wavData.buffer);

      // Create and play audio source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      currentSourceRef.current = source;

      source.onended = () => {
        currentSourceRef.current = null;
        item.onComplete?.();
        playNextInQueue();
      };

      source.start(0);
    } catch (error) {
      console.error('[PCM Audio] Error playing audio:', error);
      item.onComplete?.();
      playNextInQueue();
    }
  }, [initAudioContext, createWavHeader]);

  const playAudio = useCallback((blob: Blob, onComplete?: () => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const audioData = new Uint8Array(arrayBuffer);
      
      console.log('[PCM Audio] Queueing audio chunk:', audioData.length, 'bytes');
      
      audioQueueRef.current.push({ audioData, onComplete });
      
      if (!isPlaying) {
        playNextInQueue();
      }
    };
    reader.readAsArrayBuffer(blob);
  }, [isPlaying, playNextInQueue]);

  const stopAudio = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
        currentSourceRef.current = null;
      } catch (err) {
        console.error('[PCM Audio] Error stopping audio:', err);
      }
    }
    audioQueueRef.current = [];
    setIsPlaying(false);
  }, []);

  const cleanup = useCallback(() => {
    stopAudio();
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, [stopAudio]);

  return {
    playAudio,
    stopAudio,
    cleanup,
    isPlaying,
  };
}
