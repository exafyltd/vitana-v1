# supabase/functions/ — Supabase Edge Functions (73 functions)

## Overview

Deno-based edge functions deployed to Supabase. Each subdirectory is one function with an `index.ts` entry point. Shared code lives in `_shared/`.

## By Domain

### AI & Analysis
| Function | Purpose |
|----------|---------|
| `ai-chat/` | AI chat completions |
| `analyze-patterns/` | Pattern analysis |
| `analyze-situation/` | Situation analysis |
| `analyze-visual-context/` | Visual context analysis |
| `extract-diary-insights/` | Diary entry insight extraction |
| `extract-user-interests/` | User interest extraction |
| `extract-video-meta/` | Video metadata extraction |
| `generate-enhanced-recommendations/` | AI-enhanced recommendations |
| `generate-personalized-plan/` | Personalized health plan generation |
| `generate-proactive-greeting/` | Proactive greeting generation |
| `generate-proactive-message/` | Proactive message generation |
| `generate-recommendations/` | General recommendations |
| `get-proactive-context/` | Proactive context assembly |
| `fetch-user-context/` | User context retrieval |

### Events & Community
| Function | Purpose |
|----------|---------|
| `generate-daily-matches/` | Daily match generation |
| `process-match-interaction/` | Match interaction processing |
| `generate-event-image/` | Event image generation |
| `generate-maxina-summer-events/` | Seed Maxina summer events |
| `seed-maxina-events-fast/` | Fast event seeding |

### Memory & Embeddings
| Function | Purpose |
|----------|---------|
| `generate-memory-embedding/` | Memory vector embedding |
| `search-memories/` | Semantic memory search |
| `refresh-memory-metadata/` | Memory metadata refresh |
| `reinforce-memory/` | Memory reinforcement |

### Notifications & Messaging
| Function | Purpose |
|----------|---------|
| `appilix-push/` | Appilix push notifications |
| `send-appointment-email/` | Appointment email |
| `send-appointment-reminder/` | Appointment reminder |
| `send-welcome-discount/` | Welcome discount email |
| `distribute-post/` | Post distribution |
| `process-campaign-queue/` | Campaign queue processing |
| `queue-campaign-recipients/` | Campaign recipient queuing |
| `trigger-scheduled-campaigns/` | Scheduled campaign trigger |

### Payments & Commerce
| Function | Purpose |
|----------|---------|
| `stripe-create-checkout-session/` | Stripe checkout session |
| `stripe-create-booking-checkout/` | Booking checkout |
| `stripe-create-package-checkout/` | Package checkout |
| `stripe-create-ticket-checkout/` | Ticket checkout |
| `stripe-create-voucher-checkout/` | Voucher checkout |
| `stripe-webhook/` | Stripe webhook handler |
| `verify-package-payment/` | Payment verification |
| `create-reseller-payout/` | Reseller payout creation |
| `credit-reseller-payout/` | Reseller payout credit |

### Vouchers
| Function | Purpose |
|----------|---------|
| `voucher-download-pdf/` | Voucher PDF generation |
| `voucher-send-email/` | Voucher email delivery |

### Social & Imports
| Function | Purpose |
|----------|---------|
| `linkedin-import/` | LinkedIn data import |
| `social-media-import/` | Social media import |

### Admin & Infrastructure
| Function | Purpose |
|----------|---------|
| `bootstrap_admin/` | Admin user bootstrap |
| `list_super_admins/` | List super admin users |
| `remove_super_admin/` | Remove super admin |
| `list_my_memberships/` | List user memberships |
| `set_active_tenant/` | Set active tenant |
| `request-account-deletion/` | Account deletion request |
| `run-uptime-checks/` | Health/uptime monitoring |
| `test-api-integration/` | API integration testing |

### Voice & Media
| Function | Purpose |
|----------|---------|
| `google-cloud-tts/` | Google Cloud Text-to-Speech |
| `google-gemini-tts/` | Google Gemini TTS |
| `vertex-auth/` | Vertex AI authentication |
| `vertex-live/` | Vertex AI live session |
| `vitanaland-live/` | Vitanaland live events |

### CJ Dropship Integration
| Function | Purpose |
|----------|---------|
| `cj-create-order/` | CJ order creation |
| `cj-get-product-details/` | CJ product details |
| `cj-get-token/` | CJ API token |
| `cj-search-products/` | CJ product search |
| `cj-track-shipment/` | CJ shipment tracking |
| `cj-webhook-handler/` | CJ webhook handler |

### Discovery & AI Agents
| Function | Purpose |
|----------|---------|
| `crewai-proxy/` | CrewAI agent proxy |
| `integration-discovery/` | Integration discovery |
| `autopilot-profile/` | Autopilot profile generation |

### OG (Open Graph) Tags
| Function | Purpose |
|----------|---------|
| `og-campaign/` | Campaign OG tags |
| `og-event/` | Event OG tags |
| `og-share/` | Share OG tags |
| `api-event-by-slug/` | Event lookup by slug |

## Patterns

- Each function is a Deno module in its own directory with `index.ts`
- Shared utilities in `_shared/` (Supabase client, CORS headers, etc.)
- Functions use Supabase service role key for DB access
- Deploy via `supabase functions deploy <function-name>`
