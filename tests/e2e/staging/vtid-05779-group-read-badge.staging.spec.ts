// VTID-05779 — read-only staging check. Opening a group must refresh the footer
// unread badge. The write (POST /chat/groups/:id/read) is aborted by the staging
// guard, so this spec proves only that the deployed bundle contains the refresh
// path; the clearing behaviour is covered by src/hooks/useChatApi.group-read-notify.test.ts.
import { test, expect } from './staging-guard';

test('the deployed bundle dispatches the badge refresh after a group read', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const bundle = /src="(\/assets\/index-[^"]+\.js)"/.exec(html)?.[1];
  expect(bundle, 'no index bundle referenced by the app shell').toBeTruthy();
  const js = await (await request.get(bundle!)).text();
  expect(js).toContain('chat-unread-count-update');
});
