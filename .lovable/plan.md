## Vitana AI Chat Link Sharing — Implemented

### Changes (VTID: Enable Vitana to Share Event & Match Links)

| # | File | Change |
|---|------|--------|
| 1 | `fetch-user-context/index.ts` | Added `slug` to event SELECT query and mapped output |
| 2 | `ai-chat/index.ts` | Event links: `e.vitanaland.com/events/{slug}` or `/pub/events/{id}` |
| 3 | `ai-chat/index.ts` | Added instruction #8: always include links when discussing events/matches |
| 4 | `ai-chat/index.ts` | Match links: `e.vitanaland.com/matches/{id}` via OG proxy |

### Link Format
- Events (slugged): `https://e.vitanaland.com/events/{slug}`
- Events (no slug): `https://e.vitanaland.com/pub/events/{id}`
- Matches: `https://e.vitanaland.com/matches/{id}`

All links use the e.vitanaland.com OG proxy infrastructure (Cloudflare Worker → OG meta → redirect to app).

### Deploy
Both edge functions (`fetch-user-context`, `ai-chat`) need manual CLI deploy:
```
supabase functions deploy fetch-user-context --no-verify-jwt
supabase functions deploy ai-chat --no-verify-jwt
```
