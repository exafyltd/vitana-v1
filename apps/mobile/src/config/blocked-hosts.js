/**
 * VTID-05157 / VTID-05178 — the hosts a native dev/test build may never reach.
 *
 * Plain CommonJS on purpose: `app.config.ts` is evaluated by the Expo CLI,
 * which transpiles that one file but cannot `require` another TypeScript
 * file. Keeping the list here lets the build-time link-host check
 * (app.config.ts, VTID-05178) and the runtime URL check (env.ts) share one
 * definition. env.ts re-exports everything below; import it from there in app
 * code.
 *
 * Production AND staging hosts are refused: staging frontends and the staging
 * gateway share the production database (CLAUDE.md "Why no host is exempt").
 */

/** Hostnames a native dev/test build may never talk to (exact match). */
const BLOCKED_HOSTS = Object.freeze([
  'vitanaland.com',
  'www.vitanaland.com',
  'gateway.vitanaland.com',
  'inmkhvwdcuyhnxkgfvsb.supabase.co',
]);

/** Staging hosts (preview-aws.vitanaland.com, preview-aws-gateway.vitanaland.com, …). */
const STAGING_HOST = /^preview-aws[a-z0-9-]*\.vitanaland\.com$/;
/** The production Supabase project ref, in any subdomain form. */
const PROD_SUPABASE_REF = /(^|\.)inmkhvwdcuyhnxkgfvsb\./;

/**
 * @param {string} url
 * @returns {string}
 */
function hostnameOf(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL in native config: ${JSON.stringify(url)}`);
  }
  // hostname, not host: a port or a trailing dot must not slip a host past the check.
  return parsed.hostname.toLowerCase().replace(/\.$/, '');
}

/**
 * @param {string} url
 * @returns {boolean}
 */
function isBlockedHost(url) {
  const host = hostnameOf(url);
  return BLOCKED_HOSTS.includes(host) || STAGING_HOST.test(host) || PROD_SUPABASE_REF.test(`${host}.`);
}

module.exports = { BLOCKED_HOSTS, hostnameOf, isBlockedHost };
