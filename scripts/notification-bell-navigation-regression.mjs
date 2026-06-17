import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(repoRoot, 'src/components/NotificationBell.tsx');
const source = readFileSync(sourcePath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  source.includes('hasSeenUnreadSnapshotRef'),
  'NotificationBell must track whether the initial unread snapshot has hydrated.'
);

assert(
  source.includes('if (!hasSeenUnreadSnapshotRef.current)'),
  'NotificationBell must skip ringing for the initial unread snapshot after mount/remount.'
);

assert(
  source.includes('if (loading) return;'),
  'NotificationBell must wait for notification loading to finish before deciding whether an unread count is new.'
);

const loadingGuardIndex = source.indexOf('if (loading) return;');
const snapshotGuardIndex = source.indexOf('if (!hasSeenUnreadSnapshotRef.current)');
const playIndex = source.indexOf('playNotificationBell();');

assert(
  loadingGuardIndex >= 0 && snapshotGuardIndex > loadingGuardIndex,
  'NotificationBell must check the initial snapshot guard after the loading guard.'
);

assert(
  playIndex > snapshotGuardIndex,
  'NotificationBell must only play after the first loaded unread snapshot has been stored as the baseline.'
);

console.log('[notification-bell-navigation-regression] OK: initial unread hydration does not ring the bell.');
