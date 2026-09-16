# VTID-03936 — Commerce Partner Onboarding, Phase 2: org registration + admin roster UI

VTID: VTID-03936
Backend: `exafyltd/vitana-platform#3331` (VTID-03932/VTID-03935) — `partner_organizations`/
`partner_organization_members`/`partner_organization_invites` + `/api/v1/partner-orgs/*`. Its migration is **not yet
applied**; CI's `drift` check is red by design until the platform owner runs it, same as noted on that PR.

## What shipped

Extends `CommercePortal.tsx` (`commerce.vitanaland.com`, path-routed at `/commerce`) with the self-service org flow from
the approved plan:

| Piece | File | Calls |
|---|---|---|
| Register-a-business dialog | `src/components/commerce/RegisterOrgDialog.tsx` | `POST /api/v1/partner-orgs/register` |
| "Your organizations" section | `src/pages/CommercePortal.tsx` | `GET /api/v1/partner-orgs/mine` |
| Org card (status badge, role, manage-team affordance) | `src/components/commerce/MyOrgCard.tsx` | — |
| Roster drawer (`?org=<id>`, deep-linkable like the existing `?connection=<id>` drawer) | `src/components/commerce/PartnerOrgRoster.tsx` | `GET /:orgId/members`, `GET /:orgId/invites`, `POST /:orgId/members/invite` |
| React Query hooks for the roster drawer | `src/hooks/useOrgMembers.ts` | (backs the three calls above) |
| Invite-link landing page | `src/pages/CommerceAcceptInvite.tsx`, route `/commerce/invites/:token/accept` | `POST /invites/:token/accept` |

- Register/roster follow the two existing precedents on this page rather than inventing new patterns: plain `useState` +
  `adminFetch` for the page-level flow (matching this page's own header comment: no React Query on the host page), React
  Query + `adminFetch` for the drawer's own hooks (matching `useAdminMembers.ts`'s convention) — same split
  `ConnectionWorkbench.tsx`/`AddProductSheet.tsx` already use elsewhere on this page.
- **Found and fixed a real backend gap while wiring the drawer**: `GET /:orgId/invites` returned every invite field
  except `token`, so the roster UI had no way to rebuild the "copy invite link" affordance for an invite created in an
  earlier page load (only the just-created response carried it). Fixed in the same platform PR (#3331,
  `docs/validation/VTID-03935/acceptance.md` addendum) — `OrgInviteRow.token` here matches.
- **`CommerceJoin.tsx` never honored `?redirectTo=`**, even though `AuthGuard` already builds that param for any signed-
  out visitor hitting a `/commerce/*` deep link (including the new accept-invite route) — it always hardcoded
  `navigate('/commerce')`. An invited user without an account yet would register, then land on the generic portal
  instead of back on the invite they followed. Fixed to honor `redirectTo`, restricted to a `/commerce` path (never an
  open redirect).
- i18n: DE-first, EN mirrored — `screens.commerceportal.orgOnboarding.*` (~50 keys, including 2 new plain header labels,
  `memberSinceHeader`/`expiresAtHeader`, added instead of misusing the `grantedAt`/`expiresAt` `{date}`-templated toasts
  as table headers). `npm run i18n:inventory`-equivalent (`node scripts/generate-screen-inventory.mjs`, pure Node, no
  npm install needed — see Verification) reports `CommerceAcceptInvite.tsx` clean (6 keys, 1 namespace, 0 suspects);
  regenerated `docs/SCREEN_INVENTORY.md` committed.

## Deliberately deferred (per the approved plan)

- No invite email delivery — copyable link only, matching the platform-wide `Invitations.tsx` precedent.
- No org-settings/edit-profile screen — registration is create-only this phase.
- No mobile-first redesign of these screens — matches this page's existing desktop-first posture.

## Acceptance criteria

AC-1 — A signed-in user can register a business and see it appear in "Your organizations" with `status: pending_review`
and their own role as `org_admin`.
TEST: manual trace against `RegisterOrgDialog.tsx` → `POST /register` → `CommercePortal.tsx`'s `loadMyOrgs()` re-fetch on
`onCreated`; not runnable end-to-end in this sandbox (see Verification) since the backend migration is unapplied.

AC-2 — Only an org's own `org_admin` sees the "manage team" affordance; a `staff`/`professional` member sees their org
card without it.
TEST: `MyOrgCard.tsx` — `canManage = org.role === 'org_admin'`; the button is `disabled`/non-interactive otherwise
(`enabled:hover:*`/`disabled:cursor-default` Tailwind variants, no separate click handler exists for the disabled case).
Real enforcement is server-side via `requireOrgAdmin()` (VTID-03932), unchanged here.

AC-3 — The roster drawer shows current members and pending (unaccepted) invites, and sending a new invite immediately
refreshes the pending-invites table.
TEST: `PartnerOrgRoster.tsx` — `invitesQuery.data.filter((inv) => !inv.accepted_at)`; `useCreateOrgInvite`'s
`onSuccess: () => qc.invalidateQueries({queryKey: ['partner-org-invites', orgId]})`.

AC-4 — "Copy invite link" works both right after sending an invite and for an invite that was already pending from an
earlier load.
TEST: both `invite()` and `copyInviteLink()` in `PartnerOrgRoster.tsx` build the same
`${origin}/commerce/invites/${token}/accept` URL from `OrgInviteRow.token` — the field this VTID's own backend addendum
added to `GET /:orgId/invites`.

AC-5 — The accept-invite route is reachable, session-gated, and honors the redirect-back-after-login path for a
signed-out visitor.
TEST: `src/pages/CommerceAcceptInvite.routing.test.ts` — asserts the route is registered with `AuthGuard`, and that
`CommerceJoin.tsx` reads `redirectTo` and restricts it to a `/commerce` path.

AC-6 — Accepting shows the right terminal state for each of the four backend outcomes (success, already-accepted,
expired, not-found) and never leaves the user on an indefinite spinner.
TEST: `CommerceAcceptInvite.tsx` — the `catch` branch pattern-matches the exact error strings the gateway route returns
(`"already accepted"`, `"expired"`, `"not found"`) per `partner-orgs.ts`'s own response bodies (409/410/404), with a
generic `failed` fallback for anything else; success redirects to `/commerce`.

## Verification — and its real limitation this session

**This sandbox's network policy blocks `npm install`** — confirmed via repeated `403 Forbidden` from
`registry.npmjs.org` on package tarball downloads, in both this repo and `vitana-platform`, with no `node_modules`
present in either to fall back on. That means no locally-runnable `npm run build`, `tsc` against the full project graph
(path aliases/`react`/`lucide-react` etc. can't resolve without `node_modules`), `vitest`, or Playwright screenshot in
this session — the mandated visual-verification screenshot from the platform CLAUDE.md's protocol could not be taken.

What COULD be run and was:
- `node scripts/generate-screen-inventory.mjs` (pure Node, no dependency) — ran clean, output above, `docs/SCREEN_INVENTORY.md`
  committed.
- A standalone `tsc` binary exists at `/opt/node22/bin/tsc` (unrelated to this project's own `node_modules`), but a
  meaningful check still needs the project's own `node_modules` to resolve `@/*`/`react`/`lucide-react`/etc., which
  don't exist here either — attempted and confirmed unusable for this, not silently skipped.
- Manual line-by-line review against every precedent file this diff follows (`ManualConnectDialog.tsx`,
  `ConnectionWorkbench.tsx`, `Invitations.tsx`, `useAdminMembers.ts`, `AuthGuard.tsx`) — prop shapes, i18n keys (cross-
  checked against both `de`/`en` `screens.json` directly), and the exact backend response fields/status codes (read
  directly from `partner-orgs.ts` in the sibling repo) all confirmed by hand.
- `docs/validation/VTID-03876/`'s own real end-to-end verification (stub-gateway Playwright run, screenshots) is the
  established bar for this repo's Draft-card work; it could not be met here for the reason above. This is a genuine gap,
  not a rule to route around — flagging it rather than claiming a screenshot that wasn't taken.

**Not done, flagged rather than silently skipped:** a real browser screenshot of the register dialog and roster drawer.
Needs a session with npm registry access (or a pre-warmed `node_modules`) to run the dev server; CI (which does have
package-registry access) is the actual type/build/test gate for this PR.

### Addendum — PR preview deploy closed part of the local-build gap (2026-09-15, same VTID)

`PREVIEW-DEPLOY-FRONTEND.yml` posted a real preview
(`https://d2w0cqhh9jhjpj.cloudfront.net/pr-1088/`, commit `0d027ca`) after the PR opened — that workflow DOES have npm
registry access, so its build is real evidence this session's own `tsc`/build gap didn't hide a compile error. Checked
read-only (GET only, no write — this is a static SPA preview, no live data):

- `GET /pr-1088/commerce` → `200 text/html` — the SPA shell serves.
- Its single entry chunk (`assets/index-6ACw-41z.js`, ~2.5MB) contains the literal strings `orgOnboarding`,
  `partner-orgs`, and `commerce/invites/:token/accept` — i.e. the new i18n namespace, the new `PARTNER_ORGS_API`
  constant, and the new route path all genuinely compiled and shipped, not a stale cached build.

**Still not covered by this:** no authenticated interactive check (clicking Register, opening the roster drawer,
actually submitting an invite) — that still needs a real session against this preview with a signed-in test user,
which this session did not do. The AC-1 through AC-6 mappings above remain code-review-level, not interaction-level,
verification.
