# Requirements — Vitana chat replies render Markdown (VTID-05193)

Owner report 2026-10-14 (phone screenshot): in the Vitana DM, Vitana's replies show raw Markdown
(`**"Did You Know"**`, `- Say **"Show me"** → …`).

- R1. A message from the Vitana bot (`isVitanaBot(sender)`) renders `**bold**`/`__bold__`, `*italic*`/`_italic_`,
  `` `code` ``, line-start bullets (`- `, `* `, `• `), numbered items (`1. `) and `#`–`###` headings (as a bold line).
- R2. `snake_case_words`, `2*3*4`, unbalanced or unknown markers stay literal. Never raw HTML: no
  `dangerouslySetInnerHTML`; `<script>` text renders as text.
- R3. Bare URLs stay links and @mentions stay profile links inside formatted text (same behaviour as today).
- R4. Messages from members render exactly as today (literal `**`).
- R5. Copy and edit keep the raw text.
- R6. RTL: lists use logical classes only (`ps-*`, `list-disc`), no left/right.
- R7. No new user-visible strings (no i18n keys). No What's New entry (fix).
