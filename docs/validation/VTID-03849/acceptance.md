# VTID-03849 — Frontend: BackOffice wave-1 Read screens (Overview, Approvals, Audit, Settings › Company)

VTID: VTID-03849
Spec: approved (generate → validate pass → quality-check pass, known CRITICAL risk label → approve).
Backend: `exafyltd/vitana-platform#3291` (VTID-03842 orchestrator, the routes these screens call) — not yet on staging; its migration awaits the owner's "apply now".
Stacked on the VTID-03834 branch (`#1064`, ERP capability access).

## What shipped

- `src/hooks/useBackOfficeCommands.ts` — `useErpRead(type, payload)` runs ONE typed Read command through
  `POST /api/v1/backoffice/commands` (channel `web`, `confirm:false`, a per-minute idempotency key that
  matches the gateway's `/^[A-Za-z0-9_.:-]{8,128}$/`) and returns `receipt.result` + the command row;
  `useBackOfficeCommands`, `useBackOfficeCommand`, `useBackOfficeApprovals`, `useBackOfficeAudit`,
  `useBackOfficePolicy` are plain gateway GETs via `adminFetch`. Every failure maps to a
  `screens.backoffice.errors.*` key (bridge unconfigured / no capability / ERP failed / unauthorized …).
- `src/components/backoffice/` — `BackOfficePage` (AppLayout + section tabs + header + optional any-of
  capability gate), `CommandBadges` (tier / command status / approval status / channel), `QueryState`,
  `DataSourceNote` (source + as-of timestamp, design gate §1.3), `CommandsTable`, `ApprovalsTable`,
  `ReceiptDetail` (stored bridge receipt, verbatim, collapsible).
- Screens (all Read tier, all inside AppLayout, all with `data-screen-id`):
  BO-001 Dashboard, BO-002 Approvals Inbox, BO-003 Activity, BO-004 Health,
  BO-053 Queue, BO-054 My Requests, BO-055 Policies,
  BO-056 Command Receipts, BO-057 ERP Audit Log, BO-058 Independent Audit Trail,
  BO-059 Company & Legal Entities. Routes registered in `App.tsx` before the `/backoffice/*` placeholder.
- ERP reads used: `erp.health.read` (+`.check_installation`, `.get_schema_version`, `.list_modules`),
  `audit.erp_log.read`, `settings.company.list`, `settings.company.get`, `accounting.period.list`.
  Company scoping never leaves the browser — the bridge injects `--company-id` from the tenant.
- i18n DE-first: 187 `screens.backoffice.*` keys; en/es/sr/ar translated; fr/pl/pt/ru/tr/zh mirror EN.
  Inventory regenerated. Money/dates via `@/lib/locale-format` (`formatAed`, `monthName` in
  `src/lib/backoffice-format.ts`). RTL: logical spacing (`ms-*`, `ps-*`, `text-end`), identifiers in `dir="ltr"`.

## Deliberately NOT in this slice (Read tier first, per the execution brief)

- No approve/reject buttons (they execute the High-risk command — Commit level), no policy edit (PUT /policy
  is itself a receipt), no Draft/Commit command submission. Each screen that would carry one says so
  (`screens.backoffice.common.readOnlySlice`). Next slice.
- No nav-catalog rows for the backoffice Navigator role (the ORB Navigator still clarifies instead of routing
  to these screens) — separate VTID.
- Mobile: BackOffice is desktop-only by inheritance (`useRole` forces `community` on mobile widths), so only
  1400×900 was verified.

## Acceptance criteria

AC-1 — Every ERP read is a typed Read command through the orchestrator; nothing else can be sent from these screens
TEST: `src/hooks/useBackOfficeCommands.test.ts` — `useErpRead` posts `{type, payload, channel:'web', confirm:false, idempotency_key}` to `/api/v1/backoffice/commands` and returns `receipt.result`; a rejected command surfaces as `BackOfficeCommandError(key:'noCapability')`, never as data; a disabled read makes no call. The hooks module exports no mutation hook; `grep -rn "approve\|reject\|PUT" src/hooks/useBackOfficeCommands.ts` finds only the read-only type names.
UI: `screenshots/17-health-bridge-down-admin-en.png` — the stub answering `503 bridge_not_configured` renders the "bridge not reachable" alert with its hint, not a crash and not empty zeros.

AC-2 — Idempotency keys are gateway-valid, bucketed per minute, and never collide across types/payloads
TEST: `src/hooks/useBackOfficeCommands.test.ts` — "matches the gateway regex for every wave-1 Read type", "is stable inside a minute bucket and changes across buckets", "never collides across types or payloads", "hashes payloads independent of key order".

AC-3 — Overview: Dashboard counts (pending approvals, my open requests, executed/failed 7d), ERP status, quick access limited to usable sections, recent activity; Inbox lists only what the caller can decide; Activity filters by status; Health shows status / installation / schema / modules
UI: `screenshots/01-dashboard-admin-en.png` (3 / 1 / 3 / 2, ERP Ready, 5 recent rows), `02-inbox-admin-en.png` (1 decidable row of 3 pending), `03-activity-admin-en.png` (7 rows), `04-health-admin-en.png` (status ok, 1 module `erpclaw-growth 2.10.0` — real ERPClaw JSON from the VTID-03840 spike database), `12-dashboard-admin-de.png` (DE source language).

AC-4 — Approvals: Queue (status filter, maker-checker shown: own request / can decide / not yours), My Requests (own rows, awaiting vs history), Policies (threshold as AED currency, MFA flag, default markers, fixed rules) — read-only
TEST: `src/pages/backoffice/approvals/Policies.test.tsx` — renders threshold `formatAed(25000)` and MFA from one `GET /api/v1/backoffice/policy`, no other call, screen id BO-055.
UI: `screenshots/05-approvals-queue-admin-en.png`, `06-my-requests-admin-en.png`, `07-policies-admin-en.png`, `14-approvals-queue-admin-ar-rtl.png` (RTL).

AC-5 — Audit: Command Receipts (receipt JSON verbatim, expandable), ERP Audit Log (ERPClaw `get-audit-log` entries), Independent Audit Trail (Vitana `erp_audit_log` rows) — gated on `audit.view`
UI: `screenshots/08-audit-receipts-open-admin-en.png` (first receipt expanded), `09-audit-erp-log-admin-en.png` (8 real ERPClaw audit entries), `10-audit-trail-admin-en.png` (7 rows, event pills).

AC-6 — Settings › Company: active legal entity (from `settings.company.get`, bridge-scoped), fiscal years (only with `accounting.view`), all companies; gated on `erp.admin` or `accounting.view`
UI: `screenshots/11-settings-company-admin-en.png`, `13-settings-company-admin-ar-rtl.png` (RTL, Arabic labels, identifiers stay LTR), `16-company-bookkeeper-accounting-view-en.png` (bookkeeper: fiscal years visible via accounting.view).

AC-7 — Capability gates match the design gate: Health and Receipts/ERP log/Trail need `erp.admin`|`audit.view` / `audit.view`; a caller without them sees the no-access body, and the gateway is still the enforcer
UI: `screenshots/15-health-bookkeeper-no-access-en.png` (bookkeeper without erp.admin/audit.view → no-access body listing the capabilities, no ERP read attempted — stub log shows zero POSTs for that page).

AC-8 — Nothing written anywhere during verification
TEST: harness `run-*.log` — every non-read request to Supabase/the gateway aborted (`blocked non-read requests` count), the only POSTs allowed are typed Read commands to the local stub (`stub read POSTs`); Supabase auth endpoints served locally from the sign-in response; service worker blocked. Test user signed in once (the documented, sole permitted auth write).

AC-9 — Type-check, lint (incl. i18n rules), unit tests, inventory
TEST: `outputs/checks.txt` — tsc: 140 pre-existing errors on base and branch, 0 in the new files; eslint on the new files: 0 problems; `vitest run`: 31 files / 206 tests green (13 new); `npm run i18n:inventory` regenerated.

## Owed / not verified

- Real gateway round-trips need `#3291` merged to staging with its migration applied and `ERP_BRIDGE_URL`/`ERP_BRIDGE_TOKEN` set on the staging task def (VTID-03840 bridge provisioning). Until then every ERP block shows the bridge-unavailable alert (AC-1's screenshot) and the GET screens show empty states.
- Screenshots use a local stub for the gateway routes (the router's exact response shapes; ERP results are real ERPClaw JSON captured from the spike database), not live staging.
