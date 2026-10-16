# Tasks — messenger-paste-enter

<!-- lane: composer -->
## Lane `composer` — paste + Enter in `MessageInput`
- [ ] C1 Extract `uploadFiles(files)` from `handleFileSelect`; picker behaviour unchanged (design §1).
- [ ] C2 `handlePaste` with the text-wins rule and generic-name rename (R1, design §1).
- [ ] C3 `sendsOnEnter` media query; Enter handling in `onKeyDown` with IME, mention and empty guards;
      `enterKeyHint` per device (R2, design §2).
- [ ] C4 Vitest: new paste/Enter test; 04966 and 04926 tests pinned to touch, desktop mention case added.
- [ ] C5 Read-only staging spec replacing `vtid-04966-enter-newline.staging.spec.ts`; `docs/validation/<VTID>/`
      with `scope.json`, `staging-tests.json`, `plan-sparring.md`.

**Acceptance (reviewer seat):** every R1/R2 clause has a passing test; on touch devices Enter behaves exactly as on
origin/main; `npx vitest run`, `npm run build`, `npm run lint` green (error counts not above main); PR-GATE and
**Lane scope** green; PR body states the desktop contract change to VTID-04966.
