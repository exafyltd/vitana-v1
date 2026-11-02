/**
 * VTID-05428 (Native Wave 2, delete-account lane) — the account-deletion
 * request of the web `src/pages/legal/DeleteAccount.tsx`
 * (`supabase.functions.invoke("request-account-deletion", { body: {} })`),
 * re-implemented natively on the app's own Supabase client (class B: it needs
 * the client, so it is not a core module).
 *
 * The client is passed in, so the unit tests hand it a double with a mocked
 * `functions.invoke` and assert the built request; no test ever sends it
 * (requirements R5.1/R5.2).
 */

export const ACCOUNT_DELETION_FUNCTION = 'request-account-deletion';

/** The exact request the web sends: the edge function name and an empty JSON body. */
export function buildAccountDeletionRequest(): { name: string; options: { body: Record<string, never> } } {
  return { name: ACCOUNT_DELETION_FUNCTION, options: { body: {} } };
}

/** The web's typed check: `confirmText.trim().toUpperCase() === "DELETE"`. */
export function isDeleteConfirmed(text: string): boolean {
  return text.trim().toUpperCase() === 'DELETE';
}

type FunctionsClient = {
  functions: {
    invoke: (name: string, options: { body: Record<string, never> }) => Promise<{ data: unknown; error: { message?: string } | null }>;
  };
};

/**
 * `message` is the server's own text when it sent one (the web shows it as
 * is); null means the screen shows the catalog fallback.
 */
export type AccountDeletionResult = { ok: true } | { ok: false; message: string | null };

export async function requestAccountDeletion(client: FunctionsClient): Promise<AccountDeletionResult> {
  const req = buildAccountDeletionRequest();
  try {
    const { data, error } = await client.functions.invoke(req.name, req.options);
    if (error) return { ok: false, message: error.message || null };
    const body = (data ?? null) as { ok?: boolean; error?: string } | null;
    if (!body?.ok) return { ok: false, message: body?.error || null };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error && e.message ? e.message : null };
  }
}
