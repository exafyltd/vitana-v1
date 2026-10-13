/**
 * VTID-05107 — the six `design/*` ESLint rules (SPOTLIGHT_RULES.md §C):
 * one valid and one invalid fixture per rule at least, plus the escape hatch
 * (`design-allow-next-line: <reason>` silences, a bare allow is an error).
 */
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../../eslint-rules/design/index.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
});

const PAGE = '/repo/src/pages/Example.tsx';
const ADMIN_PAGE = '/repo/src/pages/admin/Example.tsx';
const COMPONENT = '/repo/src/components/feed/Example.tsx';
const r = plugin.rules;

tester.run('design/no-arbitrary-size', r['no-arbitrary-size'], {
  valid: [
    { code: '<div className="h-10 w-full max-w-stage size-vcard-thumb" />', filename: COMPONENT },
    { code: '<div className="aspect-[4/3]" />', filename: COMPONENT },
    { code: "const x = 'h-[138px]';", filename: COMPONENT }, // not a class string
    { code: '<div\n// design-allow-next-line: fixed-height video controls bar\nclassName="h-[52px]" />', filename: COMPONENT },
  ],
  invalid: [
    { code: '<div className="h-[138px] p-4" />', filename: COMPONENT, errors: 1 },
    { code: '<div className={cn("md:min-h-[280px]", x && "max-w-[600px]")} />', filename: COMPONENT, errors: 2 },
    { code: '<div className={`w-[320px] ${a}`} />', filename: COMPONENT, errors: 1 },
  ],
});

tester.run('design/no-raw-palette', r['no-raw-palette'], {
  valid: [
    { code: '<p className="text-status-success bg-severity-high text-primary bg-pill-sleep-tint from-surface-page-from" />', filename: COMPONENT },
    { code: '<p style={{ color: "hsl(var(--status-error))" }} />', filename: COMPONENT },
    { code: '<p className="text-green" />', filename: COMPONENT },
    { code: '<p className="bg-transparent text-current bg-card text-foreground" />', filename: COMPONENT },
  ],
  invalid: [
    { code: '<p className="text-green-600 hover:bg-red-50/40" />', filename: COMPONENT, errors: 1 },
    { code: '<div className="bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50" />', filename: COMPONENT, errors: 1 },
    { code: '<div className="bg-[#ff0000]" />', filename: COMPONENT, errors: 1 },
    { code: '<div style={{ background: "#18181b", color: "rgb(0,0,0)" }} />', filename: COMPONENT, errors: 2 },
    { code: '<div className={cva("border-slate-200")} />', filename: COMPONENT, errors: 1 },
    { code: '<div className="bg-white text-black/60" />', filename: COMPONENT, errors: 1 },
  ],
});

tester.run('design/no-physical-direction', r['no-physical-direction'], {
  valid: [
    { code: '<div className="ms-2 me-4 ps-3 pe-1 start-0 end-2 text-start rounded-s-lg border-e px-4 mx-auto" />', filename: COMPONENT },
    { code: '<div className="leftover rightly" />', filename: COMPONENT },
  ],
  invalid: [
    { code: '<div className="ml-2 pr-4" />', filename: COMPONENT, errors: 1 },
    { code: '<div className="absolute -right-2 top-0" />', filename: COMPONENT, errors: 1 },
    { code: '<p className="md:text-left" />', filename: COMPONENT, errors: 1 },
    { code: '<div className="rounded-r-2xl border-l" />', filename: COMPONENT, errors: 1 },
  ],
});

tester.run('design/no-page-spinner', r['no-page-spinner'], {
  valid: [
    { code: '<Button><Loader2 className="animate-spin" /> Save</Button>', filename: PAGE },
    { code: '<div><Loader2 /></div>', filename: COMPONENT }, // components are not pages
    { code: '<ArchetypeSkeleton archetype="focus-feed" />', filename: PAGE },
  ],
  invalid: [
    { code: 'function P(){ if (loading) return <div className="py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>; }', filename: PAGE, errors: 1 },
    { code: '<div className="animate-spin rounded-full" />', filename: PAGE, errors: 1 },
  ],
});

tester.run('design/require-screen-frame', r['require-screen-frame'], {
  valid: [
    { code: '<AppLayout><ScreenFrame archetype="detail">x</ScreenFrame></AppLayout>', filename: PAGE },
    { code: '<div>no layout</div>', filename: PAGE },
    { code: '<AppLayout>x</AppLayout>', filename: COMPONENT },
  ],
  invalid: [{ code: 'export default function P(){ return <AppLayout><div>x</div></AppLayout>; }', filename: PAGE, errors: 1 }],
});

tester.run('design/no-raw-content-card', r['no-raw-content-card'], {
  valid: [
    { code: "import { VCard } from '@/components/ui/vcard';", filename: PAGE },
    { code: "import { Card } from '@/components/ui/card';", filename: ADMIN_PAGE },
    { code: "import { Card } from '@/components/ui/card';", filename: COMPONENT },
  ],
  invalid: [{ code: "import { Card, CardContent } from '@/components/ui/card';", filename: PAGE, errors: 1 }],
});

tester.run('design escape hatch', r['no-raw-palette'], {
  valid: [{ code: '<div\n// design-allow-next-line: brand logo colour from partner guidelines\nclassName="text-blue-600" />', filename: COMPONENT }],
  invalid: [
    {
      code: '<div\n// design-allow-next-line\nclassName="text-blue-600" />',
      filename: COMPONENT,
      errors: [{ message: 'design-allow-next-line needs a reason: `// design-allow-next-line: <why>`.' }],
    },
  ],
});
