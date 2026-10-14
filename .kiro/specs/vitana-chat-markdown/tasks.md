# Tasks — Vitana chat replies render Markdown

<!-- lane: render -->
## Lane `render` · VTID-05193 · executor Kiro
Design: `design.md` (the sparred, owner-approved plan — follow it exactly; anything outside it is a plan change,
log it and set `next_actor: claude`).

- [ ] 1. `src/lib/chatMarkdown.ts` — pure parser of the safe subset (R1, R2) into a token tree; one level of
  nesting (italic in bold and vice versa); deeper/overlapping markers stay literal. No React import.
- [ ] 2. `src/lib/chatMarkdown.test.ts` — bold, italic, code, bullets, numbered, headings, URL inside bold,
  unbalanced `**`, `snake_case_word`, `2*3*4`, `<script>alert(1)</script>` stays text, empty input.
- [ ] 3. `MessageBubble.tsx` — extract the URL + @mention loop of `renderLinkedText` (L680-798) into an inner
  `linkifyInline(text, keyPrefix)` used by both renderers; add sibling `renderBotMarkdown(text, className,
  trailingInline)` returning a `<div className="whitespace-pre-wrap break-words …">` (lists inside a `<div>`, not a
  `<p>`); `const isFromVitana = isVitanaBot(message.sender_id || message.sender?.user_id)`; use
  `renderBotMarkdown` only at `default` (L1125) and `template` (L1034) when `isFromVitana`. All other call sites
  unchanged. The timestamp spacer stays on the last inline run.
- [ ] 4. `src/components/messages/MessageBubble.vitana-markdown.vtid-05193.test.tsx` — the screenshot text from the
  Vitana bot → `<strong>` nodes, list items, no literal `**`; a URL inside stays a link; the same text from a member
  renders literally; `dir="rtl"` case asserts logical classes only. Red on origin/main → green.
- [ ] 5. Checks: `npx eslint` on changed files (no new errors, design ratchet), `npx vitest run src/lib/chatMarkdown.test.ts
  src/components/messages`, `npm run build`. PR gate locally:
  `node scripts/ci/pr-gate/gate.mjs {scope,sparring,weakening,red-green} --base origin/main --title "<PR title>"`.
- [ ] 6. PR: branch `kiro/vitana-chat-markdown/render`, title `VTID-05193 (vitana-chat-markdown/render): Vitana chat
  replies render Markdown`, body names the Kiro session id, Summary / Decisions taken / Tests / Handoff. Commit
  trailers `Collab-Session: <kiro id>` and `Collab-Lane: vitana-chat-markdown/render`. Lane → `in-review`,
  `next_actor: claude`. Do not merge, deploy or write to any live system (protocol §7a).

Acceptance: R1–R7; CI green; `docs/validation/VTID-05193/{scope,staging-tests}.json` already list the files above
(update only if a path changes).
