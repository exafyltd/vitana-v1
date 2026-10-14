#!/usr/bin/env node
// VTID-05179 — run the fake ORB gateway for a dev-profile device build (plan Change 7).
//
//   node tools/orb-fake-gateway/cli.js [--scenario <name>|<file.json>] [--port 8787] [--lan] [--out <file>]
//
// Point a `development` build at it with EXPO_PUBLIC_GATEWAY_URL=http://<printed address>.
// Every received client frame goes to out/frames.jsonl (gitignored) for the device checklist.
// Binds to 127.0.0.1 unless --lan (a private-range interface); never a public address.
'use strict';

const fs = require('fs');
const path = require('path');
const { createFakeGateway, SCENARIOS, firstLanAddress } = require('./server');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const scenarioArg = arg('scenario') || 'full-duplex';
let scenario;
if (SCENARIOS[scenarioArg]) scenario = SCENARIOS[scenarioArg];
else if (fs.existsSync(scenarioArg)) scenario = JSON.parse(fs.readFileSync(scenarioArg, 'utf8'));
else {
  console.error(`Unknown scenario "${scenarioArg}". Named scenarios: ${Object.keys(SCENARIOS).join(', ')}`);
  process.exit(2);
}

let host = '127.0.0.1';
if (process.argv.includes('--lan')) {
  host = firstLanAddress();
  if (!host) {
    console.error('--lan: no private-range IPv4 interface found');
    process.exit(2);
  }
}

const outFile = path.resolve(arg('out') || path.join(__dirname, 'out', 'frames.jsonl'));
const gw = createFakeGateway({ host, scenario, outFile });
gw.start(Number(arg('port') || 8787)).then(({ url }) => {
  console.log(`orb-fake-gateway (${scenarioArg}) listening on ${url}`);
  console.log(`recording client frames to ${outFile}`);
});
process.on('SIGINT', () => gw.stop().then(() => process.exit(0)));
