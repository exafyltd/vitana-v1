/**
 * VTID-05183 — language picker options, locale presentation (flag + endonym)
 * and the RTL rule, generated from the web source. A `flag` is the asset's repo
 * path; `flagAsset(path)` returns the bundled asset for an <Image source>.
 */
import { ASSETS } from './extracted/assets.generated';

export * from './extracted/language.generated';

/** The bundled asset for a flag path from LOCALE_PRESENTATION, or undefined. */
export function flagAsset(path: string): number | undefined {
  return ASSETS[path];
}
