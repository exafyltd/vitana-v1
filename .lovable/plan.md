

## Remove Role Selector from Maxina Join Form

Since only the Community role is currently supported, the role picker is confusing for new users. We'll remove it and hardcode `community` as the default.

### Change: `src/pages/portals/MaxinaPortal.tsx`

1. **Remove the role selector UI** (lines 519-560) — delete the entire "Compact Role Selection" block with the 4 buttons (Community, Patient, Pro, Admin).

2. **Keep `selectedRole` state but lock it to `"community"`** — the state variable at line 44 already defaults to `"community"`, and it's used in the signup metadata at line 193 (`preferred_role: selectedRole`). Since the UI no longer lets users change it, it will always send `"community"`. No other code changes needed.

3. **Clean up unused imports** — remove `Heart`, `Stethoscope`, and `Shield` from the lucide-react import if they are no longer used elsewhere in the file. `Users` may still be used elsewhere so we'll check before removing.

### What stays the same
- The signup handler still sends `preferred_role: "community"` in metadata
- Full Name, Email, Password fields unchanged
- Google/Apple OAuth unchanged
- All other portal behavior unchanged

