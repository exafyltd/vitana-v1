# VTID-04898 — the Vitana orb stays off the pre-login Commerce landing

AC-1 At desktop widths (≥1024px) the orb on the guest Commerce page lies entirely left of the hero heading and the landing, and never overlaps the one-step MCP heading.
TEST: tests/e2e/staging/vtid-04898-commerce-guest-orb.staging.spec.ts (1024×768, 1280×800, 1400×900, 1920×1080)

AC-2 The rule is scoped: the body class exists only while the guest landing is mounted, the gutter applies only to the Commerce shell's main, and only at ≥1024px.
TEST: src/components/commerce/commerce-guest-orb.vtid-04898.test.ts

AC-3 The landing itself is unchanged.
TEST: tests/e2e/staging/vtid-04894-commerce-guest-landing.staging.spec.ts; src/pages/CommercePortal.guest-landing.vtid-04894.test.ts
