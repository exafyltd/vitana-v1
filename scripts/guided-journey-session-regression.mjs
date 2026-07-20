import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exitCode = 1;
  }
}

function hasPattern(source, pattern) {
  return pattern.test(source);
}

const hook = readFileSync('src/hooks/useGuidedJourneyProgress.ts', 'utf8');
const dashboard = readFileSync('src/pages/AutopilotDashboard.tsx', 'utf8');
const catalog = readFileSync('src/components/journey/GuidedJourneyCatalog.tsx', 'utf8');
const journeyPractice = readFileSync('src/lib/journeyPractice.ts', 'utf8');
const dreamHero = readFileSync('src/components/journey/DreamNorthStar.tsx', 'utf8');
const goalHero = readFileSync('src/components/journey/GoalNorthStar.tsx', 'utf8');

assert(
  hook.includes('completedListenedTopicIds'),
  'journey progress reads listened-topic completion from durable state',
);

assert(
  hook.includes('listenedSessionSet') && hook.includes('!listenedSessionSet.has(s.session)'),
  'journey progress derives next session from listened session completion, not practice completion',
);

assert(
  hook.includes('markSessionListenedInJourneyState') &&
    hook.includes('setQueryData<JourneyStateProgress>') &&
    hook.includes('rememberListenedSession'),
  'journey progress exposes an optimistic and browser-persistent session-listened cache update',
);

assert(
  hook.includes('readStoredListenedSessions') &&
    hook.includes('...readStoredListenedSessions(userId)') &&
    !hook.includes('...(state?.completedTopicIds ?? [])'),
  'journey progress persists whole-session listens separately from per-topic practice completion',
);

assert(
  journeyPractice.includes('JSON.stringify({ session, topicId })'),
  'session-listened persistence always sends the session number, even when a topic id is present',
);

assert(
  hasPattern(
    dashboard,
    /markSessionListenedInJourneyState\(\s*queryClient,\s*nextSession\.session,\s*nextSession\.topic\.topicId,\s*user\?\.id,?\s*\)/s,
  ) &&
    dashboard.includes('recordSessionListened(nextSession.session'),
  'hero start action credits the whole session so the next counter advances to session 2',
);

assert(
  catalog.includes('markSessionListenedInJourneyState(queryClient, session, topicId, user?.id)') &&
    catalog.includes('recordListenedSession(s.session, firstTopic.topicId)'),
  'session-list clicks credit the whole session, not only the first topic',
);

assert(
  catalog.includes("t('screens.guidedCatalog.statusDone')") &&
    catalog.includes('CheckCircle2') &&
    catalog.includes('sessionComplete'),
  'completed sessions show a green check and Erledigt status in the list',
);

assert(
  dreamHero.includes('clickHereTop') && dreamHero.includes('numberTop') && dreamHero.includes('captionTop'),
  'mobile hero positions Hier klicken, number, and caption inside the circle without overlap',
);

assert(
  goalHero.includes('topLabelClassName') && goalHero.includes('dayClassName'),
  'desktop guided ring exposes fitted label/number classes for non-overlapping CTA text',
);

// Regression guard for the "0 of 0" flash: the guided hero renders
// independently of `goal` (a user can have a Life Compass goal AND be in
// Guided Mode), so the loading-skeleton gate must treat guided-not-ready as
// its own trigger — not bundled behind a `!goal` requirement that lets any
// user with an existing goal skip the spinner and fall through to zeros.
for (const [name, src] of [['DreamNorthStar', dreamHero], ['GoalNorthStar', goalHero]]) {
  assert(
    hasPattern(src, /const guidedNotReady = guided && \(!guidedProgress \|\| guidedProgress\.totalSessions === 0\);/),
    `${name} derives guidedNotReady independently of the goal-loading state`,
  );
  assert(
    hasPattern(src, /if \(loading && \(guidedNotReady \|\| !goal\)\) \{/),
    `${name}'s loading-skeleton gate triggers on guidedNotReady even when a goal is already set`,
  );
}

if (!process.exitCode) {
  console.log('[guided-journey-session-regression] OK: guided session completion and CTA layout contracts hold.');
}
