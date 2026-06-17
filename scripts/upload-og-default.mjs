#!/usr/bin/env node
/**
 * Upload the branded default Open Graph image to Supabase storage.
 *
 * Why this exists: the WhatsApp/Telegram/Facebook link-preview pipeline
 * (Cloudflare worker `vitanaland-og-proxy` + the `og-*` edge functions) falls
 * back to `covers/vitana-og-default.jpg` whenever a shared item has no image of
 * its own. Profiles with no avatar hit this constantly, so when that object is
 * missing the preview renders with NO image. This script restores it from the
 * version-controlled asset in `public/brand/` so it can never silently vanish
 * again.
 *
 * Usage:
 *   SUPABASE_URL=https://inmkhvwdcuyhnxkgfvsb.supabase.co \
 *   SUPABASE_SERVICE_ROLE=<service-role-key> \
 *   node scripts/upload-og-default.mjs
 *
 * Idempotent (upsert). No deploy required — storage is live immediately.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE) {
  console.error('ERROR: set SUPABASE_SERVICE_ROLE (service-role key) in the environment.');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetPath = join(__dirname, '..', 'public', 'brand', 'vitana-og-default.jpg');
const bytes = readFileSync(assetPath);

const BUCKET = 'covers';
const OBJECT = 'vitana-og-default.jpg';
const target = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${OBJECT}`;

const resp = await fetch(target, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${SERVICE_ROLE}`,
    'Content-Type': 'image/jpeg',
    'x-upsert': 'true',
    'cache-control': 'public, max-age=31536000',
  },
  body: bytes,
});

const body = await resp.text();
if (!resp.ok) {
  console.error(`Upload failed (${resp.status}): ${body}`);
  process.exit(1);
}
console.log(`Uploaded ${bytes.length} bytes → ${BUCKET}/${OBJECT}`);
console.log(`Public URL: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${OBJECT}`);
console.log(body);
