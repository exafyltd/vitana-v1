// VTID-05179 — a local fake ORB gateway (N6a, plan Change 7). Never shipped in the app.
//
// Speaks the WS and SSE protocol of vitana-platform `routes/orb-live.ts` from
// scripted scenarios, so the native ORB client can be tested without opening a
// session on any real gateway (every real ORB session writes to the shared
// production database — plan F14–F16). It records every client frame it
// receives (arrival time, transport, type, byte length) so tests and the
// device checklist can verify framing, cadence and order on the gateway side.
//
// Network limits: binds to 127.0.0.1 by default, or to a private-range LAN
// address with --lan; any other bind address is refused. It only listens; it
// opens no outbound connection and proxies nothing.
'use strict';

const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');
const { toneChunks } = require('./tone');

const ROUTES = {
  transport: '/api/v1/orb/live/transport',
  ws: '/api/v1/orb/live/ws',
  start: '/api/v1/orb/live/session/start',
  stream: '/api/v1/orb/live/stream',
  send: '/api/v1/orb/live/stream/send',
  stop: '/api/v1/orb/live/session/stop',
  authMe: '/api/v1/auth/me',
  audioReady: /^\/api\/v1\/orb\/session\/([^/]+)\/audio-ready$/,
};

/** The greeting: tone bursts (24 kHz, then 16 kHz mime), then turn_complete. */
const GREETING = { greeting: { rates: [24000, 16000], ms: 300, chunkMs: 100 } };

const DEFAULT_SCENARIO = {
  transport: 'ws', // answer of GET /transport; null ⇒ HTTP 500
  fullDuplex: true,
  playbackLeadFirstOnly: true,
  authMeStatus: 200,
  rejectStart: null, // { code } ⇒ `error` instead of session_started / ok:false
  transportFailure: false, // WS upgrade destroyed before the handshake
  silentHandshake: false, // WS accepted, `connected` never sent (start budget expires)
  interruptReply: true, // `interrupt` ⇒ `interrupted`
  afterAudioReady: [GREETING], // steps: message objects, { waitMs }, or GREETING
  endAfterMs: null, // `session_ended` after this many ms from audio_ready
};

const SCENARIOS = {
  'full-duplex': {},
  'half-duplex': { fullDuplex: false },
  sse: { transport: 'sse' },
  navigate: {
    afterAudioReady: [GREETING, { type: 'orb_directive', directive: 'navigate', route: '/calendar', screen_id: 'CALENDAR.OVERVIEW', title: 'Calendar' }],
  },
  'navigate-after-speech': {
    afterAudioReady: [
      { type: 'orb_directive', directive: 'navigate', route: '/calendar', screen_id: 'CALENDAR.OVERVIEW', after_speech: true },
      GREETING,
    ],
  },
  'navigate-keep-open': {
    afterAudioReady: [GREETING, { type: 'orb_directive', directive: 'navigate', route: '/calendar', screen_id: 'CALENDAR.OVERVIEW', keep_orb_open: true }],
  },
  'navigate-overlay': {
    afterAudioReady: [GREETING, { type: 'orb_directive', directive: 'navigate', route: '/home', screen_id: 'LIFE_COMPASS.OVERLAY', entry_kind: 'overlay' }],
  },
  'session-ended': { endAfterMs: 1500 },
  'transport-failure': { transportFailure: true, transport: 'ws' },
  'reject-start': { rejectStart: { code: 'AUTH_TOKEN_INVALID' } },
};

function isPrivateIPv4(a) {
  const p = a.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return p[0] === 10 || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168);
}

/** Loopback or a private range only. */
function isAllowedBindHost(host) {
  if (host === '127.0.0.1' || host === '::1' || host === 'localhost') return true;
  return isPrivateIPv4(host);
}

function firstLanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal && isPrivateIPv4(a.address)) return a.address;
    }
  }
  return null;
}

function decodeBytes(b64) {
  if (typeof b64 !== 'string') return { bytes: 0, silent: true };
  const buf = Buffer.from(b64, 'base64');
  let silent = true;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) {
      silent = false;
      break;
    }
  }
  return { bytes: buf.length, silent };
}

function createFakeGateway(options = {}) {
  let scenario = { ...DEFAULT_SCENARIO, ...(options.scenario || {}) };
  const host = options.host || '127.0.0.1';
  if (!isAllowedBindHost(host)) {
    throw new Error(`orb-fake-gateway refuses to bind to ${host}: loopback or a private LAN address only`);
  }
  const outFile = options.outFile || null;
  const frames = [];
  const requests = [];
  const sessions = new Map();
  let seq = 0;
  const timers = new Set();

  function later(fn, ms) {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  }

  function record(entry) {
    const e = { at: Date.now(), ...entry };
    frames.push(e);
    if (outFile) fs.appendFileSync(outFile, JSON.stringify(e) + '\n');
  }

  function recordClient(via, sessionId, msg) {
    if (msg && msg.type === 'audio') {
      record({ via, session: sessionId, type: 'audio', mime: msg.mime, ...decodeBytes(msg.data_b64) });
    } else {
      record({ via, session: sessionId, type: msg && msg.type, msg });
    }
  }

  function push(session, msg) {
    if (session.closed) return;
    if (session.ws) {
      if (session.ws.readyState === WebSocket.OPEN) session.ws.send(JSON.stringify(msg));
    } else if (session.res) {
      session.res.write(`data: ${JSON.stringify(msg)}\n\n`);
    } else {
      session.backlog.push(msg);
    }
  }

  async function runScript(session) {
    for (const step of scenario.afterAudioReady || []) {
      if (session.closed) return;
      if (step && step.waitMs) {
        await new Promise((r) => later(r, step.waitMs));
      } else if (step && step.greeting) {
        for (const rate of step.greeting.rates) {
          for (const b64 of toneChunks(rate, step.greeting.ms, step.greeting.chunkMs)) {
            push(session, { type: 'audio', data_b64: b64, mime: `audio/pcm;rate=${rate}` });
          }
        }
        push(session, { type: 'turn_complete' });
      } else if (step) {
        push(session, step);
      }
    }
    if (scenario.endAfterMs != null) later(() => push(session, { type: 'session_ended', reason: 'scripted' }), scenario.endAfterMs);
  }

  function onAudioReady(session) {
    if (session.audioReady) return;
    session.audioReady = true;
    void runScript(session);
  }

  function onClientMessage(session, msg) {
    recordClient(session.ws ? 'ws' : 'sse', session.id, msg);
    switch (msg && msg.type) {
      case 'interrupt':
        if (scenario.interruptReply) push(session, { type: 'interrupted' });
        break;
      case 'audio_ready':
        onAudioReady(session);
        break;
      case 'ping':
        push(session, { type: 'pong', timestamp: Date.now() });
        break;
      case 'stop':
        session.closed = true;
        break;
      default:
        break;
    }
  }

  function newSession(extra) {
    const id = `fake-${++seq}`;
    const session = { id, ws: null, res: null, backlog: [], closed: false, audioReady: false, ...extra };
    sessions.set(id, session);
    return session;
  }

  function json(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  }

  function readBody(req) {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => resolve(data));
    });
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://fake.local');
    requests.push({ method: req.method, path: url.pathname, url: req.url, authorization: req.headers.authorization || null });
    if (req.method === 'GET' && url.pathname === ROUTES.transport) {
      if (!scenario.transport) return json(res, 500, { ok: false });
      return json(res, 200, { ok: true, transport: scenario.transport });
    }
    if (req.method === 'GET' && url.pathname === ROUTES.authMe) {
      return json(res, scenario.authMeStatus, scenario.authMeStatus === 200 ? { ok: true } : { ok: false });
    }
    if (req.method === 'POST' && url.pathname === ROUTES.start) {
      const body = JSON.parse((await readBody(req)) || '{}');
      record({ via: 'sse', type: 'start', msg: body });
      if (scenario.rejectStart) return json(res, 200, { ok: false, error: scenario.rejectStart.code });
      const session = newSession({ start: body });
      return json(res, 200, {
        ok: true,
        session_id: session.id,
        conversation_id: `conv-${session.id}`,
        playback_lead_first_only: scenario.playbackLeadFirstOnly,
      });
    }
    if (req.method === 'GET' && url.pathname === ROUTES.stream) {
      const session = sessions.get(url.searchParams.get('session_id') || '');
      if (!session) return json(res, 404, { ok: false });
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      session.res = res;
      req.on('close', () => {
        session.closed = true;
      });
      push(session, { type: 'ready' });
      push(session, { type: 'live_api_ready', full_duplex: scenario.fullDuplex });
      for (const m of session.backlog.splice(0)) push(session, m);
      return undefined;
    }
    if (req.method === 'POST' && url.pathname === ROUTES.send) {
      const session = sessions.get(url.searchParams.get('session_id') || '');
      const body = JSON.parse((await readBody(req)) || '{}');
      if (!session) return json(res, 404, { ok: false });
      onClientMessage(session, body);
      return json(res, 200, { ok: true });
    }
    const ar = ROUTES.audioReady.exec(url.pathname);
    if (req.method === 'POST' && ar) {
      const session = sessions.get(decodeURIComponent(ar[1]));
      await readBody(req);
      if (!session) return json(res, 404, { ok: false });
      record({ via: 'sse', session: session.id, type: 'audio_ready' });
      onAudioReady(session);
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === ROUTES.stop) {
      const body = JSON.parse((await readBody(req)) || '{}');
      record({ via: 'sse', session: body.session_id, type: 'stop' });
      const session = sessions.get(body.session_id);
      if (session) {
        session.closed = true;
        try {
          session.res && session.res.end();
        } catch {
          /* noop */
        }
      }
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { ok: false, error: 'not in the fake gateway' });
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://fake.local');
    requests.push({ method: 'UPGRADE', path: url.pathname, url: req.url, authorization: req.headers.authorization || null });
    if (url.pathname !== ROUTES.ws || scenario.transportFailure) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const session = newSession({ ws });
      if (!scenario.silentHandshake) ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
      ws.on('message', (data) => {
        let msg;
        try {
          msg = JSON.parse(String(data));
        } catch {
          return;
        }
        if (msg.type === 'start') {
          record({ via: 'ws', session: session.id, type: 'start', msg });
          if (scenario.rejectStart) {
            ws.send(JSON.stringify({ type: 'error', code: scenario.rejectStart.code, message: 'rejected by scenario' }));
            return;
          }
          ws.send(
            JSON.stringify({
              type: 'session_started',
              session_id: session.id,
              live_api_connected: true,
              full_duplex: scenario.fullDuplex,
              playback_lead_first_only: scenario.playbackLeadFirstOnly,
              conversation_id: `conv-${session.id}`,
            }),
          );
          return;
        }
        onClientMessage(session, msg);
      });
      ws.on('close', () => {
        session.closed = true;
      });
    });
  });

  let address = null;

  return {
    frames,
    requests,
    sessions,
    setScenario(patch) {
      scenario = { ...scenario, ...patch };
    },
    /** Sends a message to every open session (tests). */
    broadcast(msg) {
      for (const s of sessions.values()) push(s, msg);
    },
    start(port = 0) {
      if (outFile) {
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        fs.writeFileSync(outFile, '');
      }
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          address = server.address();
          resolve({ host, port: address.port, url: `http://${host.includes(':') ? `[${host}]` : host}:${address.port}` });
        });
      });
    },
    stop() {
      for (const t of timers) clearTimeout(t);
      timers.clear();
      for (const s of sessions.values()) {
        s.closed = true;
        try {
          s.ws && s.ws.terminate();
        } catch {
          /* noop */
        }
        try {
          s.res && s.res.end();
        } catch {
          /* noop */
        }
      }
      return new Promise((resolve) => {
        wss.close(() => server.close(() => resolve()));
        if (server.closeAllConnections) server.closeAllConnections();
      });
    },
  };
}

module.exports = { createFakeGateway, SCENARIOS, DEFAULT_SCENARIO, GREETING, isAllowedBindHost, firstLanAddress, WebSocket };
