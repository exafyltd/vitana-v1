/**
 * VTID-05329 (ci-ecr-public-auth) — every frontend deploy job that builds a
 * Dockerfile whose base image comes from public.ecr.aws logs in to ECR Public
 * first. Anonymous public.ecr.aws pulls from shared GitHub runner IPs hit the
 * data cap ("429 Too Many Requests / Data limit exceeded", run 39681916225,
 * twice: node and nginx). The login is fail-soft (warn + anonymous fallback),
 * so the guard also pins the `else` branch.
 *
 * No yaml parser in this repo: jobs are split by the two-space `  <job-id>:`
 * keys under `jobs:` and steps by the six-space `      - ` list items.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const WF_DIR = join(ROOT, '.github/workflows');
const LOGIN_NEEDLES = ['aws ecr-public get-login-password --region us-east-1', 'docker login', 'public.ecr.aws'];

/** Jobs of a workflow as { id, steps[] } (each step is its raw text). */
function jobsOf(src: string): { id: string; steps: string[] }[] {
  const lines = src.split(/\r?\n/);
  const start = lines.findIndex((l) => /^jobs:\s*$/.test(l));
  if (start < 0) return [];
  const jobs: { id: string; lines: string[] }[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break; // next top-level key
    const m = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (m) jobs.push({ id: m[1], lines: [] });
    else if (jobs.length) jobs[jobs.length - 1].lines.push(line);
  }
  return jobs.map(({ id, lines: body }) => {
    const steps: string[] = [];
    for (const line of body) {
      if (/^ {6}- /.test(line)) steps.push(line);
      else if (steps.length) steps[steps.length - 1] += '\n' + line;
    }
    return { id, steps };
  });
}

/** The Dockerfile a `docker build` line builds: `-f <file>` (relative to the cwd) or `<context>/Dockerfile`. */
function dockerfilesOf(step: string): string[] {
  let cwd = '.';
  const out: string[] = [];
  for (const raw of step.split('\n')) {
    const line = raw.trim();
    const cd = /^cd\s+(\S+)/.exec(line);
    if (cd) cwd = join(cwd, cd[1]);
    const i = line.indexOf('docker build');
    if (i < 0) continue;
    const tokens = line.slice(i).split(/\s+/).filter(Boolean);
    const f = tokens.indexOf('-f');
    out.push(f >= 0 ? join(cwd, tokens[f + 1]) : join(cwd, tokens[tokens.length - 1], 'Dockerfile'));
  }
  return out;
}

function usesEcrPublic(dockerfile: string): boolean {
  const p = join(ROOT, dockerfile);
  if (!existsSync(p)) return false;
  return readFileSync(p, 'utf8').split(/\r?\n/).some((l) => /^\s*FROM\s+(--\S+\s+)*public\.ecr\.aws\//i.test(l));
}

interface Checked { id: string; steps: string[]; firstBuild: number }

function checkedJobs(): Checked[] {
  const files = readdirSync(WF_DIR).filter((f) => /^AWS-.*-DEPLOY-.*\.yml$/.test(f)).sort();
  const out: Checked[] = [];
  for (const file of files) {
    for (const job of jobsOf(readFileSync(join(WF_DIR, file), 'utf8'))) {
      const firstBuild = job.steps.findIndex((s) => s.includes('docker build') && dockerfilesOf(s).some(usesEcrPublic));
      if (firstBuild >= 0) out.push({ id: `${file}:${job.id}`, steps: job.steps, firstBuild });
    }
  }
  return out;
}

describe('VTID-05329: ECR Public login before public.ecr.aws builds', () => {
  const jobs = checkedJobs();

  it('checks both frontend build jobs (the splitter and the glob found them)', () => {
    expect(jobs.map((j) => j.id)).toEqual(expect.arrayContaining([
      'AWS-STAGE-DEPLOY-FRONTEND.yml:build-push-deploy',
      'AWS-PROD-DEPLOY-FRONTEND.yml:build-push-deploy',
    ]));
  });

  it.each(jobs.map((j) => [j.id, j] as const))('%s: fail-soft ECR Public login after credentials, before the build', (_id, job) => {
    const login = job.steps.findIndex((s) => LOGIN_NEEDLES.every((n) => s.includes(n)));
    const creds = job.steps.findIndex((s) => s.includes('aws-actions/configure-aws-credentials'));
    expect({ job: job.id, hasLogin: login >= 0 }).toEqual({ job: job.id, hasLogin: true });
    expect({ job: job.id, loginBeforeBuild: login < job.firstBuild }).toEqual({ job: job.id, loginBeforeBuild: true });
    expect({ job: job.id, loginAfterCreds: creds < 0 || login > creds }).toEqual({ job: job.id, loginAfterCreds: true });
    const step = job.steps[login];
    expect({ job: job.id, failSoft: /\n\s*else\s*\n/.test(step) && step.includes('::warning') }).toEqual({ job: job.id, failSoft: true });
  });
});
