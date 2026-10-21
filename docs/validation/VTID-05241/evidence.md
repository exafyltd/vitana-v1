# VTID-05241 — mt-frontend-brand/adminfetch-header evidence

Base: vitana-v1 `origin/main` 69d39ef344b578f1ff171e99c61295f51c4e1f50 (checks below), then fast-forwarded to
cc19942b019472380ad51b4212187b0b047dc9f3 before commit (no change to `src/lib/admin-api*` in between).

## Premise re-check (AF1, plan Problem 2) — both hold
- `src/lib/admin-api.ts:7` (base) JSDoc claimed it injects `X-Vitana-Tenant` / `X-Vitana-Active-Role`;
  the fetch (`:35-42`) sent only `Content-Type` + `Authorization`.
- Gateway CORS already allows both headers: `services/gateway/src/middleware/cors.ts` `allowedHeaders`
  (vitana-platform origin/main b7413548).

## Design (decisions taken)
- Tenant: `ctx.tenantId` if the caller passes one, else `session.user.app_metadata.active_tenant_id` — the
  same claim `useTenant.tsx:55` and `coach-chat-api.ts:44` read. Absent when neither is set.
- Role: the active role lives only in React state (`useRole` → `get_role_preference` RPC); nothing a plain
  function can read. So `X-Vitana-Active-Role` is sent only when a caller passes `ctx.role` (same pattern as
  `calendar-window-client.ts` `authedFetch(path, role)`). No caller is changed in this lane (paths), so today
  the role header is never sent — no behaviour change for any existing call without a role.
- `init.headers` still win over the injected headers; `Authorization` unchanged.
- Pre-existing `Promise<any>` return kept (callers rely on it), with an `eslint-disable-next-line` reason.

## Commands and results (Windows, local worktree)
| Check | Base (69d39ef) | Head |
|---|---|---|
| `npx vitest run src/lib/admin-api.test.ts` | 4 failed / 3 passed (7) | 7 passed (7) |
| `npx eslint src/lib/admin-api.ts src/lib/admin-api.test.ts` | 1 error (`no-explicit-any`, pre-existing line) | clean |
| `npx tsc --noEmit -p tsconfig.app.json` | — | 177 pre-existing errors, none in `admin-api*` |
| `npx vitest run` (full) | the same failing files, run on base | 3549 tests; failures = same set as base (local Windows env) |

Full-suite note: locally 30 files fail on head; re-running those files on base gives the same set
(`personal-memory-edge.test.ts` and one `registry.test.ts` case differed and pass in isolation on head:
16/16 — parallel-run timeouts). CI on main has one pre-existing red
(`ConversationView.deeplink-scroll.vtid-05201`, date-dependent; see the driver's preexisting.md).
No i18n strings, routes, screens or design tokens changed (no inventory/manifest/registry/parity work).
