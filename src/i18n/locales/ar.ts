// One async chunk for the entire Arabic catalog (see de.ts for the rationale).
const modules = import.meta.glob('../ar/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

const out: Record<string, unknown> = {};
for (const path of Object.keys(modules).sort()) {
  Object.assign(out, modules[path].default);
}

export default out;
