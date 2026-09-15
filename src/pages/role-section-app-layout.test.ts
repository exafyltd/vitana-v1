/**
 * VTID-03909 — Patient/Professional/Staff dashboards never wrapped
 * themselves in `<AppLayout>`, unlike every other role section (Community,
 * Admin, BackOffice). That meant no sidebar, no avatar/role-switcher, no way
 * to reach Settings — a dead end reported live as "I am stuck in the
 * patient user role screen... I have no way to get out."
 *
 * A regression here is easy to reintroduce one page at a time (a new
 * dashboard copy-pasted from an old one, an inline placeholder route added
 * without the wrapper a real component would have had), so this is a
 * tree-wide guard rather than a test pinned to the specific files fixed —
 * matching the pattern `gateway-tts.test.ts` already uses for the same
 * "the fix covered known call sites, not the invariant" failure mode.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

function listTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listTsxFiles(full));
      continue;
    }
    if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) out.push(full);
  }
  return out;
}

describe('every Patient/Professional/Staff page wraps AppLayout', () => {
  it('has no page file missing the AppLayout shell', () => {
    const roots = ['src/pages/patient', 'src/pages/professional', 'src/pages/staff'];
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of listTsxFiles(root)) {
        const src = readFileSync(file, 'utf8');
        if (!src.includes('AppLayout')) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('actually found the known page files — a guard that scans nothing passes forever', () => {
    const roots = ['src/pages/patient', 'src/pages/professional', 'src/pages/staff'];
    const files = roots.flatMap(listTsxFiles);
    // Dashboard/Health/Appointments (patient), Dashboard/Patients (professional),
    // Dashboard/Queue (staff), at minimum.
    expect(files.length).toBeGreaterThanOrEqual(7);
  });
});

describe('every /patient, /professional, /staff route in App.tsx renders inside AppLayout', () => {
  it('has no inline placeholder route left unwrapped', () => {
    // A route that renders a dedicated component (e.g. <PatientDashboard />)
    // is covered by the page-file guard above instead — that component wraps
    // AppLayout itself, so it never appears as a raw <div> here. This test
    // only needs to catch the OTHER shape: a placeholder inlined directly
    // into the route (App.tsx historically had 15 of these).
    const src = readFileSync('src/App.tsx', 'utf8');
    const routeBlockRe = /<Route path="\/(patient|professional|staff)\/[a-z-]+" element=\{([\s\S]*?)\}\s*\/>/g;
    const offenders: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = routeBlockRe.exec(src))) {
      const [, , block] = match;
      if (block.includes('<div') && !block.includes('AppLayout')) offenders.push(match[0].split('\n')[0]);
    }
    expect(offenders).toEqual([]);
  });

  it('actually matched a non-trivial number of routes — a guard whose regex stopped matching passes forever', () => {
    const src = readFileSync('src/App.tsx', 'utf8');
    const routeBlockRe = /<Route path="\/(patient|professional|staff)\/[a-z-]+" element=\{([\s\S]*?)\}\s*\/>/g;
    let count = 0;
    while (routeBlockRe.exec(src)) count++;
    // 9 patient + 9 professional + 9 staff routes as of this writing.
    expect(count).toBeGreaterThanOrEqual(20);
  });
});
