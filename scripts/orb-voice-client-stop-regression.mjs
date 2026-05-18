import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(repoRoot, 'src/lib/OrbVoiceClient.ts');
const source = readFileSync(sourcePath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractBody(signature) {
  const signatureIndex = source.indexOf(signature);
  assert(signatureIndex >= 0, `Missing method signature: ${signature}`);

  const openIndex = source.indexOf('{', signatureIndex);
  assert(openIndex >= 0, `Missing method body for: ${signature}`);

  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const char = source[i];
    if (char === '{') depth++;
    if (char === '}') depth--;
    if (depth === 0) {
      return source.slice(openIndex + 1, i);
    }
  }

  throw new Error(`Unclosed method body for: ${signature}`);
}

const stopBody = extractBody('async stop(): Promise<void>');
const playBody = extractBody('private playPCMChunk(base64: string): void');

assert(
  source.includes('private activePlaybackSources: Set<AudioBufferSourceNode> = new Set();'),
  'OrbVoiceClient must track scheduled playback sources so X-close can cancel them.'
);

const closeSseIndex = stopBody.indexOf('this.closeEventSource();');
const stopPlaybackIndex = stopBody.indexOf('this.stopActivePlayback();');
const gatewayStopIndex = stopBody.indexOf('this.notifyGatewayStop(stoppedSessionId);');

assert(closeSseIndex >= 0, 'stop() must close SSE locally.');
assert(stopPlaybackIndex >= 0, 'stop() must stop active playback sources locally.');
assert(gatewayStopIndex >= 0, 'stop() must still notify the gateway to stop the session.');
assert(
  closeSseIndex < gatewayStopIndex,
  'stop() must close SSE before notifying the gateway, so new audio cannot arrive while X-close is tearing down.'
);
assert(
  stopPlaybackIndex < gatewayStopIndex,
  'stop() must stop scheduled playback before notifying the gateway, so the orb goes silent immediately.'
);
assert(
  !/await\s+fetch\(/.test(stopBody),
  'stop() must not await the gateway stop POST before completing local teardown.'
);
assert(
  playBody.includes('this.activePlaybackSources.add(source);'),
  'playPCMChunk() must add each scheduled source to the active playback set.'
);
assert(
  playBody.includes('this.activePlaybackSources.delete(source);'),
  'playPCMChunk() must remove sources from the active playback set when they end.'
);

console.log('[orb-stop-regression] OK: X-close tears down SSE and scheduled playback immediately.');
