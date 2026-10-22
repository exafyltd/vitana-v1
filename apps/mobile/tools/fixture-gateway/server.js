// VTID-05250 — a local fixture gateway for the native app's plain-HTTP G1
// endpoints (native G1 wiring). Never shipped in the app.
//
// It answers the four documents a `development` / `test-g1` build fetches over
// plain HTTP, so the app can be exercised without a real gateway (every real
// gateway call reads or writes the shared production systems — CLAUDE.md:
// never test against production):
//   GET  /api/v1/app-config         — per-platform flags + min/recommended
//                                      version; its body is accepted by
//                                      parseAppConfigResponse in
//                                      src/config/remote-config.ts.
//   GET  /api/v1/auth/me            — the signed-in member; the 401 scenario is
//                                      togglable.
//   POST /api/v1/notifications/token — records { token, device_type }.
//   GET  /.well-known/apple-app-site-association — AASA for the .dev iOS id.
//   GET  /.well-known/assetlinks.json            — App Links for the .dev
//                                                   Android id.
//
// This is SEPARATE from tools/orb-fake-gateway (which only speaks the ORB
// WS/SSE voice protocol). It shares that tool's network safety: it binds to
// 127.0.0.1 by default, or a private-range LAN address with { host } / --lan;
// any other bind address is refused. It only listens — it opens no outbound
// connection and proxies nothing.
'use strict';

const http = require('http');
const os = require('os');

// The .dev identifiers from app.config.ts IDENTIFIERS. The fixture serves the
// AASA / assetlinks documents for these, never the store identifiers.
const IDENTIFIERS = {
  ios: 'com.exafy.maxina.dev',
  android: 'com.vitanaland.app.dev',
};
// The Apple Team ID prefix the production AASA uses (public/.well-known).
const APPLE_TEAM_ID = '62Q26QSEJW';
// A placeholder debug-keystore fingerprint for the .dev Android App Links.
// Fixtures never carry a real signing fingerprint; this is a well-formed
// stand-in so the document shape matches assetlinks.json.
const DEV_SHA256_FINGERPRINT =
  'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C';

const ROUTES = {
  appConfig: '/api/v1/app-config',
  authMe: '/api/v1/auth/me',
  notificationsToken: '/api/v1/notifications/token',
  aasa: '/.well-known/apple-app-site-association',
  assetlinks: '/.well-known/assetlinks.json',
};

// A default app-config body that parseAppConfigResponse accepts: ok:true,
// schema_version 1, a block for each platform with a valid min version, and a
// ttl in [30, 86400]. Every known flag is off by default; both are togglable
// through setScenario / createFixtureGateway options.
function defaultScenario() {
  return {
    authMeStatus: 200,
    authMe: { ok: true, user: { id: 'fixture-member', email: 'fixture@example.test' } },
    appConfig: {
      schemaVersion: 1,
      ttlSeconds: 300,
      flags: { push_enabled: false, health_sync_enabled: false, orb_native_enabled: false },
      minSupportedVersion: '0.0.0',
      recommendedVersion: null,
      updateUrl: null,
    },
  };
}

function buildAppConfigBody(cfg) {
  const platform = {
    min_supported_version: cfg.minSupportedVersion,
    recommended_version: cfg.recommendedVersion,
    update_url: cfg.updateUrl,
    flags: cfg.flags,
  };
  return {
    ok: true,
    schema_version: cfg.schemaVersion,
    ttl_seconds: cfg.ttlSeconds,
    platforms: { ios: platform, android: platform },
  };
}

function buildAasa() {
  return {
    applinks: {
      apps: [],
      details: [{ appID: `${APPLE_TEAM_ID}.${IDENTIFIERS.ios}`, paths: ['*'] }],
    },
  };
}

function buildAssetlinks() {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: IDENTIFIERS.android,
        sha256_cert_fingerprints: [DEV_SHA256_FINGERPRINT],
      },
    },
  ];
}

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

function createFixtureGateway(options = {}) {
  let scenario = { ...defaultScenario(), ...(options.scenario || {}) };
  const host = options.host || '127.0.0.1';
  if (!isAllowedBindHost(host)) {
    throw new Error(`fixture-gateway refuses to bind to ${host}: loopback or a private LAN address only`);
  }

  // Every token the app POSTs, for tests / the device checklist.
  const tokens = [];
  const requests = [];

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
    const url = new URL(req.url, 'http://fixture.local');
    requests.push({ method: req.method, path: url.pathname, authorization: req.headers.authorization || null });

    if (req.method === 'GET' && url.pathname === ROUTES.appConfig) {
      return json(res, 200, buildAppConfigBody(scenario.appConfig));
    }

    if (req.method === 'GET' && url.pathname === ROUTES.authMe) {
      if (scenario.authMeStatus !== 200) return json(res, scenario.authMeStatus, { ok: false, error: 'unauthenticated' });
      return json(res, 200, scenario.authMe);
    }

    if (req.method === 'POST' && url.pathname === ROUTES.notificationsToken) {
      let body;
      try {
        body = JSON.parse((await readBody(req)) || '{}');
      } catch {
        return json(res, 400, { ok: false, error: 'invalid json' });
      }
      const token = typeof body.token === 'string' ? body.token : null;
      const deviceType = body.device_type === 'ios' || body.device_type === 'android' ? body.device_type : null;
      if (!token || !deviceType) return json(res, 400, { ok: false, error: 'token and device_type required' });
      const record = { token, device_type: deviceType, at: Date.now() };
      tokens.push(record);
      return json(res, 200, { ok: true, token, device_type: deviceType });
    }

    if (req.method === 'GET' && url.pathname === ROUTES.aasa) {
      return json(res, 200, buildAasa());
    }

    if (req.method === 'GET' && url.pathname === ROUTES.assetlinks) {
      return json(res, 200, buildAssetlinks());
    }

    return json(res, 404, { ok: false, error: 'not in the fixture gateway' });
  });

  let address = null;

  return {
    tokens,
    requests,
    setScenario(patch) {
      scenario = { ...scenario, ...patch };
    },
    start(port = 0) {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          address = server.address();
          resolve({ host, port: address.port, url: `http://${host.includes(':') ? `[${host}]` : host}:${address.port}` });
        });
      });
    },
    stop() {
      return new Promise((resolve) => {
        server.close(() => resolve());
        if (server.closeAllConnections) server.closeAllConnections();
      });
    },
  };
}

module.exports = {
  createFixtureGateway,
  defaultScenario,
  buildAppConfigBody,
  buildAasa,
  buildAssetlinks,
  isAllowedBindHost,
  firstLanAddress,
  IDENTIFIERS,
  ROUTES,
};
