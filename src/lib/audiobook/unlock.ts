/**
 * VTID-04761 — let the Audiobook start playing after an async fetch.
 *
 * Mobile browsers (iOS Safari above all) only allow an <audio> element to
 * start playing inside a user gesture. The Audiobook has to fetch the first
 * episode before it can play it, which breaks that link. The standard fix:
 * inside the tap, synchronously play a few milliseconds of silence on the SAME
 * element — once an element has played from a gesture it may be started again
 * later from code. The silence is a WAV built here, so there is no binary blob
 * to trust and nothing to fetch.
 */

let silentWavUri: string | null = null;

export function silentWavDataUri(): string {
  if (silentWavUri) return silentWavUri;
  const sampleRate = 8000;
  const samples = 80; // 10 ms
  const dataBytes = samples * 2;
  const buf = new ArrayBuffer(44 + dataBytes);
  const v = new DataView(buf);
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  v.setUint32(16, 16, true); // PCM chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  v.setUint32(40, dataBytes, true); // samples stay zero = silence
  let binary = '';
  new Uint8Array(buf).forEach((b) => {
    binary += String.fromCharCode(b);
  });
  silentWavUri = `data:audio/wav;base64,${btoa(binary)}`;
  return silentWavUri;
}

/** Call synchronously from the tap handler, before any await. */
export function unlockAudioElement(audio: HTMLAudioElement): void {
  if (audio.dataset.unlocked === '1') return;
  audio.dataset.unlocked = '1';
  try {
    audio.src = silentWavDataUri();
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    /* best effort — playback then needs one more tap on Play */
  }
}
