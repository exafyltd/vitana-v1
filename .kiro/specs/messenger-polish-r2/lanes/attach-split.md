---
lane: attach-split
state: ready
next_actor: claude
depends_on: []
vtid: VTID-05587
executor: kiro
seat: exafyltd
area: messenger
reviewer_seat: claude
paths:
  - src/components/messages/ConversationView.tsx
  - src/components/messages/MessageBubble.tsx
  - src/components/messages/MessageInput.tsx
  - src/components/messages/AttachmentMenu.tsx
  - src/components/messages/*.test.tsx
  - src/index.css
  - src/i18n/**
  - docs/validation/VTID-05587/**
updated: 2026-11-06T14:30Z
---
# messenger-polish-r2 / attach-split — VTID-05587

Plan: `plan-sparring.md` (owner Gate 1 approved 2026-11-06). Tasks: `tasks.md` lane `attach-split` (items A1-A4).

**Never:** no VTID allocation, no merge/approve, no workflow dispatch or deploy, no writes to Supabase/AWS/storage,
no test against production. Staging specs are read-only.

## Log
### 2026-11-06T14:30Z · claude-code · created → ready
VTID VTID-05587 allocated (sparring record `plan-sparring.md`, owner approval 2026-11-06). Handed to Kiro.

### 2026-11-06T16:10Z · claude-code · ready → ready (switch pending)
Executor switch to claude requested; it waits for a trusted route to main, so the executor stays kiro on this PR (owner decision 2026-11-06). Built: separate photo/video input (multi-select, image+video accept) and a Photos entry in the attachment menu; the file input now excludes image and video; attachPhotos label in all 11 shipped locales (DE first); source-guard Vitest.
