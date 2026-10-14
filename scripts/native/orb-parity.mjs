#!/usr/bin/env node
// VTID-05179 — ORB cross-repo parity (Native app Wave 1b N6a, plan Change 6).
//
// The native ORB (apps/mobile/src/orb) mirrors vitana-platform code that this
// repo cannot import: the full-duplex gate, the widget's audio constants and
// the WS/SSE protocol. This script fetches those platform files from `main`
// and fails when the native side drifts:
//
//   (a) gate constants   DUPLEX_GATE (platform, read with the TS AST) deep-equals the mobile copy
//   (b) gate behaviour   platform evaluateDuplexGateFrame vs the mobile one: the platform's own
//                        scripted scenarios + 20,000 seeded random frames, every decision and next
//                        state identical; the committed vectors file must equal the platform output
//   (c) widget literals  orb-widget.js / orb/live/protocol.ts still hold the literals ORB_AUDIO and
//                        LEGACY_GATE mirror, with the same values
//   (d) protocol         every client→server type is a `case` in handleWsClientMessage; every
//                        server→client type the widget handles is HANDLED_BY_NATIVE or IGNORED_BY_NATIVE
//   (e) rules 41 / 42a   no on-device speech synthesis, no voice selection, no audio clip assets and
//                        no sentence in a speak/say/text position under src/orb and modules/vitana-voice
//
//   node scripts/native/orb-parity.mjs --fetch <dir>                 fetch the platform files (needs GH_TOKEN)
//   node scripts/native/orb-parity.mjs --check --platform-dir <dir>  run (a)–(e) + the vectors drift check
//   node scripts/native/orb-parity.mjs --write-vectors --platform-dir <dir>
//
// The fetch uses the same secret and endpoint as PR-GATE.yml (PLATFORM_DISPATCH_TOKEN,
// `repos/exafyltd/vitana-platform/contents/<path>?ref=main`). It FAILS without a token,
// never skips. It talks to api.github.com only and never to a Vitana service.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const PLATFORM_REPO = 'exafyltd/vitana-platform';
export const PLATFORM_FILES = {
  gate: 'services/gateway/src/orb/live/duplex/full-duplex-gate.ts',
  widget: 'services/gateway/src/frontend/command-hub/orb-widget.js',
  orbLive: 'services/gateway/src/routes/orb-live.ts',
  protocol: 'services/gateway/src/orb/live/protocol.ts',
};
export const MOBILE = {
  orbDir: 'apps/mobile/src/orb',
  gate: 'apps/mobile/src/orb/duplex-gate.ts',
  protocol: 'apps/mobile/src/orb/protocol.ts',
  voiceModule: 'apps/mobile/modules/vitana-voice',
  vectors: 'apps/mobile/modules/vitana-voice/fixtures/duplex-gate-vectors.json',
};
export const NO_TOKEN_MESSAGE =
  'orb-parity needs PLATFORM_DISPATCH_TOKEN (not available to fork PRs); push the branch to exafyltd/vitana-v1 to run it.';

// ── Loading TypeScript without a build ───────────────────────────────────

/**
 * Transpiles `file` to CommonJS and evaluates it. Relative imports resolve to
 * sibling `.ts` files; any other import is refused (the gate and protocol
 * modules have none, and the platform gate file has no imports at all).
 */
export function loadTsModule(file, { env = {}, cache = new Map() } = {}) {
  const abs = resolve(file);
  if (cache.has(abs)) return cache.get(abs);
  const source = readFileSync(abs, 'utf8');
  const out = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: abs,
  }).outputText;
  const module = { exports: {} };
  cache.set(abs, module.exports);
  const req = (spec) => {
    if (!spec.startsWith('.')) throw new Error(`${relative(ROOT, abs)}: import "${spec}" is not allowed in a parity-checked module`);
    const target = resolve(dirname(abs), spec.endsWith('.ts') ? spec : `${spec}.ts`);
    return loadTsModule(target, { env, cache });
  };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', 'process', out)(module.exports, req, module, { env });
  cache.set(abs, module.exports);
  return module.exports;
}

function parse(file, text) {
  const kind = file.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
}

function walk(node, fn) {
  fn(node);
  ts.forEachChild(node, (c) => walk(c, fn));
}

function literalValue(node) {
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression?.(node)) return literalValue(node.expression);
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) return -literalValue(node.operand);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isObjectLiteralExpression(node)) {
    const o = {};
    for (const p of node.properties) {
      if (!ts.isPropertyAssignment(p)) throw new Error('unsupported property in a constant object');
      o[p.name.getText()] = literalValue(p.initializer);
    }
    return o;
  }
  throw new Error(`not a literal: ${node.getText().slice(0, 60)}`);
}

/** Reads `export const NAME = { … }` from source text with the TS AST. */
export function extractConstObject(text, name, file = 'x.ts') {
  let found;
  walk(parse(file, text), (n) => {
    if (found === undefined && ts.isVariableDeclaration(n) && n.name.getText() === name && n.initializer) found = literalValue(n.initializer);
  });
  if (found === undefined) throw new Error(`${name} not found`);
  return found;
}

// ── (a) constants ─────────────────────────────────────────────────────────

function deepEqual(a, b) {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  return v;
}

export function checkGateConstants({ platformGateText, mobileGate }) {
  const platform = extractConstObject(platformGateText, 'DUPLEX_GATE');
  if (!deepEqual(platform, mobileGate.DUPLEX_GATE)) {
    return [`(a) DUPLEX_GATE differs: platform ${JSON.stringify(platform)} vs mobile ${JSON.stringify(mobileGate.DUPLEX_GATE)} — update apps/mobile/src/orb/duplex-gate.ts`];
  }
  return [];
}

// ── (b) behaviour ─────────────────────────────────────────────────────────

const FRAME_MS = 64;

/** The platform test's scripted scenarios (full-duplex-session-gate.test.ts, VTID-03706). */
export function scriptedScenarios(DUPLEX_GATE) {
  const dip = (DUPLEX_GATE.openRms + DUPLEX_GATE.closeRms) / 2;
  const gap = Math.ceil(DUPLEX_GATE.hangoverMs / FRAME_MS) + 2;
  const warm = Math.ceil(DUPLEX_GATE.aecWarmupMs / FRAME_MS);
  return [
    { name: 'speech first frame', rms: [0.2] },
    { name: 'quiet speech', rms: [0.055] },
    { name: 'mid-word dip', rms: [0.2, dip, dip, 0.2] },
    { name: 'hangover', rms: [0.2, ...new Array(gap).fill(0)] },
    ...[0.01, 0.02, 0.03, 0.04].map((r) => ({ name: `echo ${r}`, rms: new Array(20).fill(r) })),
    { name: 'long echo', rms: new Array(200).fill(0.03) },
    { name: 'warm-up', rms: [0.2, 0.2, 0.2], startMs: 50_000, playbackStartedAtMs: 50_000 },
    { name: 'warm-up accumulation', rms: new Array(warm + 3).fill(0.2), startMs: 50_000, playbackStartedAtMs: 50_000 },
    { name: 'post warm-up', rms: [0.2], startMs: 50_000 + DUPLEX_GATE.aecWarmupMs + 1, playbackStartedAtMs: 50_000 },
    { name: 'barge budget', rms: new Array(6).fill(0.2) },
    { name: 'cough', rms: [0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: 'frame 1 forwarded', rms: [0.2, 0.2] },
    { name: 'double barge', rms: new Array(20).fill(0.2) },
    // Exact boundaries the 64 ms grid never hits: hangover (>=), warm-up (<), thresholds (>).
    { name: 'hangover boundary', rms: [0.2, 0, 0, 0], times: [0, DUPLEX_GATE.hangoverMs - 1, DUPLEX_GATE.hangoverMs, DUPLEX_GATE.hangoverMs + 1] },
    { name: 'warm-up boundary', rms: [0.2, 0.2, 0.2], times: [DUPLEX_GATE.aecWarmupMs - 1, DUPLEX_GATE.aecWarmupMs, DUPLEX_GATE.aecWarmupMs + 1], startMs: 50_000, playbackStartedAtMs: 50_000 },
    { name: 'threshold boundaries', rms: [DUPLEX_GATE.openRms, DUPLEX_GATE.openRms + 1e-9, DUPLEX_GATE.closeRms, DUPLEX_GATE.closeRms + 1e-9, DUPLEX_GATE.closeRms, 0] },
  ];
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Frames whose RMS clusters around the thresholds, with jittered timing, warm-up restarts and barge flags. */
export function randomFrames(count, seed) {
  const rnd = mulberry32(seed);
  const out = [];
  let now = 100_000;
  let playbackStartedAtMs = now - 1000;
  const bands = [0, 0.01, 0.024, 0.025, 0.026, 0.04, 0.049, 0.05, 0.051, 0.06, 0.2, 0.4];
  for (let i = 0; i < count; i++) {
    now += FRAME_MS + Math.floor(rnd() * 21) - 10;
    if (rnd() < 0.02) playbackStartedAtMs = now - Math.floor(rnd() * 400);
    if (rnd() < 0.005) playbackStartedAtMs = 0;
    const rms = rnd() < 0.5 ? bands[Math.floor(rnd() * bands.length)] : Math.round(rnd() * 0.3 * 1e6) / 1e6;
    out.push({ rms, nowMs: now, playbackStartedAtMs, bargeAlreadySent: rnd() < 0.15, resetState: rnd() < 0.01 });
  }
  return out;
}

function runSequence(fn, init, frames) {
  let state = init();
  let barge = false;
  return frames.map((f) => {
    if (f.resetState) state = init();
    const input = { rms: f.rms, nowMs: f.nowMs, playbackStartedAtMs: f.playbackStartedAtMs, bargeAlreadySent: f.bargeAlreadySent ?? barge, state };
    const d = fn(input);
    state = d.next;
    if (d.triggerBarge) barge = true;
    return { input, output: d };
  });
}

export function scenarioFrames(s) {
  const startMs = s.startMs ?? 100_000;
  const playbackStartedAtMs = s.playbackStartedAtMs ?? startMs - 10_000;
  return s.rms.map((rms, i) => ({ rms, nowMs: startMs + (s.times ? s.times[i] : i * FRAME_MS), playbackStartedAtMs }));
}

export const RANDOM_FRAMES = 20_000;
export const RANDOM_SEED = 0x05179;

export function checkGateBehaviour({ platformGate, mobileGate, randomCount = RANDOM_FRAMES }) {
  const problems = [];
  const sequences = [
    ...scriptedScenarios(platformGate.DUPLEX_GATE).map((s) => ({ name: s.name, frames: scenarioFrames(s) })),
    { name: `${randomCount} seeded random frames`, frames: randomFrames(randomCount, RANDOM_SEED) },
  ];
  let compared = 0;
  for (const seq of sequences) {
    const p = runSequence(platformGate.evaluateDuplexGateFrame, platformGate.initialDuplexGateState, seq.frames);
    // The mobile function gets the PLATFORM's input stream (same state), so one divergence is reported at its frame.
    for (let i = 0; i < p.length; i++) {
      compared++;
      const m = mobileGate.evaluateDuplexGateFrame(p[i].input);
      if (!deepEqual(m, p[i].output)) {
        problems.push(
          `(b) gate behaviour differs in "${seq.name}" at frame ${i}: input ${JSON.stringify(p[i].input)} → platform ${JSON.stringify(p[i].output)}, mobile ${JSON.stringify(m)}`,
        );
        break;
      }
    }
  }
  return { problems, compared };
}

function packFrame({ input, output }) {
  const st = input.state;
  const nx = output.next;
  return [
    [input.rms, input.nowMs, input.playbackStartedAtMs, input.bargeAlreadySent, st.open, st.lastVoiceMs, st.openFrames],
    [output.passthrough, output.triggerBarge, nx.open, nx.lastVoiceMs, nx.openFrames],
  ];
}

/** The fixed vector set the Swift / Kotlin tests read (platform outputs). Deterministic: no timestamps, no commit ids. */
export function buildVectors(platformGate) {
  const run = (frames) => runSequence(platformGate.evaluateDuplexGateFrame, platformGate.initialDuplexGateState, frames).map(packFrame);
  const scenarios = scriptedScenarios(platformGate.DUPLEX_GATE).map((s) => ({ name: s.name, frames: run(scenarioFrames(s)) }));
  const random = run(randomFrames(256, RANDOM_SEED));
  const signals = [
    { kind: 'silence', amplitude: 0, freqHz: 0 },
    { kind: 'sine', amplitude: 0.5, freqHz: 440 },
    { kind: 'sine', amplitude: 0.05, freqHz: 1000 },
    { kind: 'sine', amplitude: 0.025, freqHz: 250 },
    { kind: 'sine', amplitude: 1, freqHz: 3000 },
  ].map((s) => {
    let sum = 0;
    for (let k = 0; k < 1024; k++) {
      const x = s.amplitude * Math.sin((2 * Math.PI * s.freqHz * k) / 16000);
      sum += x * x;
    }
    return { ...s, sampleRate: 16000, samples: 1024, rms: Number(Math.sqrt(sum / 1024).toPrecision(12)) };
  });
  return {
    _comment:
      'VTID-05179 — generated by scripts/native/orb-parity.mjs --write-vectors from the vitana-platform gate (services/gateway/src/orb/live/duplex/full-duplex-gate.ts, main). Do not edit by hand; NATIVE-CI orb-parity fails when it drifts. The decision logic runs in TypeScript; native tests read `signals` (RMS of known 1024-sample frames at 16 kHz, sqrt(mean(x^2))) and may replay `vectors`.',
    frameFormat: [
      ['rms', 'nowMs', 'playbackStartedAtMs', 'bargeAlreadySent', 'state.open', 'state.lastVoiceMs', 'state.openFrames'],
      ['passthrough', 'triggerBarge', 'next.open', 'next.lastVoiceMs', 'next.openFrames'],
    ],
    duplexGate: platformGate.DUPLEX_GATE,
    frameSamples: 1024,
    sampleRate: 16000,
    signals,
    vectors: [...scenarios, { name: 'seeded random (256)', frames: random }],
  };
}

/** Pretty JSON with every array of primitives (and every frame pair) on one line. */
export function serializeVectors(v) {
  const prim = /\[\s+([^\[\]{}]*?)\s+\]/g;
  const pair = /\[\s+(\[[^\[\]{}]*\](?:,\s+\[[^\[\]{}]*\])*)\s+\]/g;
  const text = JSON.stringify(v, null, 2)
    .replace(prim, (_m, inner) => `[${inner.split(/,\s+/).join(', ')}]`)
    .replace(pair, (_m, inner) => `[${inner.split(/,\s+(?=\[)/).join(', ')}]`);
  return `${text}\n`;
}

export function checkVectors({ platformGate, vectorsText }) {
  const expected = serializeVectors(buildVectors(platformGate));
  if (vectorsText == null) return [`(b) ${MOBILE.vectors} is missing — run: node scripts/native/orb-parity.mjs --write-vectors --platform-dir <dir>`];
  if (vectorsText !== expected) return [`(b) ${MOBILE.vectors} differs from the platform output — regenerate with --write-vectors`];
  return [];
}

// ── (c) widget literals ───────────────────────────────────────────────────

export function widgetLiteralSpecs({ ORB_AUDIO, LEGACY_GATE, DUPLEX_GATE, VOICE_STYLE }) {
  const num = (m) => Number(m[1]);
  return [
    { file: 'widget', what: 'vadThreshold', re: /var\s+vadThreshold\s*=\s*([0-9.]+)\s*;/, expect: LEGACY_GATE.vadThreshold, read: num },
    { file: 'widget', what: 'vadConfirm', re: /var\s+vadConfirm\s*=\s*([0-9.]+)\s*;/, expect: LEGACY_GATE.vadConfirm, read: num },
    { file: 'widget', what: 'PRE_ROLL_MAX_FRAMES', re: /var\s+PRE_ROLL_MAX_FRAMES\s*=\s*([0-9.]+)\s*;/, expect: LEGACY_GATE.preRollMaxFrames, read: num },
    { file: 'widget', what: 'post-turn_complete cooldown', re: /!_s\.fullDuplex\s*&&\s*_s\.turnCompleteAt\s*>\s*0\s*&&\s*\(Date\.now\(\)\s*-\s*_s\.turnCompleteAt\)\s*<\s*(\d+)\)/, expect: LEGACY_GATE.turnCompleteCooldownMs, read: num },
    { file: 'widget', what: 'post-audio-end cooldown', re: /!_s\.fullDuplex\s*&&\s*_s\.lastAudioEndTime\s*>\s*0\s*&&\s*\(Date\.now\(\)\s*-\s*_s\.lastAudioEndTime\)\s*<\s*(\d+)\)/, expect: LEGACY_GATE.audioEndCooldownMs, read: num },
    { file: 'widget', what: 'createScriptProcessor frame size', re: /createScriptProcessor\((\d+)\s*,/, expect: ORB_AUDIO.FRAME_SAMPLES, read: num },
    { file: 'widget', what: 'getUserMedia sampleRate', re: /autoGainControl:\s*true,\s*sampleRate:\s*(\d+)/, expect: ORB_AUDIO.IN_RATE, read: num },
    { file: 'widget', what: '_AUDIO_PLAYBACK_RATE', re: /var\s+_AUDIO_PLAYBACK_RATE\s*=\s*([0-9.]+)\s*;/, expect: ORB_AUDIO.PLAYBACK_RATE, read: num },
    { file: 'widget', what: '_AUDIO_PLAYBACK_RATE_DE', re: /var\s+_AUDIO_PLAYBACK_RATE_DE\s*=\s*([0-9.]+)\s*;/, expect: ORB_AUDIO.PLAYBACK_RATE_DE, read: num },
    { file: 'widget', what: '_PLAYBACK_LEAD_FIRST_SEC', re: /var\s+_PLAYBACK_LEAD_FIRST_SEC\s*=\s*([0-9.]+)\s*;/, expect: ORB_AUDIO.LEAD_FIRST_SEC, read: num },
    { file: 'widget', what: '_PLAYBACK_LEAD_LATER_SEC', re: /var\s+_PLAYBACK_LEAD_LATER_SEC\s*=\s*([0-9.]+)\s*;/, expect: ORB_AUDIO.LEAD_LATER_SEC, read: num },
    { file: 'widget', what: 'audio-end grace', re: /_s\.audioPlaying\s*=\s*false;\s*_s\.lastAudioEndTime\s*=\s*Date\.now\(\);\s*\}\s*\},\s*(\d+)\);/, expect: ORB_AUDIO.AUDIO_END_GRACE_MS, read: num },
    { file: 'widget', what: 'vad_silence_ms', re: /vad_silence_ms:\s*(\d+)/, expect: ORB_AUDIO.VAD_SILENCE_MS, read: num },
    { file: 'widget', what: 'voice_style', re: /voice_style:\s*'([^']*)'/, expect: VOICE_STYLE, read: (m) => m[1] },
    { file: 'widget', what: 'WS start budget', re: /WS session start timed out after 8s'\)\);\s*\},\s*(\d+)\)/, expect: ORB_AUDIO.START_TIMEOUT_MS, read: num },
    { file: 'widget', what: 'CONTEXT_UPDATE_DEBOUNCE_MS', re: /var\s+CONTEXT_UPDATE_DEBOUNCE_MS\s*=\s*(\d+)\s*;/, expect: ORB_AUDIO.CONTEXT_DEBOUNCE_MS, read: num },
    { file: 'widget', what: '_pcmRateFromMime fallback', re: /return\s*\(rate\s*>\s*0\)\s*\?\s*rate\s*:\s*(\d+);/, expect: ORB_AUDIO.OUT_RATE_DEFAULT, read: num },
    { file: 'widget', what: 'DUPLEX_OPEN_RMS', re: /var\s+DUPLEX_OPEN_RMS\s*=\s*([0-9.]+)\s*;/, expect: DUPLEX_GATE.openRms, read: num },
    { file: 'widget', what: 'DUPLEX_CLOSE_RMS', re: /var\s+DUPLEX_CLOSE_RMS\s*=\s*([0-9.]+)\s*;/, expect: DUPLEX_GATE.closeRms, read: num },
    { file: 'widget', what: 'DUPLEX_HANGOVER_MS', re: /var\s+DUPLEX_HANGOVER_MS\s*=\s*([0-9.]+)\s*;/, expect: DUPLEX_GATE.hangoverMs, read: num },
    { file: 'widget', what: 'DUPLEX_AEC_WARMUP_MS', re: /var\s+DUPLEX_AEC_WARMUP_MS\s*=\s*([0-9.]+)\s*;/, expect: DUPLEX_GATE.aecWarmupMs, read: num },
    { file: 'widget', what: 'DUPLEX_BARGE_CONFIRM_FRAMES', re: /var\s+DUPLEX_BARGE_CONFIRM_FRAMES\s*=\s*([0-9.]+)\s*;/, expect: DUPLEX_GATE.bargeConfirmFrames, read: num },
    { file: 'protocol', what: 'AUDIO_IN_RATE_HZ', re: /export\s+const\s+AUDIO_IN_RATE_HZ\s*=\s*(\d+)\s*;/, expect: ORB_AUDIO.IN_RATE, read: num },
    { file: 'protocol', what: 'AUDIO_OUT_RATE_HZ', re: /export\s+const\s+AUDIO_OUT_RATE_HZ\s*=\s*(\d+)\s*;/, expect: ORB_AUDIO.OUT_RATE_DEFAULT, read: num },
  ];
}

export function checkWidgetLiterals({ widgetText, protocolText, mobileProtocol, mobileGate }) {
  const specs = widgetLiteralSpecs({
    ORB_AUDIO: mobileProtocol.ORB_AUDIO,
    VOICE_STYLE: mobileProtocol.VOICE_STYLE,
    LEGACY_GATE: mobileGate.LEGACY_GATE,
    DUPLEX_GATE: mobileGate.DUPLEX_GATE,
  });
  const problems = [];
  for (const s of specs) {
    const text = s.file === 'widget' ? widgetText : protocolText;
    const m = s.re.exec(text);
    const where = s.file === 'widget' ? 'orb-widget.js' : 'orb/live/protocol.ts';
    if (!m) {
      problems.push(`(c) ${where}: literal "${s.what}" not found (pattern ${s.re}) — the widget changed; re-verify the mobile mirror`);
      continue;
    }
    const got = s.read(m);
    if (got !== s.expect) problems.push(`(c) ${where}: ${s.what} is ${JSON.stringify(got)}, mobile mirrors ${JSON.stringify(s.expect)}`);
  }
  return problems;
}

// ── (d) protocol contract ─────────────────────────────────────────────────

function findFunction(sf, name) {
  let fn;
  walk(sf, (n) => {
    if (!fn && ts.isFunctionDeclaration(n) && n.name?.text === name) fn = n;
  });
  return fn;
}

function switchCases(fn, discriminant) {
  let sw;
  walk(fn, (n) => {
    if (!sw && ts.isSwitchStatement(n) && n.expression.getText() === discriminant) sw = n;
  });
  if (!sw) return null;
  const out = [];
  for (const clause of sw.caseBlock.clauses) {
    if (ts.isCaseClause(clause) && (ts.isStringLiteral(clause.expression) || ts.isNoSubstitutionTemplateLiteral(clause.expression))) {
      out.push(clause.expression.text);
    }
  }
  return out;
}

/** The `case` labels of `switch (message.type)` in `handleWsClientMessage` (orb-live.ts). */
export function serverAcceptedTypes(orbLiveText) {
  const sf = parse('orb-live.ts', orbLiveText);
  const fn = findFunction(sf, 'handleWsClientMessage');
  if (!fn) throw new Error('handleWsClientMessage not found in orb-live.ts');
  const cases = switchCases(fn, 'message.type');
  if (!cases) throw new Error('switch (message.type) not found in handleWsClientMessage');
  return cases;
}

/** Server→client types the widget handles: `_handleMessage`'s `switch (msg.type)` + every `msg.type === '…'`. */
export function widgetHandledTypes(widgetText) {
  const sf = parse('orb-widget.js', widgetText);
  const fn = findFunction(sf, '_handleMessage');
  if (!fn) throw new Error('_handleMessage not found in orb-widget.js');
  const cases = switchCases(fn, 'msg.type');
  if (!cases) throw new Error('switch (msg.type) not found in _handleMessage');
  const set = new Set(cases);
  walk(sf, (n) => {
    if (
      ts.isBinaryExpression(n) &&
      (n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken || n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken) &&
      n.left.getText() === 'msg.type' &&
      ts.isStringLiteral(n.right)
    ) {
      set.add(n.right.text);
    }
  });
  return [...set].sort();
}

export function checkProtocolContract({ orbLiveText, widgetText, mobileProtocol }) {
  const problems = [];
  const warnings = [];
  const accepted = new Set(serverAcceptedTypes(orbLiveText));
  for (const t of mobileProtocol.CLIENT_MESSAGE_TYPES) {
    if (!accepted.has(t)) problems.push(`(d) client type "${t}" is not a case in handleWsClientMessage (orb-live.ts) — the server would answer "Unknown message type"`);
  }
  const handled = new Set(mobileProtocol.HANDLED_BY_NATIVE);
  const ignored = mobileProtocol.IGNORED_BY_NATIVE;
  const widget = widgetHandledTypes(widgetText);
  for (const t of widget) {
    if (!handled.has(t) && !(t in ignored)) {
      problems.push(`(d) the widget handles server message "${t}", which apps/mobile/src/orb/protocol.ts has not classified — add it to HANDLED_BY_NATIVE or IGNORED_BY_NATIVE (with a reason)`);
    }
  }
  for (const t of handled) if (!widget.includes(t)) warnings.push(`(d) note: HANDLED_BY_NATIVE has "${t}", which the widget no longer handles`);
  for (const [t, why] of Object.entries(ignored)) if (!why || String(why).trim().length < 5) problems.push(`(d) IGNORED_BY_NATIVE "${t}" has no reason`);
  return { problems, warnings, accepted: [...accepted], widget };
}

// ── (e) native scan (rules 41 / 42a) ──────────────────────────────────────

export const FORBIDDEN_TOKENS = ['AVSpeechSynthesizer', 'android.speech.tts', 'expo-speech', 'voice_id', 'voiceId'];
export const FORBIDDEN_ASSET = /\.(mp3|wav)$/i;
/** A sentence-like string literal (two words or more) in a speak / say / text position. */
export const SPOKEN_LITERAL = /\b(speak|say|text)\s*[:=(]\s*(['"`])(?:(?!\2).)*?\p{L}{2,}\s+\p{L}(?:(?!\2).)*\2/u;

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'build' || name === '.gradle') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

export function scanNativeSources(root = ROOT) {
  const problems = [];
  const files = [...listFiles(join(root, MOBILE.orbDir)), ...listFiles(join(root, MOBILE.voiceModule))];
  for (const file of files) {
    const rel = relative(root, file);
    if (FORBIDDEN_ASSET.test(file)) {
      problems.push(`(e) ${rel}: audio clip asset — the native ORB never plays a recording of its own (rule 41)`);
      continue;
    }
    if (!/\.(ts|tsx|js|mjs|cjs|json|swift|kt|kts|java|m|mm|h|xml|gradle|podspec|rb)$/i.test(file)) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const tok of FORBIDDEN_TOKENS) {
        if (line.includes(tok)) problems.push(`(e) ${rel}:${i + 1}: "${tok}" — the native ORB never speaks on-device or picks a voice (rules 41, 42a)`);
      }
      if (SPOKEN_LITERAL.test(line)) problems.push(`(e) ${rel}:${i + 1}: a sentence literal in a speak/say/text position (rule 41): ${line.trim().slice(0, 100)}`);
    });
  }
  return { problems, scanned: files.length };
}

// ── Fetch ─────────────────────────────────────────────────────────────────

export async function fetchPlatformFiles(dir, { token = process.env.GH_TOKEN || process.env.PLATFORM_DISPATCH_TOKEN, fetchImpl = globalThis.fetch, ref = 'main' } = {}) {
  if (!token) throw new Error(NO_TOKEN_MESSAGE);
  for (const path of Object.values(PLATFORM_FILES)) {
    const url = `https://api.github.com/repos/${PLATFORM_REPO}/contents/${path}?ref=${ref}`;
    const res = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw', 'X-GitHub-Api-Version': '2022-11-28' },
    });
    if (!res.ok) throw new Error(`orb-parity: fetching ${PLATFORM_REPO}:${path}@${ref} failed with HTTP ${res.status} — the job fails closed, it never skips`);
    const text = await res.text();
    const out = join(dir, path);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, text);
  }
}

// ── Orchestration ─────────────────────────────────────────────────────────

export function readPlatform(dir) {
  const out = {};
  for (const [k, p] of Object.entries(PLATFORM_FILES)) {
    const full = join(dir, p);
    if (!existsSync(full)) throw new Error(`orb-parity: ${p} missing under ${dir} — fetch it first (--fetch); the job never skips`);
    out[k] = readFileSync(full, 'utf8');
  }
  return out;
}

export function runAll({ platformDir, root = ROOT, randomCount = RANDOM_FRAMES }) {
  const platform = readPlatform(platformDir);
  const platformGate = loadTsModule(join(platformDir, PLATFORM_FILES.gate));
  const mobileGate = loadTsModule(join(root, MOBILE.gate));
  const mobileProtocol = loadTsModule(join(root, MOBILE.protocol));
  const vectorsPath = join(root, MOBILE.vectors);
  const behaviour = checkGateBehaviour({ platformGate, mobileGate, randomCount });
  const contract = checkProtocolContract({ orbLiveText: platform.orbLive, widgetText: platform.widget, mobileProtocol });
  const scan = scanNativeSources(root);
  const sections = {
    a: checkGateConstants({ platformGateText: platform.gate, mobileGate }),
    b: [...behaviour.problems, ...checkVectors({ platformGate, vectorsText: existsSync(vectorsPath) ? readFileSync(vectorsPath, 'utf8') : null })],
    c: checkWidgetLiterals({ widgetText: platform.widget, protocolText: platform.protocol, mobileProtocol, mobileGate }),
    d: contract.problems,
    e: scan.problems,
  };
  return { sections, warnings: contract.warnings, stats: { compared: behaviour.compared, scanned: scan.scanned, widgetTypes: contract.widget.length, serverTypes: contract.accepted.length } };
}

async function main(argv) {
  const opt = (n) => {
    const i = argv.indexOf(`--${n}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const fetchDir = opt('fetch');
  if (fetchDir) {
    try {
      await fetchPlatformFiles(resolve(fetchDir));
      console.log(`orb-parity: fetched ${Object.keys(PLATFORM_FILES).length} files from ${PLATFORM_REPO}@main into ${fetchDir}`);
    } catch (e) {
      console.error(`::error::${e.message}`);
      return 1;
    }
    if (!argv.includes('--check') && !argv.includes('--write-vectors')) return 0;
  }
  const platformDir = opt('platform-dir') || fetchDir;
  if (!platformDir) {
    console.error('usage: orb-parity.mjs [--fetch <dir>] (--check | --write-vectors) --platform-dir <dir>');
    return 2;
  }
  try {
    if (argv.includes('--write-vectors')) {
      const platformGate = loadTsModule(join(resolve(platformDir), PLATFORM_FILES.gate));
      const out = join(ROOT, MOBILE.vectors);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, serializeVectors(buildVectors(platformGate)));
      console.log(`orb-parity: wrote ${MOBILE.vectors}`);
      if (!argv.includes('--check')) return 0;
    }
    const r = runAll({ platformDir: resolve(platformDir) });
    const all = Object.values(r.sections).flat();
    const lines = [
      '### ORB parity (VTID-05179)',
      '',
      `| check | result |`,
      `|---|---|`,
      `| (a) DUPLEX_GATE constants | ${r.sections.a.length ? '❌' : '✅'} |`,
      `| (b) gate behaviour — ${r.stats.compared} frames + vectors file | ${r.sections.b.length ? '❌' : '✅'} |`,
      `| (c) widget / protocol literals | ${r.sections.c.length ? '❌' : '✅'} |`,
      `| (d) protocol contract — ${r.stats.serverTypes} server cases, ${r.stats.widgetTypes} widget types | ${r.sections.d.length ? '❌' : '✅'} |`,
      `| (e) native scan — ${r.stats.scanned} files | ${r.sections.e.length ? '❌' : '✅'} |`,
    ];
    if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`, { flag: 'a' });
    for (const w of r.warnings) console.log(w);
    if (all.length) {
      for (const p of all) console.error(`::error::${p}`);
      console.error(`orb-parity: ${all.length} problem(s)`);
      return 1;
    }
    console.log(lines.slice(4).join('\n'));
    console.log('orb-parity: OK');
    return 0;
  } catch (e) {
    console.error(`::error::${e.message}`);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
