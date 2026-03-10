

# Remove Cross-Tenant Links from Maxina Sign-In Pages

Maxina users should never see references to AlKalma, Earthlinks, or "All Portals" — matching the clean Android experience already shipped.

## Changes

| File | Lines | What to remove |
|------|-------|---------------|
| `src/pages/portals/MaxinaPortal.tsx` | 804–817 | Entire "Portal Navigation - Desktop only" div with AlKalma, Earthlinks, All Portals links |
| `src/pages/Auth.tsx` | 337–346 | "Back to all portals" button div |
| `src/pages/AuthPages.tsx` | 204–209 | "Back to all portals" link div |

Three simple deletions. No logic or dependency changes. The surrounding layout (Privacy · Terms · Help footer, form elements) remains intact.

