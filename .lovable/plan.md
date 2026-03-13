

# Replace "Business" with "Inbox" in Mobile Bottom Nav

Single change in `src/components/mobile/MobileBottomNav.tsx`:

Replace the Business nav item with Inbox — swap the icon from `Briefcase` to `Mail`, update label/path/i18nKey accordingly.

| Field | Old | New |
|-------|-----|-----|
| id | `business` | `inbox` |
| icon | `Briefcase` | `Mail` |
| label | `Business` | `Inbox` |
| path | `/business` | `/inbox` |
| i18nKey | `mobileNav.business` | `mobileNav.inbox` |

One file, one line-level edit.

