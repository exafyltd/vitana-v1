#!/usr/bin/env node
// VTID-05250 — run the fixture gateway for a dev-profile device build.
//
//   node tools/fixture-gateway/cli.js [--port 8788] [--lan] [--unauthenticated]
//
// Point a `development` build at it with EXPO_PUBLIC_GATEWAY_URL=http://<printed address>.
// Binds to 127.0.0.1 unless --lan (a private-range interface); never a public address.
// --unauthenticated makes GET /api/v1/auth/me answer 401 (the signed-out scenario).
'use strict';

const { createFixtureGateway, firstLanAddress } = require('./server');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

let host = '127.0.0.1';
if (process.argv.includes('--lan')) {
  host = firstLanAddress();
  if (!host) {
    console.error('--lan: no private-range IPv4 interface found');
    process.exit(2);
  }
}

const scenario = process.argv.includes('--unauthenticated') ? { authMeStatus: 401 } : {};
const gw = createFixtureGateway({ host, scenario });
gw.start(Number(arg('port') || 8788)).then(({ url }) => {
  console.log(`fixture-gateway listening on ${url}`);
  console.log('routes: /api/v1/app-config, /api/v1/auth/me, /api/v1/notifications/token, /.well-known/{apple-app-site-association,assetlinks.json}');
});
process.on('SIGINT', () => gw.stop().then(() => process.exit(0)));
