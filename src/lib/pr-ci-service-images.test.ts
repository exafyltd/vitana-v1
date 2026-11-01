/**
 * VTID-05415 (ci-dockerhub-mirror) — PR CI service/container images must not come from the
 * anonymous, data-capped ECR Public mirror.
 *
 * On 2026-10-31 pr-gate failed at "Initialize containers": `docker pull
 * public.ecr.aws/docker/library/postgres:16` → "Data limit exceeded" (run 41200356754). GitHub-hosted
 * runners are exempt from Docker Hub pull limits, so PR CI pulls the official image from Docker Hub.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const WF = join(ROOT, '.github/workflows');

type Found = { file: string; line: number; image: string };

function triggersOnPullRequest(src: string): boolean {
  const lines = src.split('\n');
  const start = lines.findIndex((l) => /^(on|'on'|"on"):/.test(l));
  if (start < 0) return false;
  if (/pull_request/.test(lines[start])) return true;
  for (let i = start + 1; i < lines.length && /^(\s|$)/.test(lines[i]); i++) {
    if (/^\s+pull_request(_target)?\s*:?\s*$/.test(lines[i]) || /^\s+-\s*pull_request/.test(lines[i])) return true;
  }
  return false;
}

/** Every `image:` under a `services:` or `container:` key, plus the one-line `container: <image>` form. */
function serviceImages(file: string, src: string): Found[] {
  const out: Found[] = [];
  const lines = src.split('\n');
  const indent = (l: string) => l.length - l.trimStart().length;
  let block: number | null = null; // indentation of the open services:/container: key
  lines.forEach((l, i) => {
    if (!l.trim() || l.trim().startsWith('#')) return;
    if (block !== null && indent(l) <= block) block = null;
    const inline = l.match(/^\s*container:\s*['"]?([^'"\s#{][^'"\s#]*)['"]?\s*$/);
    if (inline) { out.push({ file, line: i + 1, image: inline[1] }); return; }
    if (/^\s*(services|container):\s*$/.test(l)) { block = indent(l); return; }
    const img = l.match(/^\s*image:\s*['"]?([^'"\s#]+)['"]?/);
    if (block !== null && img) out.push({ file, line: i + 1, image: img[1] });
  });
  return out;
}

const images: Found[] = readdirSync(WF)
  .filter((f) => /\.ya?ml$/.test(f))
  .flatMap((f) => {
    const src = readFileSync(join(WF, f), 'utf8').replace(/\r\n/g, '\n');
    return triggersOnPullRequest(src) ? serviceImages(f, src) : [];
  });

describe('VTID-05415: PR CI service images avoid the capped ECR Public mirror', () => {
  it('finds the PR CI service images (an empty scan cannot pass)', () => {
    expect(images.length).toBeGreaterThanOrEqual(5);
    expect(images.some((x) => x.file === 'PR-GATE.yml')).toBe(true);
  });

  it('no PR CI service/container image is pulled from public.ecr.aws', () => {
    const bad = images.filter((x) => x.image.startsWith('public.ecr.aws/')).map((x) => `${x.file}:${x.line} ${x.image}`);
    expect(bad).toEqual([]);
  });

  it('every PR CI service/container image pins an explicit tag (not latest)', () => {
    const bad = images
      .filter((x) => {
        const tag = x.image.split('/').pop()!.split(':')[1];
        return !tag || tag === 'latest';
      })
      .map((x) => `${x.file}:${x.line} ${x.image}`);
    expect(bad).toEqual([]);
  });
});
