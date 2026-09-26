/**
 * VTID-04502 — screen registry integrity.
 *
 * The registry is what Vitana's voice navigation knows about the app. These
 * checks keep it complete and honest: unique ids, every language covered,
 * phrasings for every screen a member can reach by voice, and overlays that
 * actually have something listening for them.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { REGISTRY_LOCALES, SCREENS, TRANSLATED_LOCALES, isVoiceTarget, localeTitles } from './index';

const SRC = path.resolve(__dirname, '../..');

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'generated') continue;
      listSourceFiles(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

/** Event names some non-test source file actually listens for. */
function listenedEvents(): Set<string> {
  const events = new Set<string>();
  const constValues = new Map<string, string>();
  const files = listSourceFiles(SRC).map((f) => fs.readFileSync(f, 'utf8'));
  for (const src of files) {
    for (const m of src.matchAll(/(?:export\s+)?const\s+([A-Z0-9_]+)\s*=\s*['"]([^'"]+)['"]/g)) constValues.set(m[1], m[2]);
  }
  for (const src of files) {
    // VTID-04520: overlay-bus listeners (useWindowOverlay) count too.
    for (const m of src.matchAll(/(?:addEventListener|useWindowOverlay(?:<[^>]*>)?)\(\s*(?:['"]([^'"]+)['"]|([A-Z0-9_]+))/g)) {
      if (m[1]) events.add(m[1]);
      else if (m[2] && constValues.has(m[2])) events.add(constValues.get(m[2])!);
    }
  }
  return events;
}

describe('VTID-04502 screen registry — integrity', () => {
  it('has unique ids in the DOMAIN.NAME form', () => {
    const ids = SCREENS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => !/^[A-Z_]+\.[A-Z0-9_]+$/.test(id))).toEqual([]);
  });

  it('never reuses a retired id as a live screen', () => {
    const live = new Set(SCREENS.map((s) => s.id));
    const clashes = SCREENS.flatMap((s) => (s.formerIds || []).filter((f) => live.has(f)));
    expect(clashes).toEqual([]);
  });

  it('gives every screen an English and German title and description', () => {
    const missing = SCREENS.flatMap((s) =>
      (['en', 'de'] as const).flatMap((l) =>
        [!s.i18n[l]?.title && `${s.id} ${l}.title`, !s.i18n[l]?.shows && `${s.id} ${l}.shows`].filter(Boolean),
      ),
    );
    expect(missing).toEqual([]);
  });

  it('gives every screen a title in every translated language', () => {
    const missing = TRANSLATED_LOCALES.flatMap((l) => {
      const titles = localeTitles(l);
      return SCREENS.filter((s) => !titles[s.id]?.title?.trim()).map((s) => `${l}:${s.id}`);
    });
    expect(missing).toEqual([]);
    expect(REGISTRY_LOCALES).toHaveLength(11);
  });

  it('has no locale entries for screens that do not exist', () => {
    const live = new Set(SCREENS.map((s) => s.id));
    const orphans = TRANSLATED_LOCALES.flatMap((l) => Object.keys(localeTitles(l)).filter((id) => !live.has(id)).map((id) => `${l}:${id}`));
    expect(orphans).toEqual([]);
  });

  it('gives every voice-reachable screen at least 2 English and 2 German phrasings', () => {
    const thin = SCREENS.filter(isVoiceTarget).flatMap((s) =>
      (['en', 'de'] as const).filter((l) => (s.i18n[l].phrasings || []).length < 2).map((l) => `${s.id} ${l}`),
    );
    expect(thin).toEqual([]);
  });

  it('gives every voice-reachable screen at least 2 phrasings in every translated language', () => {
    const thin = TRANSLATED_LOCALES.flatMap((l) => {
      const loc = localeTitles(l);
      return SCREENS.filter(isVoiceTarget)
        .filter((s) => (loc[s.id]?.phrasings || []).filter((p) => p.trim()).length < 2)
        .map((s) => `${l}:${s.id}`);
    });
    expect(thin).toEqual([]);
  });

  it('does not give the same phrasing to two screens', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    const phrasingsOf = (s: (typeof SCREENS)[number], l: string): string[] =>
      l === 'en' || l === 'de'
        ? s.i18n[l].phrasings || []
        : localeTitles(l as (typeof TRANSLATED_LOCALES)[number])[s.id]?.phrasings || [];
    for (const s of SCREENS) {
      for (const l of REGISTRY_LOCALES) {
        for (const p of phrasingsOf(s, l)) {
          const key = `${l}:${p.toLowerCase().trim()}`;
          if (seen.has(key) && seen.get(key) !== s.id) dupes.push(`${key} → ${seen.get(key)} & ${s.id}`);
          seen.set(key, s.id);
        }
      }
    }
    expect(dupes).toEqual([]);
  });

  it('declares every route param it uses', () => {
    const bad = SCREENS.filter((s) => {
      const used = [...`${s.route} ${s.mobileRoute || ''}`.matchAll(/:([A-Za-z_]+)/g)].map((m) => m[1]);
      return used.some((p) => !(s.params || []).includes(p));
    }).map((s) => s.id);
    expect(bad).toEqual([]);
  });

  it('only registers overlays the app listens for, unless marked disabled with a reason', () => {
    const listened = listenedEvents();
    const unheard = SCREENS.filter((s) => s.overlay && !s.disabled && !listened.has(s.overlay.event)).map(
      (s) => `${s.id} (${s.overlay!.event})`,
    );
    expect(unheard).toEqual([]);
  });

  it('keeps disabled screens honest: a reason, and still broken', () => {
    const listened = listenedEvents();
    const stale = SCREENS.filter((s) => s.disabled && s.overlay && listened.has(s.overlay.event)).map((s) => s.id);
    // A disabled overlay whose listener now exists should be re-enabled.
    expect(stale).toEqual([]);
    expect(SCREENS.filter((s) => s.disabled !== undefined && !s.disabled.trim()).map((s) => s.id)).toEqual([]);
  });
});
