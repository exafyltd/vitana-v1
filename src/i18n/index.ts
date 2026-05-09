// Loads per-namespace shards from src/i18n/<locale>/*.json and composes
// them into a single catalog object that matches the legacy de.json/en.json
// shape. Existing translate('orders.tabs.active') calls keep working.
//
// Vite's import.meta.glob with eager:true bakes shards into the bundle at
// build time — no runtime fetch, no async loading.

const enModules = import.meta.glob('./en/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;
const deModules = import.meta.glob('./de/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;
const arModules = import.meta.glob('./ar/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

function compose(modules: Record<string, { default: Record<string, unknown> }>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const path of Object.keys(modules).sort()) {
    const shard = modules[path].default;
    for (const [key, value] of Object.entries(shard)) {
      out[key] = value;
    }
  }
  return out;
}

export const en = compose(enModules);
export const de = compose(deModules);
export const ar = compose(arModules);

export const catalogs: Record<string, Record<string, unknown>> = {
  'en-US': en,
  'de-DE': de,
  'ar-XA': ar,
};
