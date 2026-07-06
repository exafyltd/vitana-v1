# News Card Feature Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace “Für dich” and recommendation-reason pills on Vitana News cards with consistent feature badges and align each card’s CTA with the feature it opens.

**Architecture:** Keep the identity contract in `VitanaRecommendationHeader`, backed by a typed feature-to-icon/i18n mapping. Card callers declare their feature explicitly while retaining their existing navigation and backend behavior. A real server-render regression test verifies the shared header; focused source assertions guard caller mappings and CTA keys.

**Tech Stack:** React 18, TypeScript, Lucide React, Tailwind CSS, project JSON i18n catalogs, Node ESM, esbuild, React DOM server rendering.

## Global Constraints

- Left identity is always the 24 px ORB plus `Vitana`; no sparkle follows the wordmark.
- Feature badges use one bright-blue style across all cards and place the icon before the label.
- Feature mappings are exactly `Activity` + `Vitana Index`, `Zap` + `Meine Reise`, and `Users` + `Find a Match` in German.
- German CTAs are exactly `Index ansehen`, `Meine Reise ansehen`, and `Match ansehen`.
- Existing card destinations, dismiss controls, acknowledgements, analytics, and keyboard behavior remain unchanged.

---

### Task 1: Shared feature identity contract

**Files:**
- Create: `scripts/news-card-feature-badges-regression.mjs`
- Modify: `package.json`
- Modify: `src/components/vitana/VitanaRecommendationHeader.tsx`
- Modify: `src/i18n/de/screens.json`
- Modify: `src/i18n/en/screens.json`

**Interfaces:**
- Produces: `VitanaFeature = 'vitana-index' | 'guided-journey' | 'find-a-match'`.
- Produces: `VitanaRecommendationHeader({ feature, className })`.
- Produces i18n keys under `screens.vitanaIdentity`: `vitanaIndex`, `guidedJourney`, `findAMatch`, `viewIndex`, `viewJourney`, and `viewMatch`.

- [ ] **Step 1: Write the failing regression**

Add `npm run test:news-card-features` and a Node ESM script that uses esbuild to bundle an entry importing the real header and locale setter, then renders each feature with `renderToStaticMarkup`. Assert:

```js
const cases = [
  ['vitana-index', 'Vitana Index', 'lucide-activity'],
  ['guided-journey', 'Meine Reise', 'lucide-zap'],
  ['find-a-match', 'Find a Match', 'lucide-users'],
];

for (const [feature, label, iconClass] of cases) {
  const html = renderToStaticMarkup(createElement(VitanaRecommendationHeader, { feature }));
  assert(html.includes(label), `${feature} renders ${label}`);
  assert(html.includes(iconClass), `${feature} renders its navigation icon`);
  assert(html.includes('bg-blue-100') && html.includes('text-blue-700'), `${feature} uses the shared blue badge`);
  assert(!html.includes('lucide-sparkles'), `${feature} omits the old sparkle`);
}
```

- [ ] **Step 2: Verify the regression fails for the missing contract**

Run: `npm run test:news-card-features`

Expected: FAIL because the existing header ignores `feature`, still renders `Sparkles`, and has no feature label/icon configuration.

- [ ] **Step 3: Implement the minimal shared header**

Replace label/reason props with a required `feature` prop. Add this exact mapping inside the header module:

```tsx
export type VitanaFeature = 'vitana-index' | 'guided-journey' | 'find-a-match';

const FEATURE_CONFIG: Record<VitanaFeature, { icon: LucideIcon; labelKey: string }> = {
  'vitana-index': { icon: Activity, labelKey: 'screens.vitanaIdentity.vitanaIndex' },
  'guided-journey': { icon: Zap, labelKey: 'screens.vitanaIdentity.guidedJourney' },
  'find-a-match': { icon: Users, labelKey: 'screens.vitanaIdentity.findAMatch' },
};
```

Render ORB + localized `Vitana` at left and this single badge at right:

```tsx
<span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 flex-shrink-0 whitespace-nowrap">
  <FeatureIcon className="h-3 w-3" aria-hidden="true" />
  {t(featureConfig.labelKey)}
</span>
```

Add the six German and English i18n values specified in the global constraints.

- [ ] **Step 4: Run the regression to verify the shared component passes**

Run: `npm run test:news-card-features`

Expected: header rendering checks pass; caller checks still fail until Task 2.

- [ ] **Step 5: Commit the shared contract**

```bash
git add package.json scripts/news-card-feature-badges-regression.mjs src/components/vitana/VitanaRecommendationHeader.tsx src/i18n/de/screens.json src/i18n/en/screens.json
git commit -m "feat: add Vitana feature identity badges"
```

### Task 2: News card feature assignments and CTAs

**Files:**
- Modify: `src/components/home/WelcomeBackBanner.tsx`
- Modify: `src/components/proactive/DidYouKnowCard.tsx`
- Modify: `src/components/PriorityOfDayBanner.tsx`
- Modify: `src/components/home/NewsFeedItemCard.tsx`
- Modify: `scripts/news-card-feature-badges-regression.mjs`

**Interfaces:**
- Consumes: `VitanaRecommendationHeader({ feature })` from Task 1.
- Consumes: `screens.vitanaIdentity.viewIndex`, `viewJourney`, and `viewMatch`.

- [ ] **Step 1: Add failing caller and CTA assertions**

Read the four caller source files in the regression script and assert these exact contracts:

```js
assert(welcomeSource.includes('feature="vitana-index"'), 'welcome card declares Vitana Index');
assert(welcomeSource.includes("t('screens.vitanaIdentity.viewIndex')"), 'welcome card uses Index ansehen');
assert(dykSource.includes('feature="vitana-index"'), 'did-you-know card declares Vitana Index');
assert(prioritySource.includes('feature="guided-journey"'), 'priority card declares Guided Journey');
assert(prioritySource.includes("t('screens.vitanaIdentity.viewJourney')"), 'priority card uses Meine Reise ansehen');
assert(feedSource.includes('feature="find-a-match"'), 'match cards declare Find a Match');
assert(feedSource.includes('t("screens.vitanaIdentity.viewMatch")'), 'match card uses Match ansehen');
```

- [ ] **Step 2: Run the regression and confirm caller assertions fail**

Run: `npm run test:news-card-features`

Expected: shared-header assertions pass and the old caller API/CTA assertions fail.

- [ ] **Step 3: Update all header callers and action text**

Apply the explicit feature props listed above. Replace the Welcome CTA copy with `viewIndex`. Add an always-visible Journey action line using `viewJourney` and `ArrowRight` inside the existing outer button (no nested interactive element). Replace the match card’s `UserPlus` action with `ArrowRight` and `viewMatch`. Remove the old recommendation-label, reason-pill, and per-card pill-color code that is no longer rendered.

- [ ] **Step 4: Run targeted regressions**

Run:

```bash
npm run test:news-card-features
npm run test:news-feed-ranker
```

Expected: all feature-badge checks and all 22 News-feed ranking checks pass.

- [ ] **Step 5: Commit card integration**

```bash
git add src/components/home/WelcomeBackBanner.tsx src/components/proactive/DidYouKnowCard.tsx src/components/PriorityOfDayBanner.tsx src/components/home/NewsFeedItemCard.tsx scripts/news-card-feature-badges-regression.mjs
git commit -m "feat: label News cards by destination feature"
```

### Task 3: Full verification

**Files:**
- Verify only; no planned production changes.

**Interfaces:**
- Consumes the completed News card feature identity behavior from Tasks 1 and 2.

- [ ] **Step 1: Run the complete targeted test set**

Run:

```bash
npm run test:news-card-features
npm run test:news-feed-ranker
```

Expected: zero failed assertions.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: exit code 0. Existing Vite dynamic-import and chunk-size warnings may remain; no new compilation error is allowed.

- [ ] **Step 3: Review the diff against the approved mapping**

Run:

```bash
git diff main...HEAD --check
git diff main...HEAD -- src/components/vitana/VitanaRecommendationHeader.tsx src/components/home/WelcomeBackBanner.tsx src/components/PriorityOfDayBanner.tsx src/components/home/NewsFeedItemCard.tsx src/i18n/de/screens.json src/i18n/en/screens.json
```

Expected: no whitespace errors and every approved badge/icon/CTA mapping is present without unrelated UI changes.

