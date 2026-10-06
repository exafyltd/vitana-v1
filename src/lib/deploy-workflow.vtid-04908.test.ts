/**
 * VTID-04908 — the production frontend image is tagged with the commit that
 * was actually checked out and built, not GITHUB_SHA.
 *
 * On a pinned dispatch (DEPLOY.yml commit_sha=166b4612…, started from main =
 * 6db3b22d…) the workflow built 166b4612 but tagged the image
 * awsdr-6db3b22d532a, so anyone picking a rollback image by tag would pick
 * the wrong code.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const src = readFileSync(join(ROOT, '.github/workflows/AWS-PROD-DEPLOY-FRONTEND.yml'), 'utf8');
const buildStart = src.indexOf('- name: Build and push image');
const buildEnd = src.indexOf('- name: Register task-definition revision');
const build = src.slice(buildStart, buildEnd);

describe('VTID-04908: production frontend image tag names the built commit', () => {
  it('derives the image tag from the checked-out commit, not GITHUB_SHA', () => {
    const line = build.split('\n').find((l) => l.trim().startsWith('SHORT_SHA='));
    expect(line).toBeDefined();
    expect(line).toContain('git rev-parse --short=12 HEAD');
    expect(line).not.toContain('GITHUB_SHA');
    expect(build).toContain(':awsdr-$SHORT_SHA"');
  });

  it('uses the same expression as VITE_APP_VERSION, so the tag and the live version agree', () => {
    expect(src).toContain('VITE_APP_VERSION=$(git rev-parse --short=12 HEAD)');
  });

  it('builds after checking out the requested commit_sha', () => {
    const checkout = src.indexOf("ref: ${{ inputs.commit_sha != '' && inputs.commit_sha || github.sha }}");
    expect(checkout).toBeGreaterThan(-1);
    expect(checkout).toBeLessThan(buildStart);
  });

  it('refuses to push when the checkout is not the requested commit', () => {
    expect(build).toContain('REQUESTED_SHA: ${{ inputs.commit_sha }}');
    expect(build).toContain("tr '[:upper:]' '[:lower:]'");
    expect(build).toContain("grep -Eq '^[0-9a-f]{7,40}$'");
    const guard = build.indexOf('"$WANT"*) ;;');
    expect(guard).toBeGreaterThan(-1);
    expect(build.slice(guard)).toMatch(/\*\) echo "::error::[^\n]*exit 1 ;;/);
    expect(guard).toBeLessThan(build.indexOf('docker push'));
    expect(build.indexOf('docker push')).toBeGreaterThan(-1);
  });

  it('logs and summarises the built commit next to the dispatch ref', () => {
    expect(build).toContain('echo "Built commit: $BUILT_COMMIT (dispatch ref: $GITHUB_SHA)"');
    expect(build).toContain('echo "built_commit=$BUILT_COMMIT" >> "$GITHUB_OUTPUT"');
    const summary = src.slice(src.indexOf('## AWS Production (DR) frontend deploy'));
    expect(summary).toContain('- Built commit: \\`${{ steps.build.outputs.built_commit }}\\`');
    expect(summary).toContain('- Dispatch ref: \\`$GITHUB_SHA\\`');
  });
});
