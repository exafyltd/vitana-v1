// VTID-05179 — the ORB Voice Bench test tone as PCM16 (N6a, plan Change 7).
//
// Mirrors `startTone` in vitana-platform `orb-voice-bench.js` (:139-178): a
// sawtooth at 180 Hz plus sines at 340/700/1250 Hz (gain 0.5/(i+1)), a 3.1 Hz
// amplitude wobble of depth 0.45, master gain 0.28. It is a speech-band test
// signal, not speech: the fake gateway never plays a sentence.
'use strict';

const PARTIALS = [180, 340, 700, 1250];

/** Float samples in [-1, 1] for `durationMs` at `sampleRate`, starting at sample `offset`. */
function toneSamples(sampleRate, durationMs, offset = 0) {
  const n = Math.round((sampleRate * durationMs) / 1000);
  const out = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const t = (k + offset) / sampleRate;
    let s = 0;
    PARTIALS.forEach((f, i) => {
      const phase = (t * f) % 1;
      const wave = i === 0 ? 2 * phase - 1 : Math.sin(2 * Math.PI * f * t);
      s += wave * (0.5 / (i + 1));
    });
    const wobble = 1 + 0.45 * Math.sin(2 * Math.PI * 3.1 * t);
    out[k] = Math.max(-1, Math.min(1, s * wobble * 0.28));
  }
  return out;
}

/** Float → Int16 LE with the widget's conversion (`s<0 ? s*0x8000 : s*0x7FFF`, orb-widget.js:4345-4352). */
function floatToPcm16(samples) {
  const buf = Buffer.alloc(samples.length * 2);
  for (let k = 0; k < samples.length; k++) {
    const s = Math.max(-1, Math.min(1, samples[k]));
    buf.writeInt16LE(Math.trunc(s < 0 ? s * 0x8000 : s * 0x7fff), k * 2);
  }
  return buf;
}

/** Base64 PCM16 chunks of `chunkMs` each, `totalMs` of tone in all. */
function toneChunks(sampleRate, totalMs, chunkMs = 100) {
  const chunks = [];
  const perChunk = Math.round((sampleRate * chunkMs) / 1000);
  for (let at = 0, offset = 0; at < totalMs; at += chunkMs, offset += perChunk) {
    chunks.push(floatToPcm16(toneSamples(sampleRate, Math.min(chunkMs, totalMs - at), offset)).toString('base64'));
  }
  return chunks;
}

module.exports = { toneSamples, floatToPcm16, toneChunks };
