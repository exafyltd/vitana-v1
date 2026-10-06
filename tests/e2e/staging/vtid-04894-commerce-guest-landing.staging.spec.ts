// VTID-04894 — the pre-login Commerce landing tells the story.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write,
// and this spec never signs in. A guest on /commerce sees why Vitanaland, the
// one-step MCP connection (staging serves /mcp), the getting-started steps and
// a closing call to join. Checked by structure, plus "MCP" (the same in every
// UI language); the MCP address itself is never shown to a guest.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

test('a signed-out visitor gets the story, the one-step MCP connection and the steps', async ({ page }) => {
  await page.goto('/commerce', { waitUntil: 'domcontentloaded' });

  const heading = page.locator('main h1, h1').first();
  await expect(heading).toBeVisible({ timeout: 30_000 });
  // The hero still has exactly one call to action.
  await expect(heading.locator('xpath=ancestor::section[1]').getByRole('button')).toHaveCount(1);

  const landing = page.getByTestId('commerce-guest-landing');
  await expect(landing.getByTestId('guest-why').locator('li')).toHaveCount(3);

  // Staging serves /mcp, so the one-step section is there and names MCP.
  const oneStep = landing.getByTestId('guest-one-step');
  await expect(oneStep).toBeVisible({ timeout: 15_000 });
  await expect(oneStep).toContainText('MCP');
  await expect(oneStep.getByTestId('guest-flow').locator('li')).toHaveCount(4);

  // "What is MCP?" starts collapsed and opens on tap.
  const whatIs = oneStep.getByTestId('guest-what-is-mcp');
  await expect(whatIs).toHaveAttribute('aria-expanded', 'false');
  await expect(oneStep.getByTestId('guest-what-is-mcp-body')).toHaveCount(0);
  await whatIs.click();
  await expect(whatIs).toHaveAttribute('aria-expanded', 'true');
  await expect(oneStep.getByTestId('guest-what-is-mcp-body')).toBeVisible();

  // The address needs an account: never on the guest page.
  await expect(page.locator('body')).not.toContainText(/https?:\/\/[^\s]+\/mcp\b/);

  // The getting-started steps (this page only) and the closing call to join.
  await expect(landing.locator('ol').filter({ has: page.locator('h3') })).toHaveCount(1);
  const closing = landing.getByTestId('guest-closing');
  await expect(closing.getByRole('button')).toHaveCount(1);
  await closing.getByRole('button').click();
  await expect(page).toHaveURL(/\/commerce\/join\?redirectTo=%2Fcommerce/);
});
