
Problem confirmed: the reaction notification itself is now being created correctly, but the mobile push still fails after that.

What I verified:
- The latest `message_reaction` row now has a proper body:
  - `Jovana Tadic reacted ❤️ to your message`
- The `notify_on_reaction()` function in the live database is updated correctly and is no longer the blocker.
- The `appilix-push` delivery attempt for that same notification fails with:
  - `User identity is not found.`
- This came directly from the Appilix push response stored in `net._http_response`.

Root cause:
- The notification pipeline is working up to `user_notifications`.
- The failure is in native Appilix device identity registration/sync for the recipient user.
- In other words: reaction notifications are generated, but Appilix cannot map that user’s UUID to a registered mobile device, so no native mobile push is shown.

Why this matches what you’re seeing:
- Older broken notifications had `body = null`.
- Newer reaction notifications now have the correct body, but still do not appear on mobile because push delivery is rejected by Appilix for identity lookup.

Implementation plan:
1. Audit and harden the Appilix identity sync flow
   - Review the code in `App.tsx`, `index.html`, and push registration helpers.
   - Make identity registration happen reliably whenever a user is authenticated in Appilix, not just by setting a cookie/window value.
   - Ensure the bridge sends `update_settings({ user_identity })` consistently for both fresh login and returning sessions.

2. Add defensive re-registration on app resume / foreground
   - Re-send the authenticated user identity when the app becomes visible again or when the bridge becomes available.
   - This should recover from cases where the native shell misses the first registration event.

3. Add diagnostic logging around identity registration
   - Log when user identity is set to cookie/window/native bridge.
   - Log whether Appilix is detected and whether an FCM/native token is present.
   - This will make future push failures much easier to verify.

4. Keep reaction notifications unchanged except for validation
   - The reaction trigger itself should stay as-is now that it generates correct body text.
   - After identity sync is fixed, reaction pushes should start appearing without further database changes.

Files likely to change:
- `src/App.tsx`
- `src/lib/appilix.ts`
- possibly `src/lib/pushNotifications.ts`
- possibly `index.html` if the early identity bootstrap needs to be strengthened

Technical note:
The latest DB evidence shows:
- `user_notifications.type = 'message_reaction'`
- correct `body`
- `push_sent_at` gets populated
- but the actual Appilix response is:
```text
{"status":"false","msg":"User identity is not found."}
```
So the next fix should target native identity registration, not the reaction trigger.
