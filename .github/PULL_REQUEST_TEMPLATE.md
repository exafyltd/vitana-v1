## Summary

<!-- 1-3 sentences on what changed and why -->

## Test plan

- [ ] Local build passes (`npm run build`)
- [ ] Local lint passes (`npm run lint`)
- [ ] No new hardcoded user-facing strings (CI's `i18n-check` workflow is green)
- [ ] If new strings were added: ran `npm run i18n:inventory` and committed the updated `docs/SCREEN_INVENTORY.md`
- [ ] If new strings were added in a non-DE language only: ran `node scripts/translate-keys.mjs --provider=deepseek` to drain `_pending_review`
- [ ] Manually verified the change in the deployed preview (https://community-app-q74ibpv6ia-uc.a.run.app/)
