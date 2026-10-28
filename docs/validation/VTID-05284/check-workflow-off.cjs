// VTID-05284 (i18n-audit-nightly-off/workflow-off): checks T1-T4 against a git revision (blobs only, no checkout).
// Usage: node docs/validation/VTID-05284/check-workflow-off.cjs <rev> [repo]  (exit 1 on any FAIL)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const repo = process.argv[3] || process.cwd();
const rev = process.argv[2];
const show = (p) => execFileSync('git', ['-C', repo, 'show', `${rev}:${p}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
const out = [];
let fails = 0;
const check = (name, ok, detail) => { out.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' -- ' + detail : ''}`); if (!ok) fails++; };
const wf = yaml.load(show('.github/workflows/i18n-audit-llm.yml'));
const on = wf.on || wf[true];
check('T1 workflow triggers are workflow_dispatch only', JSON.stringify(Object.keys(on)) === '["workflow_dispatch"]', JSON.stringify(Object.keys(on)));
check('T1 no audit-nightly job', !('audit-nightly' in wf.jobs), JSON.stringify(Object.keys(wf.jobs)));
check('T1 permissions are contents: write only', JSON.stringify(wf.permissions) === '{"contents":"write"}', JSON.stringify(wf.permissions));
check('T2 provider input default deepseek', on.workflow_dispatch.inputs.provider.default === 'deepseek', on.workflow_dispatch.inputs.provider.default);
check('T2 provider options unchanged', JSON.stringify(on.workflow_dispatch.inputs.provider.options) === '["gemini","anthropic","deepseek"]', JSON.stringify(on.workflow_dispatch.inputs.provider.options));
const md = show('CLAUDE.md');
check('T3 CLAUDE.md audit command uses provider=deepseek', md.includes('gh workflow run i18n-audit-llm.yml -f locale=<code> -f provider=deepseek') && !md.includes('-f provider=gemini'));
check('T3 CLAUDE.md names the Bedrock follow-up', /Bedrock auditor/.test(md));
const js = show('scripts/i18n-audit-llm.mjs');
check("T4 script fallback provider 'deepseek'", js.includes("const PROVIDER = args.provider || 'deepseek';"));
check('T4 usage comment says default deepseek', /default deepseek/.test(js) && !/default gemini/.test(js));
const tmp = path.join(require('os').tmpdir(), 'vtid-05284-i18n-audit-llm.mjs');
fs.writeFileSync(tmp, js);
let syntaxOk = true;
try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); } catch { syntaxOk = false; }
fs.unlinkSync(tmp);
check('T4 node --check scripts/i18n-audit-llm.mjs', syntaxOk);
out.push(`rev ${rev}: ${out.length - fails} passed, ${fails} failed`);
console.log(out.join('\n'));
process.exit(fails ? 1 : 0);
