// eng-platform-p01 / stage-oidc-v1 — vitana-v1 staging and PR-preview workflows take the plan §3 credential shape:
// OIDC through a role variable, the staging static keys only while that variable is unset. AWS-PROD-DEPLOY-FRONTEND.yml
// is out of scope (plan §10). Reads workflow text only.
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const WF = join(__dirname, '../../.github/workflows');
const read = (f: string) => readFileSync(join(WF, f), 'utf8');
const files = readdirSync(WF).filter((f) => /\.ya?ml$/.test(f));

const ROLE_VAR: Record<string, string> = {
  'AWS-STAGE-DEPLOY-FRONTEND.yml': 'AWS_STAGING_ROLE_ARN',
  'PREVIEW-DEPLOY-FRONTEND.yml': 'AWS_PREVIEW_ROLE_ARN',
  'PREVIEW-TEARDOWN-FRONTEND.yml': 'AWS_PREVIEW_ROLE_ARN',
};

function credentialSteps(text: string): string[] {
  const out: string[] = [];
  const re = /uses: aws-actions\/configure-aws-credentials@v\d+\n\s+with:\n((?:\s{10,}.*\n)+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
}

const topPermissions = (text: string) => text.match(/^permissions:\n((?: {2}.*\n|\s*\n)*?)(?=^\S)/m)?.[1] ?? '';

describe('vitana-v1 static staging keys sit behind a role variable', () => {
  it('every static-key workflow except the production deploy is covered', () => {
    const users = files.filter((f) => read(f).includes('secrets.AWS_STAGING_ACCESS_KEY_ID'));
    expect(users.filter((f) => f !== 'AWS-PROD-DEPLOY-FRONTEND.yml').sort()).toEqual(Object.keys(ROLE_VAR).sort());
  });

  for (const [file, v] of Object.entries(ROLE_VAR)) {
    describe(file, () => {
      const text = read(file);

      it('uses the role variable with the key guard in every credential step', () => {
        const steps = credentialSteps(text);
        expect(steps.length).toBeGreaterThan(0);
        for (const s of steps) {
          expect(s).toContain(`role-to-assume: \${{ vars.${v} }}`);
          expect(s).toContain(`aws-access-key-id: \${{ !vars.${v} && secrets.AWS_STAGING_ACCESS_KEY_ID || '' }}`);
          expect(s).toContain(`aws-secret-access-key: \${{ !vars.${v} && secrets.AWS_STAGING_SECRET_ACCESS_KEY || '' }}`);
        }
        expect(text).not.toMatch(/aws-access-key-id: \$\{\{ secrets\.AWS_STAGING_ACCESS_KEY_ID \}\}/);
      });

      it('grants id-token: write at the top level', () => {
        expect(topPermissions(text)).toMatch(/^ {2}id-token: write/m);
      });
    });
  }

  it('the preview deploy accepts the role variable in place of the keys', () => {
    expect(read('PREVIEW-DEPLOY-FRONTEND.yml')).toContain(
      '[ -n "${{ secrets.AWS_STAGING_ACCESS_KEY_ID }}" ] || [ -n "${{ vars.AWS_PREVIEW_ROLE_ARN }}" ] || missing="$missing AWS_STAGING_ACCESS_KEY_ID or AWS_PREVIEW_ROLE_ARN"',
    );
  });

  it('the preview teardown treats the role variable as configured AWS', () => {
    expect(read('PREVIEW-TEARDOWN-FRONTEND.yml')).toContain(
      "HAS_AWS: ${{ secrets.AWS_STAGING_ACCESS_KEY_ID != '' || vars.AWS_PREVIEW_ROLE_ARN != '' }}",
    );
  });

  it('AWS-PROD-DEPLOY-FRONTEND.yml is not changed by this lane', () => {
    expect(read('AWS-PROD-DEPLOY-FRONTEND.yml')).not.toContain('vars.AWS_STAGING_ROLE_ARN');
  });
});
