# Plan — Vitana chat replies show raw Markdown in the Messenger

Change class: light (frontend only; 1 source file + 1 new helper + tests + evidence pack; no migrations, routes, auth, workflows or LLM routing).
Repo: exafyltd/vitana-v1.

<!-- plan:begin -->
## Problem (owner report 2026-10-14, phone screenshot)

In the Vitana DM, Vitana's text replies show raw Markdown: `**"Did You Know"**`, `- Say **"Show me"** → …`.
The reply is written by the gateway text brain (`handleVitanaTextReply` → `processConversationTurn`,
services/gateway/src/routes/chat.ts:312), which answers in Markdown. The Messenger bubble renders the
message body as plain text (`renderLinkedText`, src/components/messages/MessageBubble.tsx:680-798:
`<p className="whitespace-pre-wrap">` with URL linkify and @mentions only). The app has no Markdown
library (package.json has no react-markdown/marked).

## Change

1. New pure helper `src/lib/chatMarkdown.ts`: parses a SAFE subset of Markdown into a token tree —
   `**bold**` / `__bold__`, `*italic*` / `_italic_` (word-boundary aware so `snake_case` and `2*3*4` stay
   literal), `` `code` ``, line-start `- ` / `* ` / `• ` bullets, `1. ` numbered items, and `#`–`###`
   headings (rendered as a bold line). No HTML, no links syntax `[x](y)` (bare URLs keep the existing
   linkify), no images, no tables. Unknown or unbalanced markers stay literal text. Never
   `dangerouslySetInnerHTML` — the bubble builds React nodes from the tokens.
2. `MessageBubble.tsx` — mechanism (F1): a new sibling callback `renderBotMarkdown(text, className, trailingInline)`
   next to `renderLinkedText` (L680). It tokenizes with the helper and renders every plain-text leaf through the
   SAME linkify + @mention path: the URL/mention loop of `renderLinkedText` is extracted into an inner
   `linkifyInline(text, keyPrefix)` used by both, so links and mentions behave identically. A local
   `isFromVitana = isVitanaBot(message.sender_id || message.sender?.user_id)` (same expression as L1138) picks
   the renderer at exactly two call sites: `default` (L1125, Vitana's text replies) and `template` (L1034,
   whose body can be Vitana-authored). The other call sites (`calendar_invite` L969, `service_booking` L999,
   L1070/L1075 card/caption bodies) stay on `renderLinkedText` unchanged — members' or structured content.
   Members' messages never go through the parser.
   Wrapper (F3): `renderBotMarkdown` returns a `<div className="whitespace-pre-wrap break-words …">` (not `<p>`)
   so `<ul>/<ol>` are valid; paragraphs inside are `<p>`/spans; the timestamp spacer (`trailingInline`) is
   appended to the last inline run exactly as today.
   Copy/edit keep raw text: copy reads `message.body || message.content` (L509), edit reads the same (L594) —
   unchanged.
   Nesting: `**bold *italic* bold**` is supported one level (italic inside bold and vice versa); deeper or
   overlapping markers fall back to literal text.
   No new user-visible strings (F2): the helper only wraps message content; no i18n keys; tests assert on the
   message text itself, which is data, not UI copy.
3. RTL-safe: lists use logical classes (`ps-4`, `list-disc`), no left/right.

## Not in scope

- Changing the gateway prompt to stop emitting Markdown (other surfaces — ORB transcript, Operator —
  render it; plain text there would be a different decision).
- Companion messages / cards (`COMPANION_SEND_ENABLED` stays off; separate owner decision).

## Test plan

- Vitest `src/lib/chatMarkdown.test.ts`: bold, italic, code, bullets, numbered list, headings, mixed with
  URLs, unbalanced `**`, `snake_case_word`, `2*3*4`, a `<script>` string stays text, empty input.
- Vitest `MessageBubble.vitana-markdown.test.tsx`: a Vitana bot message with the exact screenshot text
  renders `<strong>Did You Know</strong>`-style nodes and no literal `**`; bullets render as list items;
  one case inside `dir="rtl"` asserts the list uses logical classes only (no left/right) (F4);
  a URL inside still renders as a link; the same text from a member renders literally (with `**`).
  Red → green against origin/main.
- Staging (read-only): add the new Vitest files to a `kind: existing` entry in
  `docs/validation/<VTID>/staging-tests.json` (a staging browser spec cannot create a Vitana message
  without a write). Lint (no new design/i18n errors), build.
<!-- plan:end -->

## Planner responses (round 1)

- F1 [major] ACCEPTED — mechanism specified: sibling `renderBotMarkdown`, shared `linkifyInline`, `isFromVitana`
  chosen at `default` (L1125) and `template` (L1034) only; all other call sites unchanged.
- F2 [minor] ACCEPTED — stated: no new user-visible strings, no i18n keys.
- F3 [minor] ACCEPTED — bot renderer uses a `<div>` wrapper with the same classes; lists are valid HTML.
- F4 [minor] ACCEPTED — RTL test case added.
- F5 [minor] ACKNOWLEDGED — no What's New entry (fix).
- Q1: `template` — yes, included (body can be Vitana-authored); gated by `isFromVitana`, so a member template is unchanged.
- Q2: copy (L509) and edit (L594) read `message.body || message.content` — raw; unchanged.
- Q3: one level of nesting supported; anything deeper or overlapping stays literal.

## Review clarification (PR #1412, Codex P2) — within the approved plan

R3 / Change 2 require links to behave exactly as today. Parsing emphasis before linkify would split a URL that
contains `_`/`*` (e.g. `https://example.com/__preview__`), leaving only its prefix linked. Implementation rule:
the helper detects bare URLs first and keeps each as one atomic text leaf that emphasis parsing never touches;
tests cover a delimiter-containing URL (tasks 2 and 4). No change to the plan text or its hash.
