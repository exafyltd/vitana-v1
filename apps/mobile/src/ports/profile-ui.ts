/**
 * VTID-05429 (Native Wave 2, profile lane) — the N2 kit parts the profile
 * screens render beyond `src/ports/ui.tsx`: `Switch` (the gallery upload's
 * "Visible to everyone", web PhotoUploadDialog). Screen files read kit parts
 * only through a port (tests/ports.test.ts).
 */
export { Switch } from '@vitana/ui';
export type { SwitchProps } from '@vitana/ui';
