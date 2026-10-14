// VTID-05179 — orb-parity: every failure mode of the cross-repo check, on fixture trees.
// No network: the platform files are synthetic fixtures here; the fetch is exercised
// only on its fail-closed paths (no token, HTTP error) with an injected fetch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MOBILE,
  NO_TOKEN_MESSAGE,
  PLATFORM_FILES,
  buildVectors,
  checkGateBehaviour,
  checkGateConstants,
  checkProtocolContract,
  checkVectors,
  checkWidgetLiterals,
  extractConstObject,
  fetchPlatformFiles,
  loadTsModule,
  runAll,
  scanNativeSources,
  serializeVectors,
  serverAcceptedTypes,
  widgetHandledTypes,
} from '../orb-parity.mjs';
import { tree } from './fixture.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SCRIPT = join(ROOT, 'scripts/native/orb-parity.mjs');
const mobileGateSrc = readFileSync(join(ROOT, MOBILE.gate), 'utf8');
const mobileProtocolSrc = readFileSync(join(ROOT, MOBILE.protocol), 'utf8');

// A synthetic platform gate: the VTID-03706 algorithm, no imports (as the real file).
const PLATFORM_GATE = `
export const FULL_DUPLEX_ENV_VAR = 'ORB_FULL_DUPLEX_ENABLED';
export const DUPLEX_GATE = { openRms: 0.05, closeRms: 0.025, hangoverMs: 400, aecWarmupMs: 250, bargeConfirmFrames: 2 } as const;
export function isFullDuplexEnabled(): boolean { return process.env[FULL_DUPLEX_ENV_VAR] === 'true'; }
export interface DuplexGateState { open: boolean; lastVoiceMs: number; openFrames: number; }
export function initialDuplexGateState(): DuplexGateState { return { open: false, lastVoiceMs: 0, openFrames: 0 }; }
export function evaluateDuplexGateFrame(input: { rms: number; nowMs: number; playbackStartedAtMs: number; bargeAlreadySent: boolean; state: DuplexGateState }) {
  const { rms, nowMs, playbackStartedAtMs, bargeAlreadySent, state } = input;
  if (playbackStartedAtMs > 0 && nowMs - playbackStartedAtMs < DUPLEX_GATE.aecWarmupMs) {
    return { passthrough: false, triggerBarge: false, next: { open: false, lastVoiceMs: state.lastVoiceMs, openFrames: 0 } };
  }
  const aboveOpen = rms > DUPLEX_GATE.openRms;
  const aboveClose = rms > DUPLEX_GATE.closeRms;
  let open = state.open;
  let lastVoiceMs = state.lastVoiceMs;
  if (open) {
    if (aboveClose) lastVoiceMs = nowMs;
    else if (nowMs - lastVoiceMs >= DUPLEX_GATE.hangoverMs) open = false;
  } else if (aboveOpen) {
    open = true;
    lastVoiceMs = nowMs;
  }
  let openFrames: number;
  if (!open) openFrames = 0;
  else if (aboveClose) openFrames = state.openFrames + 1;
  else openFrames = state.openFrames;
  const triggerBarge = open && !bargeAlreadySent && openFrames >= DUPLEX_GATE.bargeConfirmFrames;
  return { passthrough: open, triggerBarge, next: { open, lastVoiceMs, openFrames } };
}
`;

const WIDGET = `
(function () {
  var _AUDIO_PLAYBACK_RATE = 1.05;
  var _AUDIO_PLAYBACK_RATE_DE = 1.1;
  function _pcmRateFromMime(mime) {
    var m = /rate=(\\d+)/.exec(mime || '');
    var rate = m ? parseInt(m[1], 10) : NaN;
    return (rate > 0) ? rate : 24000;
  }
  var _PLAYBACK_LEAD_FIRST_SEC = 0.3;
  var _PLAYBACK_LEAD_LATER_SEC = 0.05;
  function _onEnded() {
    _s.audioEndGraceTimer = setTimeout(function () {
      if (_s.scheduledSources.length === 0 && _s.audioQueue.length === 0) {
        _s.audioPlaying = false;
        _s.lastAudioEndTime = Date.now();
      }
    }, 400);
  }
  function _start() {
    var startPayload = { lang: _cfg.lang, voice_style: 'friendly, calm, empathetic', response_modalities: ['audio', 'text'], vad_silence_ms: 600 };
    w.onmessage = function (event) {
      var msg = JSON.parse(event.data);
      if (msg.type === 'connected') return;
      if (msg.type === 'error') return;
      if (msg.type === 'session_started') return;
    };
    startTimer = setTimeout(function () {
          reject(new Error('WS session start timed out after 8s'));
        }, 8000);
  }
  function _handleMessage(msg) {
    switch (msg.type) {
      case 'ready': break;
      case 'live_api_ready': break;
      case 'audio': case 'audio_out': break;
      case 'turn_complete': break;
      case 'interrupted': break;
      case 'orb_directive':
        switch (msg.directive) { case 'nested_not_a_type': break; }
        break;
      case 'link': break;
      case 'heartbeat': break;
      __EXTRA__
    }
  }
  function _capture() {
    var stream = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000 } };
    var processor = ctx.createScriptProcessor(1024, 1, 1);
    var vadThreshold = 0.06;
    var vadConfirm = 6;
    var PRE_ROLL_MAX_FRAMES = 8;
    var DUPLEX_OPEN_RMS = 0.05;
    var DUPLEX_CLOSE_RMS = 0.025;
    var DUPLEX_HANGOVER_MS = 400;
    var DUPLEX_AEC_WARMUP_MS = 250;
    var DUPLEX_BARGE_CONFIRM_FRAMES = 2;
    if (!_s.fullDuplex && _s.turnCompleteAt > 0 && (Date.now() - _s.turnCompleteAt) < 200) return;
    if (!_s.fullDuplex && _s.lastAudioEndTime > 0 && (Date.now() - _s.lastAudioEndTime) < 200) return;
  }
  var CONTEXT_UPDATE_DEBOUNCE_MS = 250;
})();
`;

const ORB_LIVE = (cases) => `
async function handleWsClientMessage(clientSession: WsClientSession, message: WsClientMessage): Promise<void> {
  switch (message.type) {
${cases.map((c) => `    case '${c}':\n      break;`).join('\n')}
    default:
      sendWsMessage(clientWs, { type: 'error', message: 'Unknown message type' });
  }
}
`;
const ALL_CLIENT_CASES = ['ping', 'start', 'prewarm', 'audio', 'video', 'text', 'interrupt', 'end_turn', 'audio_ready', 'stop', 'context_update', 'nav_result'];
const PROTOCOL = 'export const AUDIO_OUT_RATE_HZ = 24000;\nexport const AUDIO_IN_RATE_HZ = 16000;\n';

function platformTree({ gate = PLATFORM_GATE, widget = WIDGET.replace('__EXTRA__', ''), orbLive = ORB_LIVE(ALL_CLIENT_CASES), protocol = PROTOCOL } = {}) {
  return tree({ [PLATFORM_FILES.gate]: gate, [PLATFORM_FILES.widget]: widget, [PLATFORM_FILES.orbLive]: orbLive, [PLATFORM_FILES.protocol]: protocol });
}

function mobileTree({ gate = mobileGateSrc, extra = {}, vectors } = {}) {
  const t = tree({ [MOBILE.gate]: gate, [MOBILE.protocol]: mobileProtocolSrc, ...extra });
  if (vectors !== null) {
    const p = platformTree();
    const platformGate = loadTsModule(join(p.root, PLATFORM_FILES.gate));
    mkdirSync(dirname(join(t.root, MOBILE.vectors)), { recursive: true });
    writeFileSync(join(t.root, MOBILE.vectors), vectors ?? serializeVectors(buildVectors(platformGate)), { flag: 'w' });
    p.cleanup();
  }
  return t;
}

const mobileGate = () => loadTsModule(join(ROOT, MOBILE.gate));
const mobileProtocol = () => loadTsModule(join(ROOT, MOBILE.protocol));
function platformGateFrom(text) {
  const dir = mkdtempSync(join(tmpdir(), 'orb-gate-'));
  writeFileSync(join(dir, 'gate.ts'), text);
  return loadTsModule(join(dir, 'gate.ts'));
}

test('happy path: the real mobile sources pass against a matching platform', () => {
  const p = platformTree();
  const m = mobileTree({ extra: { 'apps/mobile/src/orb/session.ts': readFileSync(join(ROOT, 'apps/mobile/src/orb/session.ts'), 'utf8') } });
  try {
    const r = runAll({ platformDir: p.root, root: m.root, randomCount: 2000 });
    assert.deepEqual(r.sections, { a: [], b: [], c: [], d: [], e: [] });
    assert.ok(r.stats.compared > 2000);
  } finally {
    p.cleanup();
    m.cleanup();
  }
});

test('the committed vectors file equals the platform output for the same algorithm', () => {
  const platformGate = platformGateFrom(PLATFORM_GATE);
  const committed = readFileSync(join(ROOT, MOBILE.vectors), 'utf8');
  assert.deepEqual(checkVectors({ platformGate, vectorsText: committed }), []);
});

test('(a) a constant mismatch fails', () => {
  assert.deepEqual(extractConstObject(PLATFORM_GATE, 'DUPLEX_GATE'), { openRms: 0.05, closeRms: 0.025, hangoverMs: 400, aecWarmupMs: 250, bargeConfirmFrames: 2 });
  const changed = PLATFORM_GATE.replace('openRms: 0.05', 'openRms: 0.045');
  const problems = checkGateConstants({ platformGateText: changed, mobileGate: mobileGate() });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /DUPLEX_GATE differs/);
});

test('(b) a behaviour change on either side fails the differential run', () => {
  // Platform switches the hangover comparison from >= to >: same constants, different decisions.
  const platformGate = platformGateFrom(PLATFORM_GATE.replace('nowMs - lastVoiceMs >= DUPLEX_GATE.hangoverMs', 'nowMs - lastVoiceMs > DUPLEX_GATE.hangoverMs'));
  const r = checkGateBehaviour({ platformGate, mobileGate: mobileGate(), randomCount: 20000 });
  assert.equal(r.problems.length > 0, true);
  assert.match(r.problems[0], /gate behaviour differs/);
  // Mobile counts open frames instead of voiced frames.
  const m = mobileTree({ gate: mobileGateSrc.replace('} else if (aboveClose) {\n    openFrames = state.openFrames + 1;', '} else if (open) {\n    openFrames = state.openFrames + 1;'), vectors: null });
  try {
    const mutated = loadTsModule(join(m.root, MOBILE.gate));
    const r2 = checkGateBehaviour({ platformGate: platformGateFrom(PLATFORM_GATE), mobileGate: mutated, randomCount: 2000 });
    assert.equal(r2.problems.length > 0, true);
  } finally {
    m.cleanup();
  }
  // And the identical algorithm passes all 20,000 random frames plus the scenarios.
  const ok = checkGateBehaviour({ platformGate: platformGateFrom(PLATFORM_GATE), mobileGate: mobileGate() });
  assert.deepEqual(ok.problems, []);
  assert.ok(ok.compared >= 20000);
});

test('(b) vectors drift fails, and a missing file fails', () => {
  const platformGate = platformGateFrom(PLATFORM_GATE);
  const good = serializeVectors(buildVectors(platformGate));
  assert.deepEqual(checkVectors({ platformGate, vectorsText: good }), []);
  assert.match(checkVectors({ platformGate, vectorsText: good.replace('"aecWarmupMs": 250', '"aecWarmupMs": 251') })[0], /differs/);
  assert.match(checkVectors({ platformGate, vectorsText: null })[0], /missing/);
});

test('(c) a widget literal missing or changed fails', () => {
  const base = { protocolText: PROTOCOL, mobileProtocol: mobileProtocol(), mobileGate: mobileGate() };
  assert.deepEqual(checkWidgetLiterals({ widgetText: WIDGET, ...base }), []);
  const changed = checkWidgetLiterals({ widgetText: WIDGET.replace('var vadConfirm = 6;', 'var vadConfirm = 5;'), ...base });
  assert.deepEqual(changed, ['(c) orb-widget.js: vadConfirm is 5, mobile mirrors 6']);
  const missing = checkWidgetLiterals({ widgetText: WIDGET.replace('createScriptProcessor(1024, 1, 1)', 'createAudioWorklet()'), ...base });
  assert.match(missing[0], /createScriptProcessor frame size" not found/);
  const rate = checkWidgetLiterals({ widgetText: WIDGET, ...base, protocolText: PROTOCOL.replace('24000', '22050') });
  assert.match(rate[0], /AUDIO_OUT_RATE_HZ is 22050/);
});

test('(d) a client type the server does not accept fails', () => {
  assert.deepEqual(serverAcceptedTypes(ORB_LIVE(ALL_CLIENT_CASES)), ALL_CLIENT_CASES);
  const r = checkProtocolContract({ orbLiveText: ORB_LIVE(ALL_CLIENT_CASES.filter((c) => c !== 'nav_result')), widgetText: WIDGET.replace('__EXTRA__', ''), mobileProtocol: mobileProtocol() });
  assert.deepEqual(r.problems, ['(d) client type "nav_result" is not a case in handleWsClientMessage (orb-live.ts) — the server would answer "Unknown message type"']);
});

test('(d) an unclassified server message the widget learns fails', () => {
  const widget = WIDGET.replace('__EXTRA__', "case 'brand_new_server_event': break;");
  const types = widgetHandledTypes(widget);
  assert.ok(types.includes('brand_new_server_event'));
  assert.ok(types.includes('connected') && types.includes('session_started'));
  assert.ok(!types.includes('nested_not_a_type'));
  const r = checkProtocolContract({ orbLiveText: ORB_LIVE(ALL_CLIENT_CASES), widgetText: widget, mobileProtocol: mobileProtocol() });
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0], /"brand_new_server_event", which apps\/mobile\/src\/orb\/protocol.ts has not classified/);
});

test('(e) forbidden on-device speech, voice selection, clip assets and spoken literals fail', () => {
  const m = tree({
    'apps/mobile/src/orb/ok.ts': "export const x = { type: 'text' };\nconst msg = { text: someVar };\n",
    'apps/mobile/modules/vitana-voice/ios/VoiceEngine.swift': 'let synth = AVSpeechSynthesizer()\n',
    'apps/mobile/modules/vitana-voice/android/src/Engine.kt': 'import android.speech.tts.TextToSpeech\n',
    'apps/mobile/modules/vitana-voice/src/index.ts': "import * as Speech from 'expo-speech';\nconst opts = { voiceId: 'x', voice_id: 'y' };\n",
    'apps/mobile/src/orb/hello.ts': "speak('Hallo, wie geht es dir?');\nconst line = { say: \"I'm back now\" };\n",
    'apps/mobile/modules/vitana-voice/assets/chime.mp3': 'x',
    'apps/mobile/modules/vitana-voice/assets/alert.WAV': 'x',
  });
  try {
    const r = scanNativeSources(m.root);
    const joined = r.problems.join('\n');
    for (const needle of ['AVSpeechSynthesizer', 'android.speech.tts', 'expo-speech', '"voiceId"', '"voice_id"', 'chime.mp3', 'alert.WAV', 'hello.ts:1', 'hello.ts:2']) {
      assert.ok(joined.includes(needle), `expected a finding for ${needle}:\n${joined}`);
    }
    assert.ok(!joined.includes('ok.ts'), joined);
  } finally {
    m.cleanup();
  }
});

test('(e) the real native ORB sources are clean', () => {
  assert.deepEqual(scanNativeSources(ROOT).problems, []);
});

test('fetch fails closed without a token (no silent skip), with the fork-PR message', async () => {
  await assert.rejects(fetchPlatformFiles(mkdtempSync(join(tmpdir(), 'orb-')), { token: '', fetchImpl: () => assert.fail('no request without a token') }), {
    message: NO_TOKEN_MESSAGE,
  });
  const env = { ...process.env, GH_TOKEN: '', PLATFORM_DISPATCH_TOKEN: '' };
  const r = spawnSync(process.execPath, [SCRIPT, '--fetch', mkdtempSync(join(tmpdir(), 'orb-')), '--check'], { env, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /orb-parity needs PLATFORM_DISPATCH_TOKEN \(not available to fork PRs\); push the branch to exafyltd\/vitana-v1 to run it\./);
});

test('fetch fails closed on an HTTP error and asks for every platform file from main', async () => {
  const urls = [];
  await assert.rejects(
    fetchPlatformFiles(mkdtempSync(join(tmpdir(), 'orb-')), {
      token: 't',
      fetchImpl: async (url) => {
        urls.push(url);
        return { ok: false, status: 404, text: async () => '' };
      },
    }),
    /failed with HTTP 404 — the job fails closed/,
  );
  assert.equal(urls[0], `https://api.github.com/repos/exafyltd/vitana-platform/contents/${PLATFORM_FILES.gate}?ref=main`);
});

test('--check without the platform files fails (never skips)', () => {
  const r = spawnSync(process.execPath, [SCRIPT, '--check', '--platform-dir', mkdtempSync(join(tmpdir(), 'orb-empty-'))], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /missing under .* the job never skips/);
});
