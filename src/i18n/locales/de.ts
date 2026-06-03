// One async chunk for the entire German catalog. The eager glob here is
// scoped to this module, so Rollup bundles all de/*.json shards into a single
// chunk that is only fetched when loadLocale('de-DE') dynamically imports it —
// keeping ~2.9 MB of JSON out of the entry bundle and off the first-paint path.
const modules = import.meta.glob('../de/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

const out: Record<string, unknown> = {};
for (const path of Object.keys(modules).sort()) {
  Object.assign(out, modules[path].default);
}

export default out;
