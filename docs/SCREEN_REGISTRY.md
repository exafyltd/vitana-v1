# VITANA Screen Registry

**Version**: 1.0  
**Last Updated**: 2025-11-26  
**Total Screens**: 432

---

## Table of Contents

1. [Overview](#overview)
2. [Statistics](#statistics)
3. [Legend](#legend)
4. [PUBLIC & AUTHENTICATION](#public--authentication)
5. [COMMUNITY ROLE SCREENS](#community-role-screens)
6. [PATIENT ROLE SCREENS](#patient-role-screens)
7. [PROFESSIONAL ROLE SCREENS](#professional-role-screens)
8. [STAFF ROLE SCREENS](#staff-role-screens)
9. [ADMIN ROLE SCREENS](#admin-role-screens)
10. [DEV HUB SCREENS](#dev-hub-screens)
11. [GLOBAL OVERLAYS & COMPONENTS](#global-overlays--components)
12. [Cross-Reference Tables](#cross-reference-tables)

---

## Overview

This registry catalogs every screen, view, and major UI component in the VITANA platform. Each entry includes routing information, access control, implementation status, and architectural notes.

**Purpose**: Enable precise communication about features, planning, and implementation across the entire team.

---

## Statistics

| Category | Count |
|----------|-------|
| Public/Auth Screens | 24 |
| Community Role Screens | 74 |
| Patient Role Screens | 9 |
| Professional Role Screens | 9 |
| Staff Role Screens | 9 |
| Admin Role Screens | 85 |
| Dev Hub Screens | 104 |
| Global Overlays | 18 |
| **TOTAL** | **432** |

---

## Legend

### Status Icons
- ✅ **Implemented**: Fully functional screen
- 🚧 **Placeholder**: Route exists, minimal content
- ❌ **Missing**: Planned but not yet created

### UI Patterns
- **3-card-header**: Dashboard with 3 card navigation options
- **split-screen**: Left list + right detail panel
- **horizontal-list**: Scrollable card carousel
- **card-grid**: Responsive grid of cards
- **orb-overlay**: Full-screen VITANA Orb experience
- **sub-page-header**: Standard header with navigation tabs
- **data-table**: Tabular data with filters/search
- **wizard**: Multi-step form flow
- **drawer**: Slide-in panel overlay
- **dialog**: Modal popup

### Tenant Codes
- **Global**: Available across all tenants
- **Maxina**: Maxina-specific
- **Alkalma**: Alkalma-specific
- **Earthlinks**: Earthlinks-specific
- **Exafy**: Internal Exafy admin only

---

# PUBLIC & AUTHENTICATION

---

## AUTH-001: Landing Page

- **CanonicalId**: AUTH.00.001.A.PUBLIC.CLI
- **Module**: Public
- **Portal(s)**: All (Global Landing)
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/Landing.tsx
- **Component Path**: src/pages/Landing.tsx
- **UI Pattern**: Marketing landing page
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Hero section, Features, Pricing, Footer
- **Status**: ✅ Implemented
- **Purpose**: Main public entry point; marketing and onboarding funnel
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: Public page, no sensitive data
- **Event Triggers**: landing_page_viewed, cta_clicked
- **Dependencies**: None (entry point)
- **Notes**: Main public entry point; redirects authenticated users to their role dashboard

---

## AUTH-002: Generic Auth

- **CanonicalId**: AUTH.00.002.A.PUBLIC.CLI
- **Module**: Authentication
- **Portal(s)**: All
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/auth`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/Auth.tsx
- **Component Path**: src/pages/Auth.tsx
- **UI Pattern**: Tabbed auth (Sign In / Join)
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Sign In tab, Join tab, Social login buttons
- **Status**: ✅ Implemented
- **Purpose**: User authentication and registration when tenant is not specified
- **Primary APIs Used**: Supabase Auth API
- **DB Tables / Models Used**: auth.users, profiles
- **Compliance Notes**: GDPR consent required; secure password handling; session management
- **Event Triggers**: auth_signin_attempt, auth_signup_attempt, auth_success, auth_failure
- **Dependencies**: Supabase Auth, Social OAuth providers
- **Notes**: Generic auth page; can be used when no tenant specified

---

## AUTH-003: Maxina Portal Login

- **CanonicalId**: AUTH.00.003.A.PUBLIC.CLI
- **Module**: Authentication
- **Portal(s)**: Maxina
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/maxina`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/MaxinaPortal.tsx
- **Component Path**: src/pages/portals/MaxinaPortal.tsx
- **UI Pattern**: Premium glassmorphic auth with video background
- **Tenant Availability**: Maxina
- **Subscreens / Tabs / Modals**: Sign In tab, Join Maxina tab, Social login (Google, Apple), Footer navigation
- **Status**: ✅ Implemented
- **Purpose**: Maxina tenant-specific authentication with premium wellness brand experience
- **Primary APIs Used**: Supabase Auth API, Social OAuth APIs
- **DB Tables / Models Used**: auth.users, profiles, tenants
- **Compliance Notes**: GDPR consent; secure password handling; session management; wellness platform terms
- **Event Triggers**: maxina_auth_signin, maxina_auth_signup, auth_success, ambient_music_played
- **Dependencies**: Supabase Auth, Google/Apple OAuth, Ambient music player, Video background loader
- **Notes**: Features daily rotating video background, ambient music, glassmorphic card, premium button styling

---

## AUTH-004: Alkalma Portal Login

- **CanonicalId**: AUTH.00.004.A.PUBLIC.CLI
- **Module**: Authentication
- **Portal(s)**: Alkalma
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/alkalma`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/AlkalmaPortal.tsx
- **Component Path**: src/pages/portals/AlkalmaPortal.tsx
- **UI Pattern**: Branded auth screen
- **Tenant Availability**: Alkalma
- **Subscreens / Tabs / Modals**: Sign In tab, Join tab
- **Status**: 🚧 Placeholder
- **Purpose**: Alkalma tenant-specific authentication
- **Primary APIs Used**: Supabase Auth API
- **DB Tables / Models Used**: auth.users, profiles, tenants
- **Compliance Notes**: GDPR consent; secure password handling; session management
- **Event Triggers**: alkalma_auth_signin, alkalma_auth_signup, auth_success
- **Dependencies**: Supabase Auth
- **Notes**: Needs visual upgrade to match Maxina premium design

---

## AUTH-005: Earthlinks Portal Login

- **CanonicalId**: AUTH.00.005.A.PUBLIC.CLI
- **Module**: Authentication
- **Portal(s)**: Earthlinks
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/earthlinks`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/EarthlinksPortal.tsx
- **Component Path**: src/pages/portals/EarthlinksPortal.tsx
- **UI Pattern**: Branded auth screen
- **Tenant Availability**: Earthlinks
- **Subscreens / Tabs / Modals**: Sign In tab, Join tab
- **Status**: 🚧 Placeholder
- **Purpose**: Earthlinks tenant-specific authentication
- **Primary APIs Used**: Supabase Auth API
- **DB Tables / Models Used**: auth.users, profiles, tenants
- **Compliance Notes**: GDPR consent; secure password handling; session management
- **Event Triggers**: earthlinks_auth_signin, earthlinks_auth_signup, auth_success
- **Dependencies**: Supabase Auth
- **Notes**: Needs visual upgrade to match Maxina premium design

---

## AUTH-006: Community Portal Login

- **CanonicalId**: AUTH.00.006.A.PUBLIC.CLI
- **Module**: Authentication
- **Portal(s)**: Community (public)
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/community`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/CommunityPortal.tsx
- **Component Path**: src/pages/portals/CommunityPortal.tsx
- **UI Pattern**: Branded auth screen
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Sign In tab, Join Community tab
- **Status**: 🚧 Placeholder
- **Purpose**: Public community authentication for users not part of specific tenant
- **Primary APIs Used**: Supabase Auth API
- **DB Tables / Models Used**: auth.users, profiles
- **Compliance Notes**: GDPR consent; secure password handling; session management
- **Event Triggers**: community_auth_signin, community_auth_signup, auth_success
- **Dependencies**: Supabase Auth
- **Notes**: For users not part of specific tenant

---

## AUTH-007: Exafy Admin Portal Login

- **CanonicalId**: AUTH.00.007.A.ADMIN.INT
- **Module**: Authentication
- **Portal(s)**: Exafy (Internal)
- **Roles with access**: Exafy Admin only
- **External Route (client URL)**: `/exafy-admin`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/ExafyAdminPortal.tsx
- **Component Path**: src/pages/portals/ExafyAdminPortal.tsx
- **UI Pattern**: Branded auth screen
- **Tenant Availability**: Exafy
- **Subscreens / Tabs / Modals**: Sign In only (no public join)
- **Status**: 🚧 Placeholder
- **Purpose**: Exafy organization admin authentication
- **Primary APIs Used**: Supabase Auth API
- **DB Tables / Models Used**: auth.users, profiles, admin_roles
- **Compliance Notes**: Admin-only access; MFA recommended; session timeout; audit logging required
- **Event Triggers**: exafy_admin_signin, auth_success, admin_access_logged
- **Dependencies**: Supabase Auth, Admin role verification
- **Notes**: Internal portal for Exafy organization administrators

---

## AUTH-008: Intro Experience

- **CanonicalId**: AUTH.00.008.A.PUBLIC.CLI
- **Module**: Onboarding
- **Portal(s)**: All tenants
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/_intro/:tenantSlug`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/intro/IntroExperience.tsx
- **Component Path**: src/pages/intro/IntroExperience.tsx
- **UI Pattern**: Video background with voice welcome
- **Tenant Availability**: Global (tenant-specific content)
- **Subscreens / Tabs / Modals**: Welcome message, "Play Welcome" TTS, Continue to Login, VITANA Orb intro animation
- **Status**: ✅ Implemented
- **Purpose**: Premium onboarding experience with voice welcome and ambient music
- **Primary APIs Used**: TTS API (Vertex AI), Video service
- **DB Tables / Models Used**: tenants
- **Compliance Notes**: Public content; audio autoplay compliance
- **Event Triggers**: intro_viewed, intro_audio_played, intro_continued, vitana_orb_revealed
- **Dependencies**: Video loader, TTS service, Ambient music player, VitanaGuideOrbIntro
- **Notes**: Features ambient music, daily rotating video, voice greeting, smooth transitions to login

---

## AUTH-009: Email Confirmation (Maxina)

- **CanonicalId**: AUTH.00.009.A.PUBLIC.CLI
- **Module**: Authentication
- **Portal(s)**: Maxina
- **Roles with access**: Public (via email link)
- **External Route (client URL)**: `/maxina/confirmed`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/MaxinaConfirmed.tsx
- **Component Path**: src/pages/portals/MaxinaConfirmed.tsx
- **UI Pattern**: Confirmation screen
- **Tenant Availability**: Maxina
- **Subscreens / Tabs / Modals**: Success message, Continue button
- **Status**: ✅ Implemented
- **Purpose**: Email verification confirmation for Maxina users
- **Primary APIs Used**: Supabase Auth API
- **DB Tables / Models Used**: auth.users
- **Compliance Notes**: Email verification required; secure token handling
- **Event Triggers**: email_confirmed, account_verified
- **Dependencies**: Supabase Auth email verification
- **Notes**: Shown after email verification link clicked

---

## AUTH-010: Email Confirmation (Alkalma)

- **CanonicalId**: AUTH.00.010.A.PUBLIC.CLI
- **Module**: Authentication
- **Portal(s)**: Alkalma
- **Roles with access**: Public (via email link)
- **External Route (client URL)**: `/alkalma/confirmed`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/AlkalmaConfirmed.tsx
- **Component Path**: src/pages/portals/AlkalmaConfirmed.tsx
- **UI Pattern**: Confirmation screen
- **Tenant Availability**: Alkalma
- **Subscreens / Tabs / Modals**: Success message, Continue button
- **Status**: ✅ Implemented
- **Purpose**: Email verification confirmation for Alkalma users
- **Primary APIs Used**: Supabase Auth API
- **DB Tables / Models Used**: auth.users
- **Compliance Notes**: Email verification required; secure token handling
- **Event Triggers**: email_confirmed, account_verified
- **Dependencies**: Supabase Auth email verification
- **Notes**: Shown after email verification link clicked

---

## AUTH-011: Email Confirmation (Earthlinks)

- **CanonicalId**: AUTH.00.011.A.PUBLIC.CLI
- **Module**: Authentication
- **Portal(s)**: Earthlinks
- **Roles with access**: Public (via email link)
- **External Route (client URL)**: `/earthlinks/confirmed`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/EarthlinksConfirmed.tsx
- **Component Path**: src/pages/portals/EarthlinksConfirmed.tsx
- **UI Pattern**: Confirmation screen
- **Tenant Availability**: Earthlinks
- **Subscreens / Tabs / Modals**: Success message, Continue button
- **Status**: ✅ Implemented
- **Purpose**: Email verification confirmation for Earthlinks users
- **Primary APIs Used**: Supabase Auth API
- **DB Tables / Models Used**: auth.users
- **Compliance Notes**: Email verification required; secure token handling
- **Event Triggers**: email_confirmed, account_verified
- **Dependencies**: Supabase Auth email verification
- **Notes**: Shown after email verification link clicked

---

## AUTH-012: Email Confirmation (Community)

- **CanonicalId**: AUTH.00.012.A.PUBLIC.CLI
- **Module**: Authentication
- **Portal(s)**: Community
- **Roles with access**: Public (via email link)
- **External Route (client URL)**: `/community/confirmed`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/CommunityConfirmed.tsx
- **Component Path**: src/pages/portals/CommunityConfirmed.tsx
- **UI Pattern**: Confirmation screen
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Success message, Continue button
- **Status**: ✅ Implemented
- **Purpose**: Email verification confirmation for Community users
- **Primary APIs Used**: Supabase Auth API
- **DB Tables / Models Used**: auth.users
- **Compliance Notes**: Email verification required; secure token handling
- **Event Triggers**: email_confirmed, account_verified
- **Dependencies**: Supabase Auth email verification
- **Notes**: Shown after email verification link clicked

---

## AUTH-013: Email Confirmation (Exafy)

- **CanonicalId**: AUTH.00.013.A.ADMIN.INT
- **Module**: Authentication
- **Portal(s)**: Exafy
- **Roles with access**: Exafy Admin (via email link)
- **External Route (client URL)**: `/exafy-admin/confirmed`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/ExafyAdminConfirmed.tsx
- **Component Path**: src/pages/portals/ExafyAdminConfirmed.tsx
- **UI Pattern**: Confirmation screen
- **Tenant Availability**: Exafy
- **Subscreens / Tabs / Modals**: Success message, Continue button
- **Status**: ✅ Implemented
- **Purpose**: Email verification confirmation for Exafy admin users
- **Primary APIs Used**: Supabase Auth API
- **DB Tables / Models Used**: auth.users, admin_roles
- **Compliance Notes**: Admin email verification; audit logging required
- **Event Triggers**: admin_email_confirmed, account_verified, admin_access_logged
- **Dependencies**: Supabase Auth email verification, Admin role verification
- **Notes**: Shown after email verification link clicked

---

## AUTH-014: Not Found (404)

- **CanonicalId**: AUTH.00.014.A.ALL.CLI
- **Module**: Error
- **Portal(s)**: All
- **Roles with access**: All
- **External Route (client URL)**: `*` (catch-all)
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/NotFound.tsx
- **Component Path**: src/pages/NotFound.tsx
- **UI Pattern**: Error screen
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: 404 message, Back to Home button
- **Status**: ✅ Implemented
- **Purpose**: Error handling for invalid routes
- **Primary APIs Used**: None
- **DB Tables / Models Used**: None
- **Compliance Notes**: Public error page; no sensitive data exposure
- **Event Triggers**: 404_error_viewed, route_not_found
- **Dependencies**: React Router
- **Notes**: Shown for invalid routes

---

## AUTH-015: Legacy Profile Redirect

- **CanonicalId**: AUTH.00.015.A.ALL.CLI
- **Module**: Utility
- **Portal(s)**: All
- **Roles with access**: All
- **External Route (client URL)**: `/profile/:id`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/components/LegacyProfileRedirect.tsx
- **Component Path**: src/components/LegacyProfileRedirect.tsx
- **UI Pattern**: Redirect component
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: ✅ Implemented
- **Purpose**: Backwards compatibility for old profile URL format
- **Primary APIs Used**: Profile API (to resolve ID to handle)
- **DB Tables / Models Used**: profiles
- **Compliance Notes**: None (redirect only)
- **Event Triggers**: legacy_profile_redirect
- **Dependencies**: React Router, Profile service
- **Notes**: Redirects old profile URLs to new `/u/:handle` format

---

## AUTH-013: Email Confirmation (Exafy)

- **CanonicalId**: AUTH.00.013.A.ADMIN.INT
- **Module**: Authentication
- **Portal(s)**: Exafy
- **Roles with access**: Exafy Admin (via email link)
- **External Route (client URL)**: `/exafy-admin/confirmed`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/ExafyAdminConfirmed.tsx
- **Component Path**: src/pages/portals/ExafyAdminConfirmed.tsx
- **UI Pattern**: Confirmation screen
- **Tenant Availability**: Exafy
- **Subscreens / Tabs / Modals**: Success message, Continue button
- **Status**: ✅ Implemented
- **Notes**: Shown after email verification link clicked

---

## AUTH-014: Not Found (404)

- **CanonicalId**: AUTH.00.014.A.ALL.CLI
- **Module**: Error
- **Portal(s)**: All
- **Roles with access**: All
- **External Route (client URL)**: `*` (catch-all)
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/NotFound.tsx
- **Component Path**: src/pages/NotFound.tsx
- **UI Pattern**: Error screen
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: 404 message, Back to Home button
- **Status**: ✅ Implemented
- **Notes**: Shown for invalid routes

---

## AUTH-015: Legacy Profile Redirect

- **CanonicalId**: AUTH.00.015.A.ALL.CLI
- **Module**: Utility
- **Portal(s)**: All
- **Roles with access**: All
- **External Route (client URL)**: `/profile/:id`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/components/LegacyProfileRedirect.tsx
- **Component Path**: src/components/LegacyProfileRedirect.tsx
- **UI Pattern**: Redirect component
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: ✅ Implemented
- **Notes**: Redirects old profile URLs to new `/u/:handle` format

---

## AUTH-016: Maxina Portal

- **CanonicalId**: AUTH.00.016.A.MAXINA.CLI
- **Module**: Portal
- **Portal(s)**: Maxina
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/maxina`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/MaxinaPortal.tsx
- **Component Path**: src/pages/portals/MaxinaPortal.tsx
- **UI Pattern**: Auth portal with video background
- **Tenant Availability**: Maxina
- **Subscreens / Tabs / Modals**: Sign In tab, Join Maxina tab, Social login options
- **Status**: ✅ Implemented
- **Purpose**: Maxina tenant-specific authentication portal with premium video background and glassmorphic design
- **Primary APIs Used**: Supabase Auth API, Google OAuth, Apple OAuth
- **DB Tables / Models Used**: auth.users
- **Compliance Notes**: Public authentication page; HIPAA/GDPR compliant auth flow
- **Event Triggers**: portal_viewed, auth_initiated, login_success, login_failed, social_login_clicked
- **Dependencies**: AuthContext, SoundscapeContext (ambient music)
- **Notes**: Premium auth experience with daily rotating video backgrounds; part of VITANA ecosystem

---

## AUTH-017: Maxina Email Confirmed

- **CanonicalId**: AUTH.00.017.A.MAXINA.CLI
- **Module**: Portal
- **Portal(s)**: Maxina
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/maxina/confirmed`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/MaxinaConfirmed.tsx
- **Component Path**: src/pages/portals/MaxinaConfirmed.tsx
- **UI Pattern**: Confirmation screen
- **Tenant Availability**: Maxina
- **Subscreens / Tabs / Modals**: Success message, Continue to app button
- **Status**: ✅ Implemented
- **Purpose**: Email confirmation success page for Maxina portal
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: Post-registration confirmation; no sensitive data
- **Event Triggers**: email_confirmed_viewed, continue_clicked
- **Dependencies**: AuthContext
- **Notes**: Post-email-verification landing page

---

## AUTH-018: Alkalma Portal

- **CanonicalId**: AUTH.00.018.A.ALKALMA.CLI
- **Module**: Portal
- **Portal(s)**: Alkalma
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/alkalma`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/AlkalmaPortal.tsx
- **Component Path**: src/pages/portals/AlkalmaPortal.tsx
- **UI Pattern**: Auth portal
- **Tenant Availability**: Alkalma
- **Subscreens / Tabs / Modals**: Sign In tab, Join Alkalma tab
- **Status**: ✅ Implemented
- **Purpose**: Alkalma tenant-specific authentication portal
- **Primary APIs Used**: Supabase Auth API, Social OAuth
- **DB Tables / Models Used**: auth.users
- **Compliance Notes**: Public authentication page; HIPAA/GDPR compliant
- **Event Triggers**: portal_viewed, auth_initiated
- **Dependencies**: AuthContext
- **Notes**: Tenant-specific auth portal for Alkalma

---

## AUTH-019: Alkalma Email Confirmed

- **CanonicalId**: AUTH.00.019.A.ALKALMA.CLI
- **Module**: Portal
- **Portal(s)**: Alkalma
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/alkalma/confirmed`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/AlkalmaConfirmed.tsx
- **Component Path**: src/pages/portals/AlkalmaConfirmed.tsx
- **UI Pattern**: Confirmation screen
- **Tenant Availability**: Alkalma
- **Subscreens / Tabs / Modals**: Success message
- **Status**: ✅ Implemented
- **Purpose**: Email confirmation success page for Alkalma portal
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: Post-registration confirmation
- **Event Triggers**: email_confirmed_viewed
- **Dependencies**: AuthContext
- **Notes**: Post-email-verification landing page

---

## AUTH-020: Earthlinks Portal

- **CanonicalId**: AUTH.00.020.A.EARTHLINKS.CLI
- **Module**: Portal
- **Portal(s)**: Earthlinks
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/earthlinks`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/EarthlinksPortal.tsx
- **Component Path**: src/pages/portals/EarthlinksPortal.tsx
- **UI Pattern**: Auth portal
- **Tenant Availability**: Earthlinks
- **Subscreens / Tabs / Modals**: Sign In tab, Join Earthlinks tab
- **Status**: ✅ Implemented
- **Purpose**: Earthlinks tenant-specific authentication portal
- **Primary APIs Used**: Supabase Auth API, Social OAuth
- **DB Tables / Models Used**: auth.users
- **Compliance Notes**: Public authentication page
- **Event Triggers**: portal_viewed, auth_initiated
- **Dependencies**: AuthContext
- **Notes**: Tenant-specific auth portal for Earthlinks

---

## AUTH-021: Earthlinks Email Confirmed

- **CanonicalId**: AUTH.00.021.A.EARTHLINKS.CLI
- **Module**: Portal
- **Portal(s)**: Earthlinks
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/earthlinks/confirmed`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/EarthlinksConfirmed.tsx
- **Component Path**: src/pages/portals/EarthlinksConfirmed.tsx
- **UI Pattern**: Confirmation screen
- **Tenant Availability**: Earthlinks
- **Subscreens / Tabs / Modals**: Success message
- **Status**: ✅ Implemented
- **Purpose**: Email confirmation success page for Earthlinks portal
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: Post-registration confirmation
- **Event Triggers**: email_confirmed_viewed
- **Dependencies**: AuthContext
- **Notes**: Post-email-verification landing page

---

## AUTH-022: Community Portal

- **CanonicalId**: AUTH.00.022.A.COMMUNITY.CLI
- **Module**: Portal
- **Portal(s)**: Community (Public)
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/community-portal`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/CommunityPortal.tsx
- **Component Path**: src/pages/portals/CommunityPortal.tsx
- **UI Pattern**: Auth portal
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Sign In tab, Join Community tab
- **Status**: ✅ Implemented
- **Purpose**: Public community authentication portal
- **Primary APIs Used**: Supabase Auth API
- **DB Tables / Models Used**: auth.users
- **Compliance Notes**: Public authentication page
- **Event Triggers**: portal_viewed, auth_initiated
- **Dependencies**: AuthContext
- **Notes**: General public portal for community access

---

## AUTH-023: Community Email Confirmed

- **CanonicalId**: AUTH.00.023.A.COMMUNITY.CLI
- **Module**: Portal
- **Portal(s)**: Community (Public)
- **Roles with access**: Public (unauthenticated)
- **External Route (client URL)**: `/community-portal/confirmed`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/CommunityConfirmed.tsx
- **Component Path**: src/pages/portals/CommunityConfirmed.tsx
- **UI Pattern**: Confirmation screen
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Success message
- **Status**: ✅ Implemented
- **Purpose**: Email confirmation success page for Community portal
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: Post-registration confirmation
- **Event Triggers**: email_confirmed_viewed
- **Dependencies**: AuthContext
- **Notes**: Post-email-verification landing page

---

## AUTH-024: Exafy Admin Portal

- **CanonicalId**: AUTH.00.024.A.EXAFY.CLI
- **Module**: Portal
- **Portal(s)**: Exafy (Internal)
- **Roles with access**: Exafy Admin only
- **External Route (client URL)**: `/exafy-admin`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/portals/ExafyAdminPortal.tsx
- **Component Path**: src/pages/portals/ExafyAdminPortal.tsx
- **UI Pattern**: Admin auth portal
- **Tenant Availability**: Exafy (Internal)
- **Subscreens / Tabs / Modals**: Admin login
- **Status**: ✅ Implemented
- **Purpose**: Internal Exafy admin authentication portal
- **Primary APIs Used**: Supabase Auth API
- **DB Tables / Models Used**: auth.users, admin roles
- **Compliance Notes**: Internal admin access only; elevated security
- **Event Triggers**: admin_portal_viewed, admin_auth_initiated
- **Dependencies**: AuthContext, Admin role verification
- **Notes**: Internal admin portal for Exafy platform management

---

# COMMUNITY ROLE SCREENS

---

## HOME-001: Home Overview

- **CanonicalId**: HOME.00.001.A.ALL.CLI
- **Module**: Home
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/home`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/Home.tsx
- **Component Path**: src/pages/Home.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Context, Actions, Matches, AI Feed cards
- **Status**: ✅ Implemented
- **Purpose**: Primary dashboard for all authenticated users; role-aware home screen
- **Primary APIs Used**: User profile API, Matches API, AI recommendations API
- **DB Tables / Models Used**: profiles, daily_matches, ai_recommendations, calendar_events
- **Compliance Notes**: User-specific data; RLS enforced
- **Event Triggers**: home_viewed, card_clicked, screen_id:HOME-001
- **Dependencies**: AuthProvider, RoleProvider, UtilityBar
- **Notes**: Primary dashboard for all authenticated users; Screen ID D1-001

---

## HOME-002: Context

- **CanonicalId**: HOME.00.002.A.ALL.CLI
- **Module**: Home
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/home/context`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/home/Context.tsx
- **Component Path**: src/pages/home/Context.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: User context and recent activity summary
- **Primary APIs Used**: Activity API, Context API
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: User-specific data; RLS enforced
- **Event Triggers**: context_viewed, screen_id:HOME-002
- **Dependencies**: AuthProvider
- **Notes**: User context and recent activity; Screen ID D1-001-01

---

## HOME-003: Actions

- **CanonicalId**: HOME.00.003.A.ALL.CLI
- **Module**: Home
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/home/actions`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/home/Actions.tsx
- **Component Path**: src/pages/home/Actions.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: Quick actions and shortcuts dashboard
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: User-specific data; RLS enforced
- **Event Triggers**: actions_viewed, action_clicked, screen_id:HOME-003
- **Dependencies**: AuthProvider
- **Notes**: Quick actions and shortcuts; Screen ID D1-001-02

---

## HOME-004: Matches

- **CanonicalId**: HOME.00.004.A.ALL.CLI
- **Module**: Home
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/home/matches`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/home/Matches.tsx
- **Component Path**: src/pages/home/Matches.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: AI-powered connection matches and recommendations
- **Primary APIs Used**: Matches API, AI recommendations API
- **DB Tables / Models Used**: daily_matches
- **Compliance Notes**: User-specific data; AI-generated content; RLS enforced
- **Event Triggers**: matches_viewed, match_actioned, screen_id:HOME-004
- **Dependencies**: AuthProvider, AI service
- **Notes**: AI-powered connection matches; Screen ID D1-001-03

---

## HOME-005: AI Feed

- **CanonicalId**: HOME.00.005.A.ALL.CLI
- **Module**: Home
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/home/aifeed`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/home/AIFeed.tsx
- **Component Path**: src/pages/home/AIFeed.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: Personalized AI-generated content feed
- **Primary APIs Used**: AI Feed API
- **DB Tables / Models Used**: ai_recommendations
- **Compliance Notes**: AI-generated content; user-specific; RLS enforced
- **Event Triggers**: ai_feed_viewed, feed_item_clicked, screen_id:HOME-005
- **Dependencies**: AuthProvider, AI service
- **Notes**: Personalized AI-generated content feed; Screen ID D1-001-04

---

## COMM-001: Community Overview

- **CanonicalId**: COMM.00.001.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/community`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/Community.tsx
- **Component Path**: src/pages/Community.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Feed, Events, Live Rooms, Media Hub, My Business, Meetups navigation cards
- **Status**: ✅ Implemented
- **Purpose**: Community hub dashboard; social interaction entry point
- **Primary APIs Used**: Community API, Events API, Live Rooms API
- **DB Tables / Models Used**: global_community_groups, global_community_events, community_live_streams
- **Compliance Notes**: User-generated content; moderation required; RLS enforced
- **Event Triggers**: community_viewed, community_card_clicked, screen_id:COMM-001
- **Dependencies**: AuthProvider, CommunityContext
- **Notes**: Community hub dashboard; Screen ID D1-002

---

## COMM-002: Events & Meetups

- **CanonicalId**: COMM.00.002.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/community/events`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/community/EventsAndMeetups.tsx
- **Component Path**: src/pages/community/EventsAndMeetups.tsx
- **UI Pattern**: card-grid with tabs
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Community Events tab, Meetups tab, Event details drawer, Create event popup
- **Status**: ✅ Implemented
- **Purpose**: Combined events and meetups discovery and management
- **Primary APIs Used**: Events API, Meetups API
- **DB Tables / Models Used**: global_community_events, event_attendees, event_recommendations
- **Compliance Notes**: User-generated content; moderation required; calendar permissions; RLS enforced
- **Event Triggers**: events_viewed, event_clicked, event_created, rsvp_submitted, screen_id:COMM-002
- **Dependencies**: AuthProvider, EventDialog, MeetupDetailsDrawer, ProfilePreviewDialog
- **Notes**: Combined events and meetups view; Screen ID D1-002-03 / D1-002-07

---

## COMM-003: Live Rooms

- **CanonicalId**: COMM.00.003.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/community/live-rooms`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/community/LiveRooms.tsx
- **Component Path**: src/pages/community/LiveRooms.tsx
- **UI Pattern**: card-grid
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Live room cards, Create live room popup, Join room action
- **Status**: ✅ Implemented
- **Notes**: Live audio/video rooms; Screen ID D1-002-04

---

## COMM-004: Media Hub

- **CanonicalId**: COMM.00.004.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/community/media-hub`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/community/MediaHub.tsx
- **Component Path**: src/pages/community/MediaHub.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Community media library; Screen ID D1-002-05

---

## COMM-005: My Business

- **CanonicalId**: COMM.00.005.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/community/my-business`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/community/MyBusiness.tsx
- **Component Path**: src/pages/community/MyBusiness.tsx
- **UI Pattern**: split-screen
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Business profile setup, Services, Booking calendar
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Business profile management for professionals; Screen ID D1-002-06

---

## COMM-006: Group Detail

- **CanonicalId**: COMM.00.006.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/community/groups/:groupId`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/community/GroupDetail.tsx
- **Component Path**: src/pages/community/GroupDetail.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Group info, Members, Posts, Events
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Individual group page

---

## COMM-007: Feed

- **CanonicalId**: COMM.00.007.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/community/feed`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/community/Feed.tsx
- **Component Path**: src/pages/community/Feed.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Post cards, Create post popup
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Community social feed; Screen ID D1-002-02

---

## COMM-008: Challenges

- **CanonicalId**: COMM.00.008.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/community/challenges`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/community/Challenges.tsx
- **Component Path**: src/pages/community/Challenges.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Wellness challenges and competitions

---

## COMM-009: Groups

- **CanonicalId**: COMM.00.009.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/community/groups`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/community/Groups.tsx
- **Component Path**: src/pages/community/Groups.tsx
- **UI Pattern**: split-screen with tabs
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: My Groups tab, Recommended Groups tab, Create group popup
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Community groups discovery and management; Screen ID D1-002-01

---

## COMM-010: My Groups

- **CanonicalId**: COMM.00.010.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/community/my-groups`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/community/MyGroups.tsx
- **Component Path**: src/pages/community/MyGroups.tsx
- **UI Pattern**: split-screen
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: My groups list, Group details
- **Status**: ✅ Implemented
- **Purpose**: User's joined groups management and overview
- **Primary APIs Used**: Groups API, Supabase API
- **DB Tables / Models Used**: global_community_groups, global_community_group_members
- **Compliance Notes**: User-specific group data; RLS enforced
- **Event Triggers**: my_groups_viewed, group_selected, screen_id:COMM-010
- **Dependencies**: AuthProvider, GroupContext
- **Notes**: User's personal group management

---

## COMM-011: Group Detail

- **CanonicalId**: COMM.00.011.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/community/groups/:groupId`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/community/GroupDetail.tsx
- **Component Path**: src/pages/community/GroupDetail.tsx
- **UI Pattern**: Detail page
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Group info, Members, Posts, Events
- **Status**: ✅ Implemented
- **Purpose**: Detailed view of a specific community group
- **Primary APIs Used**: Groups API
- **DB Tables / Models Used**: global_community_groups, global_community_group_members
- **Compliance Notes**: Group visibility controlled by privacy settings
- **Event Triggers**: group_detail_viewed, member_action, screen_id:COMM-011
- **Dependencies**: AuthProvider, GroupContext
- **Notes**: Individual group detail and management

---

## COMM-012: My Business

- **CanonicalId**: COMM.00.012.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Professional, Admin
- **External Route (client URL)**: `/community/my-business`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/community/MyBusinessRenamed.tsx
- **Component Path**: src/pages/community/MyBusinessRenamed.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Services, Events, Bookings
- **Status**: ✅ Implemented
- **Purpose**: Professional's business management dashboard
- **Primary APIs Used**: Business API, Services API
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: Business owner access only; RLS enforced
- **Event Triggers**: business_dashboard_viewed, service_managed, screen_id:COMM-012
- **Dependencies**: AuthProvider, Professional role
- **Notes**: Business profile and services management

---

## COMM-013: Media Hub

- **CanonicalId**: COMM.00.013.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/community/media`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/community/MediaHub.tsx
- **Component Path**: src/pages/community/MediaHub.tsx
- **UI Pattern**: Media gallery
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Photos tab, Videos tab, Audio tab
- **Status**: ✅ Implemented
- **Purpose**: Community media content hub and gallery
- **Primary APIs Used**: Media API, Supabase Storage
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: User-generated content; content moderation applies
- **Event Triggers**: media_hub_viewed, media_played, screen_id:COMM-013
- **Dependencies**: AuthProvider
- **Notes**: Community media content library

---

## COMM-014: AI Insights

- **CanonicalId**: COMM.00.014.A.ALL.CLI
- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/community/ai-insights`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/community/AIInsights.tsx
- **Component Path**: src/pages/community/AIInsights.tsx
- **UI Pattern**: Insights dashboard
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Trending topics, Recommended connections, Activity insights
- **Status**: ✅ Implemented
- **Purpose**: AI-powered community insights and analytics
- **Primary APIs Used**: AI Analytics API, Recommendations API
- **DB Tables / Models Used**: ai_recommendations, ai_situation_analyses
- **Compliance Notes**: AI-generated insights; user privacy maintained
- **Event Triggers**: ai_insights_viewed, insight_clicked, screen_id:COMM-014
- **Dependencies**: AuthProvider, AI service
- **Notes**: AI-driven community analytics and recommendations

---

## DISC-001: Discover Overview

- **CanonicalId**: DISC.00.001.A.ALL.CLI
- **Module**: Discover
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/discover`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/Discover.tsx
- **Component Path**: src/pages/Discover.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Wellness Services, Doctors/Coaches, Deals/Offers, Orders navigation cards
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Discover marketplace hub; Screen ID D1-003

---

## DISC-002: Supplements

- **CanonicalId**: DISC.00.002.A.ALL.CLI
- **Module**: Discover
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/discover/supplements`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/discover/Supplements.tsx
- **Component Path**: src/pages/discover/Supplements.tsx
- **UI Pattern**: card-grid
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Product cards, Filter sidebar, Product detail page
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Supplement marketplace powered by CJ Dropshipping

---

## DISC-003: Wellness Services

- **CanonicalId**: DISC.00.003.A.ALL.CLI
- **Module**: Discover
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/discover/wellness-services`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/discover/WellnessServices.tsx
- **Component Path**: src/pages/discover/WellnessServices.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Wellness services discovery; Screen ID D1-003-01

---

## DISC-004: Doctors & Coaches

- **CanonicalId**: DISC.00.004.A.ALL.CLI
- **Module**: Discover
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/discover/doctors-coaches`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/discover/DoctorsCoaches.tsx
- **Component Path**: src/pages/discover/DoctorsCoaches.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Healthcare professional discovery; Screen ID D1-003-02

---

## DISC-005: Deals & Offers

- **CanonicalId**: DISC.00.005.A.ALL.CLI
- **Module**: Discover
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/discover/deals-offers`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/discover/DealsOffers.tsx
- **Component Path**: src/pages/discover/DealsOffers.tsx
- **UI Pattern**: split-screen
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Special deals and promotions; Screen ID D1-003-03

---

## DISC-006: Orders

- **CanonicalId**: DISC.00.006.A.ALL.CLI
- **Module**: Discover
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/discover/orders`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/discover/Orders.tsx
- **Component Path**: src/pages/discover/Orders.tsx
- **UI Pattern**: sub-page-header with data table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Order list, Order detail drawer, Tracking info
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: User order history; Screen ID D1-003-04

---

## DISC-007: Product Detail

- **CanonicalId**: DISC.00.007.A.ALL.CLI
- **Module**: Discover
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/discover/product/:productId`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/discover/ProductDetail.tsx
- **Component Path**: src/pages/discover/ProductDetail.tsx
- **UI Pattern**: Product detail page
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Product images, Description, Reviews, Add to cart
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Individual product detail page for supplements

---

## DISC-008: Provider Profile

- **CanonicalId**: DISC.00.008.A.ALL.CLI
- **Module**: Discover
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/discover/provider/:providerId`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/discover/ProviderProfile.tsx
- **Component Path**: src/pages/discover/ProviderProfile.tsx
- **UI Pattern**: Profile page
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Bio, Services, Reviews, Book appointment
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Healthcare provider profile page

---

## DISC-009: Cart

- **CanonicalId**: DISC.00.009.A.ALL.CLI
- **Module**: Discover
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/discover/cart`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/discover/Cart.tsx
- **Component Path**: src/pages/discover/Cart.tsx
- **UI Pattern**: Cart page
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Cart items, Checkout button, Remove items
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Shopping cart for supplements

---

## HLTH-001: Health Overview

- **CanonicalId**: HLTH.00.001.A.ALL.CLI
- **Module**: Health
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/health`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/Health.tsx
- **Component Path**: src/pages/Health.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Services Hub, My Biology, Plans, Education, Pillars, Conditions navigation cards
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Health hub dashboard; Screen ID D1-005

---

## HLTH-002: Services Hub

- **CanonicalId**: HLTH.00.002.A.ALL.CLI
- **Module**: Health
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/health/services-hub`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/health/ServicesHub.tsx
- **Component Path**: src/pages/health/ServicesHub.tsx
- **UI Pattern**: split-screen
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Health services directory; Screen ID D1-005-01

---

## HLTH-003: My Biology (Biomarkers)

- **CanonicalId**: HLTH.00.003.A.ALL.CLI
- **Module**: Health
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/health/biomarkers`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/health/Biomarkers.tsx
- **Component Path**: src/pages/health/Biomarkers.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Biomarker cards, Trend charts, Detail views
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Personal biomarker tracking; Screen ID D1-005-02

---

## HLTH-004: Plans

- **CanonicalId**: HLTH.00.004.A.ALL.CLI
- **Module**: Health
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/health/plans`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/health/Plans.tsx
- **Component Path**: src/pages/health/Plans.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Personalized health plans; Screen ID D1-005-05

---

## HLTH-005: Education

- **CanonicalId**: HLTH.00.005.A.ALL.CLI
- **Module**: Health
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/health/education`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/health/Education.tsx
- **Component Path**: src/pages/health/Education.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Health education content; Screen ID D1-005-04

---

## HLTH-006: Pillars

- **CanonicalId**: HLTH.00.006.A.ALL.CLI
- **Module**: Health
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/health/pillars`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/health/Pillars.tsx
- **Component Path**: src/pages/health/Pillars.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Health pillar tracking (sleep, nutrition, fitness, etc.)

---

## HLTH-007: Conditions & Risks

- **CanonicalId**: HLTH.00.007.A.ALL.CLI
- **Module**: Health
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/health/conditions`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/health/ConditionsRisks.tsx
- **Component Path**: src/pages/health/ConditionsRisks.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Risk assessments, Preventive action plans
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Health risk assessments and preventive planning

---

## HLTH-008: Biomarker Results

- **CanonicalId**: HLTH.00.008.A.ALL.CLI
- **Module**: Health
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/health/biomarkers`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/health/BiomarkerResults.tsx
- **Component Path**: src/pages/health/BiomarkerResults.tsx
- **UI Pattern**: Data visualization dashboard
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Lab results, Trends, Insights
- **Status**: ✅ Implemented
- **Purpose**: Biomarker test results display and trend analysis
- **Primary APIs Used**: Biomarker API, Lab results API
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: HIPAA sensitive; patient health data; strict RLS enforcement
- **Event Triggers**: biomarkers_viewed, result_detail_opened, screen_id:HLTH-008
- **Dependencies**: AuthProvider, HealthDataContext
- **Notes**: Lab results and biomarker trending

---

## HLTH-009: My Biology

- **CanonicalId**: HLTH.00.009.A.ALL.CLI
- **Module**: Health
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/health/my-biology`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/health/MyBiology.tsx
- **Component Path**: src/pages/health/MyBiology.tsx
- **UI Pattern**: Profile page
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Genetics, Biometrics, Medical history
- **Status**: ✅ Implemented
- **Purpose**: Comprehensive user biological profile and genetic data
- **Primary APIs Used**: Genetics API, Biometric API
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: Highly sensitive genetic data; HIPAA/GINA compliance required; strict access control
- **Event Triggers**: my_biology_viewed, genetic_data_accessed, screen_id:HLTH-009
- **Dependencies**: AuthProvider, HealthDataContext
- **Notes**: Personal biological and genetic profile

---

## HLTH-010: Plans

- **CanonicalId**: HLTH.00.010.A.ALL.CLI
- **Module**: Health
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/health/plans`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/health/Plans.tsx
- **Component Path**: src/pages/health/Plans.tsx
- **UI Pattern**: Plan overview
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Active plans, Completed plans, Plan details
- **Status**: ✅ Implemented
- **Purpose**: Health and wellness plan management
- **Primary APIs Used**: Plans API
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: Health plan data; user-specific; RLS enforced
- **Event Triggers**: plans_viewed, plan_started, screen_id:HLTH-010
- **Dependencies**: AuthProvider, PlansContext
- **Notes**: Personalized health plans and programs

---

## HLTH-011: Education & Resources

- **CanonicalId**: HLTH.00.011.A.ALL.CLI
- **Module**: Health
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/health/education`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/health/EducationResources.tsx
- **Component Path**: src/pages/health/EducationResources.tsx
- **UI Pattern**: Resource library
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Articles, Videos, Guides
- **Status**: ✅ Implemented
- **Purpose**: Health education content and learning resources
- **Primary APIs Used**: Content API, Education API
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: Public health information; content moderation required
- **Event Triggers**: education_viewed, resource_accessed, screen_id:HLTH-011
- **Dependencies**: ContentProvider
- **Notes**: Educational content library for wellness

---

## HLTH-012: Wellness Services

- **CanonicalId**: HLTH.00.012.A.ALL.CLI
- **Module**: Health
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/health/services`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/health/WellnessServices.tsx
- **Component Path**: src/pages/health/WellnessServices.tsx
- **UI Pattern**: Service listing
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Service categories, Provider profiles, Booking
- **Status**: ✅ Implemented
- **Purpose**: Browse and book wellness services and appointments
- **Primary APIs Used**: Services API, Booking API
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: Service provider information; booking data protected
- **Event Triggers**: wellness_services_viewed, service_booked, screen_id:HLTH-012
- **Dependencies**: AuthProvider, BookingContext
- **Notes**: Wellness service marketplace

---

## INBX-001: Inbox Overview

- **CanonicalId**: INBX.00.001.A.ALL.CLI
- **Module**: Inbox
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/inbox`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/Inbox.tsx
- **Component Path**: src/pages/Inbox.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Reminder, Inspiration, Archived navigation cards
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Inbox hub; Screen ID D1-004

---

## INBX-002: Reminder

- **CanonicalId**: INBX.00.002.A.ALL.CLI
- **Module**: Inbox
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/inbox/reminder`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/inbox/Reminder.tsx
- **Component Path**: src/pages/inbox/Reminder.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Reminder messages; Screen ID D1-004-01

---

## INBX-003: Inspiration

- **CanonicalId**: INBX.00.003.A.ALL.CLI
- **Module**: Inbox
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/inbox/inspiration`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/inbox/Inspiration.tsx
- **Component Path**: src/pages/inbox/Inspiration.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Inspirational content; Screen ID D1-004-02

---

## INBX-004: Archived

- **CanonicalId**: INBX.00.004.A.ALL.CLI
- **Module**: Inbox
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/inbox/archived`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/inbox/Archived.tsx
- **Component Path**: src/pages/inbox/Archived.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Archived messages

---

## AI-001: AI Overview

- **CanonicalId**: AI.00.001.A.ALL.CLI
- **Module**: AI
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/ai`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/ai/AIOverview.tsx
- **Component Path**: src/pages/ai/AIOverview.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Insights, Recommendations, Daily Summary, Companion navigation cards
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: AI hub dashboard

---

## AI-002: Insights

- **CanonicalId**: AI.00.002.A.ALL.CLI
- **Module**: AI
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/ai/insights`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/ai/Insights.tsx
- **Component Path**: src/pages/ai/Insights.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: AI-generated insights

---

## AI-003: Recommendations

- **CanonicalId**: AI.00.003.A.ALL.CLI
- **Module**: AI
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/ai/recommendations`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/ai/Recommendations.tsx
- **Component Path**: src/pages/ai/Recommendations.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: AI recommendations

---

## AI-004: Daily Summary

- **CanonicalId**: AI.00.004.A.ALL.CLI
- **Module**: AI
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/ai/daily-summary`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/ai/DailySummary.tsx
- **Component Path**: src/pages/ai/DailySummary.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Daily AI summary

---

## AI-005: Companion

- **CanonicalId**: AI.00.005.A.ALL.CLI
- **Module**: AI
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/ai/companion`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/ai/Companion.tsx
- **Component Path**: src/pages/ai/Companion.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: AI companion chat

---

## WLLT-001: Wallet Overview

- **CanonicalId**: WLLT.00.001.A.ALL.CLI
- **Module**: Wallet
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/wallet`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/Wallet.tsx
- **Component Path**: src/pages/Wallet.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Balance, Subscriptions, Rewards navigation cards
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Wallet hub; Screen ID D1-006

---

## WLLT-002: Balance

- **CanonicalId**: WLLT.00.002.A.ALL.CLI
- **Module**: Wallet
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/wallet/balance`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/wallet/Balance.tsx
- **Component Path**: src/pages/wallet/Balance.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Wallet balance view; Screen ID D1-006-01

---

## WLLT-003: Subscriptions

- **CanonicalId**: WLLT.00.003.A.ALL.CLI
- **Module**: Wallet
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/wallet/subscriptions`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/wallet/Subscriptions.tsx
- **Component Path**: src/pages/wallet/Subscriptions.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Active subscriptions; Screen ID D1-006-02

---

## WLLT-004: Rewards

- **CanonicalId**: WLLT.00.004.A.ALL.CLI
- **Module**: Wallet
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/wallet/rewards`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/wallet/Rewards.tsx
- **Component Path**: src/pages/wallet/Rewards.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Rewards program; Screen ID D1-006-03

---

## SHAR-001: Sharing Overview

- **CanonicalId**: SHAR.00.001.A.ALL.CLI
- **Module**: Sharing
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/sharing`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/Sharing.tsx
- **Component Path**: src/pages/Sharing.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Campaigns, Distribution, Data/Consent navigation cards
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Content sharing hub; Screen ID D1-007

---

## SHAR-002: Campaigns

- **CanonicalId**: SHAR.00.002.A.ALL.CLI
- **Module**: Sharing
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/sharing/campaigns`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/sharing/Campaigns.tsx
- **Component Path**: src/pages/sharing/Campaigns.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Campaign list, Create campaign button
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Content distribution campaigns; Screen ID D1-007-06

---

## SHAR-003: Campaign Detail

- **CanonicalId**: SHAR.00.003.A.ALL.CLI
- **Module**: Sharing
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/sharing/campaigns/:campaignId`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/sharing/CampaignDetail.tsx
- **Component Path**: src/pages/sharing/CampaignDetail.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Campaign info, Posts, Analytics
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Individual campaign management; Screen ID D1-007-07

---

## SHAR-004: Distribution

- **CanonicalId**: SHAR.00.004.A.ALL.CLI
- **Module**: Sharing
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/sharing/distribution`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/sharing/Distribution.tsx
- **Component Path**: src/pages/sharing/Distribution.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Content distribution management

---

## SHAR-005: Data & Consent

- **CanonicalId**: SHAR.00.005.A.ALL.CLI
- **Module**: Sharing
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/sharing/data-consent`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/sharing/DataConsent.tsx
- **Component Path**: src/pages/sharing/DataConsent.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Data sharing consent management

---

## MEMO-001: Memory Overview

- **CanonicalId**: MEMO.00.001.A.ALL.CLI
- **Module**: Memory
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/memory`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/Memory.tsx
- **Component Path**: src/pages/Memory.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Timeline, Diary, Recall, Permissions navigation cards
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Memory hub; Screen ID D1-008

---

## MEMO-002: Timeline

- **CanonicalId**: MEMO.00.002.A.ALL.CLI
- **Module**: Memory
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/memory/timeline`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/memory/Timeline.tsx
- **Component Path**: src/pages/memory/Timeline.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Life timeline view; Screen ID D1-008-01

---

## MEMO-003: Diary

- **CanonicalId**: MEMO.00.003.A.ALL.CLI
- **Module**: Memory
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/memory/diary`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/memory/Diary.tsx
- **Component Path**: src/pages/memory/Diary.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Diary entries, Create entry popup
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Personal diary/journal; Screen ID D1-008-02

---

## MEMO-004: Recall

- **CanonicalId**: MEMO.00.004.A.ALL.CLI
- **Module**: Memory
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/memory/recall`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/memory/Recall.tsx
- **Component Path**: src/pages/memory/Recall.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: AI-powered memory recall; Screen ID D1-008-03

---

## MEMO-005: Permissions

- **CanonicalId**: MEMO.00.005.A.ALL.CLI
- **Module**: Memory
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/memory/permissions`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/memory/Permissions.tsx
- **Component Path**: src/pages/memory/Permissions.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Memory sharing permissions; Screen ID D1-008-04

---

## SETT-001: Settings Overview

- **CanonicalId**: SETT.00.001.A.ALL.CLI
- **Module**: Settings
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/settings`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/Settings.tsx
- **Component Path**: src/pages/Settings.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Preferences, Privacy, Notifications, Connected Apps, Billing, Support navigation cards
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Settings hub; Screen ID D1-009

---

## SETT-002: Preferences

- **CanonicalId**: SETT.00.002.A.ALL.CLI
- **Module**: Settings
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/settings/preferences`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/settings/Preferences.tsx
- **Component Path**: src/pages/settings/Preferences.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: User preferences; Screen ID D1-009-01

---

## SETT-003: Privacy

- **CanonicalId**: SETT.00.003.A.ALL.CLI
- **Module**: Settings
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/settings/privacy`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/settings/Privacy.tsx
- **Component Path**: src/pages/settings/Privacy.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Privacy settings; Screen ID D1-009-02

---

## SETT-004: Notifications

- **CanonicalId**: SETT.00.004.A.ALL.CLI
- **Module**: Settings
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/settings/notifications`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/settings/Notifications.tsx
- **Component Path**: src/pages/settings/Notifications.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Notification preferences

---

## SETT-005: Connected Apps

- **CanonicalId**: SETT.00.005.A.ALL.CLI
- **Module**: Settings
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/settings/connected-apps`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/settings/ConnectedApps.tsx
- **Component Path**: src/pages/settings/ConnectedApps.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Third-party app integrations; Screen ID D1-009-03

---

## SETT-006: Billing & Rewards

- **CanonicalId**: SETT.00.006.A.ALL.CLI
- **Module**: Settings
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/settings/billing-rewards`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/settings/BillingRewards.tsx
- **Component Path**: src/pages/settings/BillingRewards.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Billing and rewards; Screen ID D1-009-04

---

## SETT-007: Support

- **Module**: Settings
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/settings/support`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/settings/Support.tsx
- **Component Path**: src/pages/settings/Support.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Help and support

---

## SETT-008: Tenant & Role

- **Module**: Settings
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/settings/tenant-role`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/settings/TenantRole.tsx
- **Component Path**: src/pages/settings/TenantRole.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Role selector, Tenant info
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Tenant and role management for multi-role users

---

## SETT-009: Autopilot Settings

- **CanonicalId**: SETT.00.009.A.ALL.CLI
- **Module**: Settings
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/settings/autopilot`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/settings/AutopilotSettings.tsx
- **Component Path**: src/pages/settings/AutopilotSettings.tsx
- **UI Pattern**: sub-page-header with cards
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Master switch, Action categories, Frequency & timing controls
- **Status**: ✅ Implemented
- **Purpose**: Configure personal autopilot automation preferences including action categories, daily limits, quiet hours, and priority filters
- **Primary APIs Used**: Supabase API for user_preferences table read/update
- **DB Tables / Models Used**: user_preferences (autopilot_enabled, autopilot_categories, autopilot_max_actions_per_day, autopilot_quiet_hours_start, autopilot_quiet_hours_end, autopilot_priority_filter)
- **Compliance Notes**: User-specific automation preferences; all data is personal and non-medical; RLS enforced per user
- **Event Triggers**: autopilot_settings_viewed, autopilot_enabled_toggled, autopilot_category_changed, autopilot_frequency_changed, screen_id:SETT-009
- **Dependencies**: useUserPreferences hook, AuthProvider, settingsNavigation config, AppLayout, SubNavigation
- **Notes**: Manages autopilot action preferences including health, community, discovery, and memory categories; controls daily action limits (1-20 per day) and quiet hours scheduling

---

## SETT-010: Voice AI Settings

- **CanonicalId**: SETT.00.010.A.ALL.CLI
- **Module**: Settings
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/settings/voice-ai`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/settings/VoiceAISettings.tsx
- **Component Path**: src/pages/settings/VoiceAISettings.tsx
- **UI Pattern**: sub-page-header with tabs (Voice, AI Models, Privacy)
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Voice tab (TTS/STT settings), AI Models tab (model selection), Privacy tab (data controls)
- **Status**: ✅ Implemented
- **Purpose**: Configure voice recognition (STT), text-to-speech (TTS), and AI assistant preferences including language, voice selection, speech parameters, AI model choices, and voice data retention settings
- **Primary APIs Used**: Supabase API for user_preferences, Google Cloud TTS edge function (google-cloud-tts), Browser Web Speech API (speechSynthesis), OpenAI API for models
- **DB Tables / Models Used**: user_preferences (stt_language, stt_enabled, tts_voice, tts_speed, tts_pitch, tts_volume, tts_enabled, ai_chat_model, ai_voice_model, ai_auto_transcribe, voice_data_retention_days, voice_analytics_enabled)
- **Compliance Notes**: Voice data privacy sensitive; includes retention controls (7/30/90 days/indefinitely); analytics opt-in; multilingual support requires proper language/voice matching; TTS preview uses browser and cloud APIs
- **Event Triggers**: voice_ai_settings_viewed, tts_voice_changed, stt_language_changed, ai_model_changed, voice_preview_played, privacy_setting_changed, screen_id:SETT-010
- **Dependencies**: useUserPreferences hook, AuthProvider, settingsNavigation config, Browser Web Speech API, Google Cloud TTS edge function, Voice matching algorithm for language/voice pairing
- **Notes**: Supports 9 languages (en-US, de-DE, sr-RS, es-ES, ar-XA, ru-RU, zh-CN, fr-FR, pt-PT); Auto-selects matching female voice when language changes; Includes browser and Google Cloud TTS voices with quality indicators; TTS controls for speed (0.5-2.0x), pitch (0.5-2.0), and volume (0-100%); AI model selection for chat (GPT-4, GPT-3.5) and voice (Whisper, Deepgram, Google); Privacy controls for data retention and analytics

---

## UTIL-001: AI Assistant (Persistent Chat)

- **Module**: Utility
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: N/A (Global sidebar component)
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/components/StreamingChat.tsx (deprecated)
- **Component Path**: src/components/StreamingChat.tsx
- **UI Pattern**: Fixed bottom chat bar
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Chat input, Voice mode, Camera mode, Screen share
- **Status**: ❌ Missing (Removed in favor of VITANA Orb)
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Deprecated communication bar; replaced by VITANA Orb overlay

---

## UTIL-002: Calendar

- **Module**: Utility
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/calendar`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/Calendar.tsx
- **Component Path**: src/pages/Calendar.tsx
- **UI Pattern**: Calendar view
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Month view, Week view, Day view, Event creation
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Unified calendar for all events and appointments

---

## UTIL-003: Search

- **Module**: Utility
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/search`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/Search.tsx
- **Component Path**: src/pages/Search.tsx
- **UI Pattern**: Search results page
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Search filters, Result categories
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Global search

---

## UTIL-004: Profile Edit

- **Module**: Utility
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: `/profile/edit`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/ProfileEdit.tsx
- **Component Path**: src/pages/ProfileEdit.tsx
- **UI Pattern**: Form wizard
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Basic info, Bio, Roles, Privacy
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: User profile editing

---

## UTIL-005: Public Profile

- **Module**: Utility
- **Portal(s)**: All
- **Roles with access**: All (public if profile is public)
- **External Route (client URL)**: `/u/:handle`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/PublicProfile.tsx
- **Component Path**: src/pages/PublicProfile.tsx
- **UI Pattern**: Profile page
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Profile card, Bio, Activity, Follow button
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Public user profile pages

---

# PATIENT ROLE SCREENS

---

## PTNT-001: Patient Dashboard

- **Module**: Patient
- **Portal(s)**: All
- **Roles with access**: Patient
- **External Route (client URL)**: `/patient`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/patient/Dashboard.tsx
- **Component Path**: src/pages/patient/Dashboard.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Health, Appointments, Test Results, Care Team navigation cards
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Patient role dashboard

---

## PTNT-002: Health

- **Module**: Patient
- **Portal(s)**: All
- **Roles with access**: Patient
- **External Route (client URL)**: `/patient/health`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/patient/Health.tsx
- **Component Path**: src/pages/patient/Health.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: N/A
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Patient health overview

---

## PTNT-003: Appointments

- **Module**: Patient
- **Portal(s)**: All
- **Roles with access**: Patient
- **External Route (client URL)**: `/patient/appointments`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/patient/Appointments.tsx
- **Component Path**: src/pages/patient/Appointments.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Upcoming, Past, Book appointment
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Patient appointments management

---

## PTNT-004: Test Results

- **Module**: Patient
- **Portal(s)**: All
- **Roles with access**: Patient
- **External Route (client URL)**: `/patient/test-results`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/patient/TestResults.tsx
- **Component Path**: src/pages/patient/TestResults.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Test results list, Detail views
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Lab and test results

---

## PTNT-005: Care Team

- **Module**: Patient
- **Portal(s)**: All
- **Roles with access**: Patient
- **External Route (client URL)**: `/patient/care-team`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/patient/CareTeam.tsx
- **Component Path**: src/pages/patient/CareTeam.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Care team members, Contact info
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Patient's care team

---

## PTNT-006: Health Goals

- **Module**: Patient
- **Portal(s)**: All
- **Roles with access**: Patient
- **External Route (client URL)**: `/patient/health-goals`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/patient/HealthGoals.tsx
- **Component Path**: src/pages/patient/HealthGoals.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Goal list, Add goal, Progress tracking
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Patient health goals

---

## PTNT-007: Insurance

- **Module**: Patient
- **Portal(s)**: All
- **Roles with access**: Patient
- **External Route (client URL)**: `/patient/insurance`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/patient/Insurance.tsx
- **Component Path**: src/pages/patient/Insurance.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Insurance cards, Coverage info
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Insurance information

---

## PTNT-008: Notifications

- **Module**: Patient
- **Portal(s)**: All
- **Roles with access**: Patient
- **External Route (client URL)**: `/patient/notifications`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/patient/Notifications.tsx
- **Component Path**: src/pages/patient/Notifications.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Notification list, Mark as read
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Patient notifications

---

## PTNT-009: Settings

- **Module**: Patient
- **Portal(s)**: All
- **Roles with access**: Patient
- **External Route (client URL)**: `/patient/settings`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/patient/Settings.tsx
- **Component Path**: src/pages/patient/Settings.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Preferences, Privacy
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Patient-specific settings

---

# PROFESSIONAL ROLE SCREENS

---

## PROF-001: Professional Dashboard

- **Module**: Professional
- **Portal(s)**: All
- **Roles with access**: Professional
- **External Route (client URL)**: `/professional`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/professional/Dashboard.tsx
- **Component Path**: src/pages/professional/Dashboard.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Patients, Schedule, Clinical Tools navigation cards
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Professional role dashboard

---

## PROF-002: Patients

- **Module**: Professional
- **Portal(s)**: All
- **Roles with access**: Professional
- **External Route (client URL)**: `/professional/patients`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/professional/Patients.tsx
- **Component Path**: src/pages/professional/Patients.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Patient list, Patient detail, Add patient
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Patient management

---

## PROF-003: Schedule

- **Module**: Professional
- **Portal(s)**: All
- **Roles with access**: Professional
- **External Route (client URL)**: `/professional/schedule`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/professional/Schedule.tsx
- **Component Path**: src/pages/professional/Schedule.tsx
- **UI Pattern**: Calendar view
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Appointments, Availability settings
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Professional schedule management

---

## PROF-004: Clinical Tools

- **Module**: Professional
- **Portal(s)**: All
- **Roles with access**: Professional
- **External Route (client URL)**: `/professional/clinical-tools`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/professional/ClinicalTools.tsx
- **Component Path**: src/pages/professional/ClinicalTools.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Assessment tools, Treatment plans
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Clinical assessment and treatment tools

---

## PROF-005: Referrals

- **Module**: Professional
- **Portal(s)**: All
- **Roles with access**: Professional
- **External Route (client URL)**: `/professional/referrals`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/professional/Referrals.tsx
- **Component Path**: src/pages/professional/Referrals.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Referral list, Create referral
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Patient referral management

---

## PROF-006: Billing

- **Module**: Professional
- **Portal(s)**: All
- **Roles with access**: Professional
- **External Route (client URL)**: `/professional/billing`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/professional/Billing.tsx
- **Component Path**: src/pages/professional/Billing.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Invoices, Payments, Reports
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Professional billing and payments

---

## PROF-007: Professional Profile

- **Module**: Professional
- **Portal(s)**: All
- **Roles with access**: Professional
- **External Route (client URL)**: `/professional/profile`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/professional/Profile.tsx
- **Component Path**: src/pages/professional/Profile.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Bio, Credentials, Services, Availability
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Professional public profile management

---

## PROF-008: Education

- **Module**: Professional
- **Portal(s)**: All
- **Roles with access**: Professional
- **External Route (client URL)**: `/professional/education`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/professional/Education.tsx
- **Component Path**: src/pages/professional/Education.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Courses, Certifications, Resources
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Continuing education resources

---

## PROF-009: Settings

- **Module**: Professional
- **Portal(s)**: All
- **Roles with access**: Professional
- **External Route (client URL)**: `/professional/settings`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/professional/Settings.tsx
- **Component Path**: src/pages/professional/Settings.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Preferences, Notifications, Integrations
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Professional-specific settings

---

# STAFF ROLE SCREENS

---

## STFF-001: Staff Dashboard

- **Module**: Staff
- **Portal(s)**: All
- **Roles with access**: Staff
- **External Route (client URL)**: `/staff`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/staff/Dashboard.tsx
- **Component Path**: src/pages/staff/Dashboard.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Queue, Daily Tasks, Schedule navigation cards
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Staff role dashboard

---

## STFF-002: Queue

- **Module**: Staff
- **Portal(s)**: All
- **Roles with access**: Staff
- **External Route (client URL)**: `/staff/queue`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/staff/Queue.tsx
- **Component Path**: src/pages/staff/Queue.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Patient queue, Check-in, Assign
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Patient queue management

---

## STFF-003: Daily Tasks

- **Module**: Staff
- **Portal(s)**: All
- **Roles with access**: Staff
- **External Route (client URL)**: `/staff/daily-tasks`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/staff/DailyTasks.tsx
- **Component Path**: src/pages/staff/DailyTasks.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Task list, Complete task, Add task
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Daily task management

---

## STFF-004: Schedule

- **Module**: Staff
- **Portal(s)**: All
- **Roles with access**: Staff
- **External Route (client URL)**: `/staff/schedule`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/staff/Schedule.tsx
- **Component Path**: src/pages/staff/Schedule.tsx
- **UI Pattern**: Calendar view
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Shift schedule, Availability
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Staff schedule management

---

## STFF-005: Reports

- **Module**: Staff
- **Portal(s)**: All
- **Roles with access**: Staff
- **External Route (client URL)**: `/staff/reports`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/staff/Reports.tsx
- **Component Path**: src/pages/staff/Reports.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Report list, Generate report
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Staff reporting

---

## STFF-006: Communications

- **Module**: Staff
- **Portal(s)**: All
- **Roles with access**: Staff
- **External Route (client URL)**: `/staff/communications`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/staff/Communications.tsx
- **Component Path**: src/pages/staff/Communications.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Messages, Announcements
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Staff communications

---

## STFF-007: Staff Tools

- **Module**: Staff
- **Portal(s)**: All
- **Roles with access**: Staff
- **External Route (client URL)**: `/staff/tools`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/staff/StaffTools.tsx
- **Component Path**: src/pages/staff/StaffTools.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Tool library
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Staff utility tools

---

## STFF-008: Time Tracking

- **Module**: Staff
- **Portal(s)**: All
- **Roles with access**: Staff
- **External Route (client URL)**: `/staff/time-tracking`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/staff/TimeTracking.tsx
- **Component Path**: src/pages/staff/TimeTracking.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Clock in/out, Timesheet
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Time tracking for staff

---

## STFF-009: Settings

- **Module**: Staff
- **Portal(s)**: All
- **Roles with access**: Staff
- **External Route (client URL)**: `/staff/settings`
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/pages/staff/Settings.tsx
- **Component Path**: src/pages/staff/Settings.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Preferences, Notifications
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Staff-specific settings

---

# ADMIN ROLE SCREENS

---

## ADMN-001: Admin Dashboard

- **Module**: Admin
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin`
- **Internal/Admin Route (if any)**: `/admin`
- **Dev Route (current project path)**: src/pages/admin/Dashboard.tsx
- **Component Path**: src/pages/admin/Dashboard.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: User Management, System Admin, Monitoring navigation cards
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Admin role main dashboard; Screen ID D1-010

---

## ADMN-002: Overview

- **Module**: Admin
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/overview`
- **Internal/Admin Route (if any)**: `/admin/overview`
- **Dev Route (current project path)**: src/pages/admin/Overview.tsx
- **Component Path**: src/pages/admin/Overview.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: System metrics, Quick actions
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: High-level system overview

---

## ADMN-010: User Management

- **Module**: Admin - User Management
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/user-management`
- **Internal/Admin Route (if any)**: `/admin/user-management`
- **Dev Route (current project path)**: src/pages/admin/UserManagement.tsx
- **Component Path**: src/pages/admin/UserManagement.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: User list, User detail, Role assignment
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: User account management

---

## ADMN-011: Roles & Permissions

- **Module**: Admin - User Management
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/roles-permissions`
- **Internal/Admin Route (if any)**: `/admin/roles-permissions`
- **Dev Route (current project path)**: src/pages/admin/RolesPermissions.tsx
- **Component Path**: src/pages/admin/RolesPermissions.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Role list, Permission matrix, Create role
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Role-based access control management

---

## ADMN-012: User Activity

- **Module**: Admin - User Management
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/user-activity`
- **Internal/Admin Route (if any)**: `/admin/user-activity`
- **Dev Route (current project path)**: src/pages/admin/UserActivity.tsx
- **Component Path**: src/pages/admin/UserActivity.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Activity log, Filters, Export
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: User activity monitoring

---

## ADMN-020: Tenant Management

- **Module**: Admin - Tenant Management
- **Portal(s)**: Exafy only
- **Roles with access**: Admin (Exafy)
- **External Route (client URL)**: `/admin/tenant-management`
- **Internal/Admin Route (if any)**: `/admin/tenant-management`
- **Dev Route (current project path)**: src/pages/admin/TenantManagement.tsx
- **Component Path**: src/pages/admin/TenantManagement.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Exafy
- **Subscreens / Tabs / Modals**: Tenant list, Switch tenant, Gemini API setup
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Multi-tenant organization management for Exafy admins

---

## ADMN-021: Tenant Config

- **Module**: Admin - Tenant Management
- **Portal(s)**: Exafy only
- **Roles with access**: Admin (Exafy)
- **External Route (client URL)**: `/admin/tenant-config`
- **Internal/Admin Route (if any)**: `/admin/tenant-config`
- **Dev Route (current project path)**: src/pages/admin/TenantConfig.tsx
- **Component Path**: src/pages/admin/TenantConfig.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Exafy
- **Subscreens / Tabs / Modals**: Configuration options, Save changes
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Tenant-specific configuration settings

---

## ADMN-022: Membership Management

- **Module**: Admin - Tenant Management
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/memberships`
- **Internal/Admin Route (if any)**: `/admin/memberships`
- **Dev Route (current project path)**: src/pages/admin/MembershipManagement.tsx
- **Component Path**: src/pages/admin/MembershipManagement.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Member list, Add member, Remove member, Role changes
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Tenant membership administration

---

## ADMN-030: System Config

- **Module**: Admin - System Admin
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/system-config`
- **Internal/Admin Route (if any)**: `/admin/system-config`
- **Dev Route (current project path)**: src/pages/admin/SystemConfig.tsx
- **Component Path**: src/pages/admin/SystemConfig.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: System settings, Feature flags
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Global system configuration

---

## ADMN-031: Database Admin

- **Module**: Admin - System Admin
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/database`
- **Internal/Admin Route (if any)**: `/admin/database`
- **Dev Route (current project path)**: src/pages/admin/DatabaseAdmin.tsx
- **Component Path**: src/pages/admin/DatabaseAdmin.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Table browser, Query console, Backups
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Database administration tools

---

## ADMN-032: API Management

- **Module**: Admin - System Admin
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/api-management`
- **Internal/Admin Route (if any)**: `/admin/api-management`
- **Dev Route (current project path)**: src/pages/admin/ApiManagement.tsx
- **Component Path**: src/pages/admin/ApiManagement.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: API keys, Rate limits, Usage stats
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: API key and usage management

---

## ADMN-040: Queue & Check-In

- **Module**: Admin - Clinical Operations
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/queue-checkin`
- **Internal/Admin Route (if any)**: `/admin/queue-checkin`
- **Dev Route (current project path)**: src/pages/admin/QueueCheckin.tsx
- **Component Path**: src/pages/admin/QueueCheckin.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Patient queue, Check-in interface
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Clinical queue management; Screen ID D1-010-01

---

## ADMN-041: Patient Records

- **Module**: Admin - Clinical Operations
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/patient-records`
- **Internal/Admin Route (if any)**: `/admin/patient-records`
- **Dev Route (current project path)**: src/pages/admin/PatientRecords.tsx
- **Component Path**: src/pages/admin/PatientRecords.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Patient search, Record detail, Audit log
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Patient record administration; Screen ID D1-010-02

---

## ADMN-050: System Monitoring

- **Module**: Admin - Monitoring
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/system-monitoring`
- **Internal/Admin Route (if any)**: `/admin/system-monitoring`
- **Dev Route (current project path)**: src/pages/admin/SystemMonitoring.tsx
- **Component Path**: src/pages/admin/SystemMonitoring.tsx
- **UI Pattern**: Dashboard with charts
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Metrics, Alerts, Logs
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Real-time system monitoring

---

## ADMN-051: Notification Dashboard

- **Module**: Admin - Monitoring
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/notification-dashboard`
- **Internal/Admin Route (if any)**: `/admin/notification-dashboard`
- **Dev Route (current project path)**: src/pages/admin/NotificationDashboard.tsx
- **Component Path**: src/pages/admin/NotificationDashboard.tsx
- **UI Pattern**: Dashboard with stats
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Notification stats, Cron health, Real-time monitor
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Notification system monitoring

---

## ADMN-052: Audit Logs

- **Module**: Admin - Monitoring
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/audit-logs`
- **Internal/Admin Route (if any)**: `/admin/audit-logs`
- **Dev Route (current project path)**: src/pages/admin/AuditLogs.tsx
- **Component Path**: src/pages/admin/AuditLogs.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Log entries, Filters, Export
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: System audit log viewer; Screen ID D1-010-06

---

## ADMN-053: Staff Directory

- **Module**: Admin - Monitoring
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/staff-directory`
- **Internal/Admin Route (if any)**: `/admin/staff-directory`
- **Dev Route (current project path)**: src/pages/admin/StaffDirectory.tsx
- **Component Path**: src/pages/admin/StaffDirectory.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Staff list, Staff detail, Add staff
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Staff member directory; Screen ID D1-010-04

---

## ADMN-060: Stream Supervision

- **Module**: Admin - Community Supervision
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/stream-supervision`
- **Internal/Admin Route (if any)**: `/admin/stream-supervision`
- **Dev Route (current project path)**: src/pages/admin/StreamSupervision.tsx
- **Component Path**: src/pages/admin/StreamSupervision.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Active streams, Monitor stream, End stream
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Live stream moderation; Screen ID D1-010-03

---

## ADMN-061: Content Moderation

- **Module**: Admin - Community Supervision
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/content-moderation`
- **Internal/Admin Route (if any)**: `/admin/content-moderation`
- **Dev Route (current project path)**: src/pages/admin/ContentModeration.tsx
- **Component Path**: src/pages/admin/ContentModeration.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Flagged content, Review queue, Take action
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Community content moderation

---

## ADMN-062: User Reports

- **Module**: Admin - Community Supervision
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/user-reports`
- **Internal/Admin Route (if any)**: `/admin/user-reports`
- **Dev Route (current project path)**: src/pages/admin/UserReports.tsx
- **Component Path**: src/pages/admin/UserReports.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Report queue, Report detail, Take action
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: User-submitted reports

---

## ADMN-063: Community Analytics

- **Module**: Admin - Community Supervision
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/community-analytics`
- **Internal/Admin Route (if any)**: `/admin/community-analytics`
- **Dev Route (current project path)**: src/pages/admin/CommunityAnalytics.tsx
- **Component Path**: src/pages/admin/CommunityAnalytics.tsx
- **UI Pattern**: Dashboard with charts
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Engagement metrics, Growth stats, Content trends
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Community engagement analytics

---

## ADMN-070: Media Library

- **Module**: Admin - Media Management
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/media-library`
- **Internal/Admin Route (if any)**: `/admin/media-library`
- **Dev Route (current project path)**: src/pages/admin/MediaLibrary.tsx
- **Component Path**: src/pages/admin/MediaLibrary.tsx
- **UI Pattern**: card-grid
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Media files, Upload, Delete
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Central media asset library

---

## ADMN-071: Video Manager

- **Module**: Admin - Media Management
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/video-manager`
- **Internal/Admin Route (if any)**: `/admin/video-manager`
- **Dev Route (current project path)**: src/pages/admin/VideoManager.tsx
- **Component Path**: src/pages/admin/VideoManager.tsx
- **UI Pattern**: card-grid
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Video list, Upload video, Encoding status
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Video content management

---

## ADMN-072: Image Manager

- **Module**: Admin - Media Management
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/image-manager`
- **Internal/Admin Route (if any)**: `/admin/image-manager`
- **Dev Route (current project path)**: src/pages/admin/ImageManager.tsx
- **Component Path**: src/pages/admin/ImageManager.tsx
- **UI Pattern**: card-grid
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Image gallery, Upload, Edit
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Image asset management

---

## ADMN-073: Storage Analytics

- **Module**: Admin - Media Management
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/storage-analytics`
- **Internal/Admin Route (if any)**: `/admin/storage-analytics`
- **Dev Route (current project path)**: src/pages/admin/StorageAnalytics.tsx
- **Component Path**: src/pages/admin/StorageAnalytics.tsx
- **UI Pattern**: Dashboard with charts
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Usage stats, Storage breakdown, Cost analysis
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Storage usage analytics

---

## ADMN-074: CDN Settings

- **Module**: Admin - Media Management
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/cdn-settings`
- **Internal/Admin Route (if any)**: `/admin/cdn-settings`
- **Dev Route (current project path)**: src/pages/admin/CdnSettings.tsx
- **Component Path**: src/pages/admin/CdnSettings.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: CDN config, Cache purge, Performance
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: CDN configuration

---

## ADMN-080: AI Proactive Admin

- **Module**: Admin - AI Assistant
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/ai-proactive`
- **Internal/Admin Route (if any)**: `/admin/ai-proactive`
- **Dev Route (current project path)**: src/pages/admin/AIProactiveAdmin.tsx
- **Component Path**: src/pages/admin/AIProactiveAdmin.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: AI suggestions, Recommendations, Approval queue
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: AI-driven proactive admin features

---

## ADMN-081: AI Situations

- **Module**: Admin - AI Assistant
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/ai-situations`
- **Internal/Admin Route (if any)**: `/admin/ai-situations`
- **Dev Route (current project path)**: src/pages/admin/AISituations.tsx
- **Component Path**: src/pages/admin/AISituations.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Situation list, Analyze situation, Deploy recommendation
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: AI situation analysis

---

## ADMN-082: AI Recommendations

- **Module**: Admin - AI Assistant
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/ai-recommendations`
- **Internal/Admin Route (if any)**: `/admin/ai-recommendations`
- **Dev Route (current project path)**: src/pages/admin/AIRecommendations.tsx
- **Component Path**: src/pages/admin/AIRecommendations.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Recommendation list, Review, Deploy
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: AI-generated recommendations

---

## ADMN-083: AI Analytics

- **Module**: Admin - AI Assistant
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/ai-analytics`
- **Internal/Admin Route (if any)**: `/admin/ai-analytics`
- **Dev Route (current project path)**: src/pages/admin/AIAnalytics.tsx
- **Component Path**: src/pages/admin/AIAnalytics.tsx
- **UI Pattern**: Dashboard with charts
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: AI performance, Usage stats, Impact metrics
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: AI system analytics

---

## ADMN-084: AI Training

- **Module**: Admin - AI Assistant
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/ai-training`
- **Internal/Admin Route (if any)**: `/admin/ai-training`
- **Dev Route (current project path)**: src/pages/admin/AITraining.tsx
- **Component Path**: src/pages/admin/AITraining.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Training data, Model updates, Fine-tuning
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: AI model training and tuning

---

## ADMN-090: Automation Rules

- **Module**: Admin - Automation
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/automation-rules`
- **Internal/Admin Route (if any)**: `/admin/automation-rules`
- **Dev Route (current project path)**: src/pages/admin/AutomationRules.tsx
- **Component Path**: src/pages/admin/AutomationRules.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Rule list, Create rule, Edit rule, Test rule
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Automation rule builder and management

---

## ADMN-091: Automation Executions

- **Module**: Admin - Automation
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/automation-executions`
- **Internal/Admin Route (if any)**: `/admin/automation-executions`
- **Dev Route (current project path)**: src/pages/admin/AutomationExecutions.tsx
- **Component Path**: src/pages/admin/AutomationExecutions.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Execution log, Execution detail, Retry
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Automation execution history and monitoring

---

## ADMN-100: Live Stream Control

- **Module**: Admin - Live & Stream
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/live-stream-control`
- **Internal/Admin Route (if any)**: `/admin/live-stream-control`
- **Dev Route (current project path)**: src/pages/admin/LiveStreamControl.tsx
- **Component Path**: src/pages/admin/LiveStreamControl.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Active streams, Stream controls, End stream
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Live stream management console

---

## ADMN-101: Stream Analytics

- **Module**: Admin - Live & Stream
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/stream-analytics`
- **Internal/Admin Route (if any)**: `/admin/stream-analytics`
- **Dev Route (current project path)**: src/pages/admin/StreamAnalytics.tsx
- **Component Path**: src/pages/admin/StreamAnalytics.tsx
- **UI Pattern**: Dashboard with charts
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Viewership, Engagement, Performance
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Live stream analytics

---

## ADMN-102: Stream Quality Monitoring

- **Module**: Admin - Live & Stream
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/stream-quality`
- **Internal/Admin Route (if any)**: `/admin/stream-quality`
- **Dev Route (current project path)**: src/pages/admin/StreamQuality.tsx
- **Component Path**: src/pages/admin/StreamQuality.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Quality metrics, Bitrate, Latency
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Stream quality monitoring

---

## ADMN-103: Recording Manager

- **Module**: Admin - Live & Stream
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/recording-manager`
- **Internal/Admin Route (if any)**: `/admin/recording-manager`
- **Dev Route (current project path)**: src/pages/admin/RecordingManager.tsx
- **Component Path**: src/pages/admin/RecordingManager.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Recording list, Download, Delete
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Stream recording management

---

## ADMN-104: Broadcast Settings

- **Module**: Admin - Live & Stream
- **Portal(s)**: All
- **Roles with access**: Admin
- **External Route (client URL)**: `/admin/broadcast-settings`
- **Internal/Admin Route (if any)**: `/admin/broadcast-settings`
- **Dev Route (current project path)**: src/pages/admin/BroadcastSettings.tsx
- **Component Path**: src/pages/admin/BroadcastSettings.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Stream settings, Quality presets, RTMP config
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Broadcast configuration

---

# DEV HUB SCREENS

---

## DEV-001: Dev Hub Dashboard

- **Module**: Dev Hub
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev`
- **Internal/Admin Route (if any)**: `/dev`
- **Dev Route (current project path)**: src/routes/dev/index.tsx
- **Component Path**: src/routes/dev/index.tsx
- **UI Pattern**: 3-card-header
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Command, Agents, Pipelines navigation cards
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Dev Hub main dashboard

---

## DEV-002: Dev Login

- **Module**: Dev Hub
- **Portal(s)**: Dev Hub only
- **Roles with access**: Public (dev credentials)
- **External Route (client URL)**: `/dev/login`
- **Internal/Admin Route (if any)**: `/dev/login`
- **Dev Route (current project path)**: src/routes/dev/login.tsx
- **Component Path**: src/routes/dev/login.tsx
- **UI Pattern**: Auth screen
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Login form
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Dev Hub authentication

---

## DEV-003: Dev Dashboard (Overview)

- **Module**: Dev Hub - Dashboard
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/dashboard`
- **Internal/Admin Route (if any)**: `/dev/dashboard`
- **Dev Route (current project path)**: src/routes/dev/dashboard/index.tsx
- **Component Path**: src/routes/dev/dashboard/index.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: System metrics, Quick links
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Dev overview dashboard

---

## DEV-004: Dev Analytics

- **Module**: Dev Hub - Dashboard
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/dashboard/analytics`
- **Internal/Admin Route (if any)**: `/dev/dashboard/analytics`
- **Dev Route (current project path)**: src/routes/dev/dashboard/analytics.tsx
- **Component Path**: src/routes/dev/dashboard/analytics.tsx
- **UI Pattern**: Dashboard with charts
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Performance metrics, Usage stats
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Dev analytics dashboard

---

## DEV-005: Dev Health

- **Module**: Dev Hub - Dashboard
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/dashboard/health`
- **Internal/Admin Route (if any)**: `/dev/dashboard/health`
- **Dev Route (current project path)**: src/routes/dev/dashboard/health.tsx
- **Component Path**: src/routes/dev/dashboard/health.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Health checks, Status indicators
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: System health monitoring

---

## DEV-006: Dev Logs

- **Module**: Dev Hub - Dashboard
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/dashboard/logs`
- **Internal/Admin Route (if any)**: `/dev/dashboard/logs`
- **Dev Route (current project path)**: src/routes/dev/dashboard/logs.tsx
- **Component Path**: src/routes/dev/dashboard/logs.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Log entries, Filters
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: System log viewer

---

## DEV-010: Command Center

- **Module**: Dev Hub - Command
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/command`
- **Internal/Admin Route (if any)**: `/dev/command`
- **Dev Route (current project path)**: src/routes/dev/command/index.tsx
- **Component Path**: src/routes/dev/command/index.tsx
- **UI Pattern**: Command interface
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Command input, Output console
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Dev command center

---

## DEV-011: Terminal

- **Module**: Dev Hub - Command
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/command/terminal`
- **Internal/Admin Route (if any)**: `/dev/command/terminal`
- **Dev Route (current project path)**: src/routes/dev/command/terminal.tsx
- **Component Path**: src/routes/dev/command/terminal.tsx
- **UI Pattern**: Terminal interface
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Terminal emulator
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Dev terminal

---

## DEV-012: Scripts

- **Module**: Dev Hub - Command
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/command/scripts`
- **Internal/Admin Route (if any)**: `/dev/command/scripts`
- **Dev Route (current project path)**: src/routes/dev/command/scripts.tsx
- **Component Path**: src/routes/dev/command/scripts.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Script list, Run script, Edit script
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Script management

---

## DEV-013: Cron Jobs

- **Module**: Dev Hub - Command
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/command/cron`
- **Internal/Admin Route (if any)**: `/dev/command/cron`
- **Dev Route (current project path)**: src/routes/dev/command/cron.tsx
- **Component Path**: src/routes/dev/command/cron.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Cron list, Create job, Edit schedule
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Cron job management

---

## DEV-014: Webhooks

- **Module**: Dev Hub - Command
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/command/webhooks`
- **Internal/Admin Route (if any)**: `/dev/command/webhooks`
- **Dev Route (current project path)**: src/routes/dev/command/webhooks.tsx
- **Component Path**: src/routes/dev/command/webhooks.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Webhook list, Create webhook, Test
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Webhook configuration

---

## DEV-015: Tasks

- **Module**: Dev Hub - Command
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/command/tasks`
- **Internal/Admin Route (if any)**: `/dev/command/tasks`
- **Dev Route (current project path)**: src/routes/dev/command/tasks.tsx
- **Component Path**: src/routes/dev/command/tasks.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Task queue, Task detail, Retry
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Background task management

---

## DEV-020: Agents

- **Module**: Dev Hub - Agents
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/agents`
- **Internal/Admin Route (if any)**: `/dev/agents`
- **Dev Route (current project path)**: src/routes/dev/agents/index.tsx
- **Component Path**: src/routes/dev/agents/index.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Agent list, Agent detail
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: AI agent management

---

## DEV-021: Agent Monitor

- **Module**: Dev Hub - Agents
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/agents/monitor`
- **Internal/Admin Route (if any)**: `/dev/agents/monitor`
- **Dev Route (current project path)**: src/routes/dev/agents/monitor.tsx
- **Component Path**: src/routes/dev/agents/monitor.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Real-time agent activity
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Agent monitoring dashboard

---

## DEV-022: Agent Logs

- **Module**: Dev Hub - Agents
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/agents/logs`
- **Internal/Admin Route (if any)**: `/dev/agents/logs`
- **Dev Route (current project path)**: src/routes/dev/agents/logs.tsx
- **Component Path**: src/routes/dev/agents/logs.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Log entries, Filters
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Agent execution logs

---

## DEV-023: Agent Config

- **Module**: Dev Hub - Agents
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/agents/config`
- **Internal/Admin Route (if any)**: `/dev/agents/config`
- **Dev Route (current project path)**: src/routes/dev/agents/config.tsx
- **Component Path**: src/routes/dev/agents/config.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Configuration editor
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Agent configuration

---

## DEV-024: Agent Crew

- **Module**: Dev Hub - Agents
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/agents/crew`
- **Internal/Admin Route (if any)**: `/dev/agents/crew`
- **Dev Route (current project path)**: src/routes/dev/agents/crew.tsx
- **Component Path**: src/routes/dev/agents/crew.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Crew list, Create crew, Agent assignment
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: CrewAI crew management

---

## DEV-030: Pipelines

- **Module**: Dev Hub - Pipelines
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/pipelines`
- **Internal/Admin Route (if any)**: `/dev/pipelines`
- **Dev Route (current project path)**: src/routes/dev/pipelines/index.tsx
- **Component Path**: src/routes/dev/pipelines/index.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Pipeline list, Create pipeline
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Data pipeline management

---

## DEV-031: Pipeline Builder

- **Module**: Dev Hub - Pipelines
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/pipelines/builder`
- **Internal/Admin Route (if any)**: `/dev/pipelines/builder`
- **Dev Route (current project path)**: src/routes/dev/pipelines/builder.tsx
- **Component Path**: src/routes/dev/pipelines/builder.tsx
- **UI Pattern**: Visual builder
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Drag-and-drop interface, Node config
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Visual pipeline builder

---

## DEV-032: Pipeline Runs

- **Module**: Dev Hub - Pipelines
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/pipelines/runs`
- **Internal/Admin Route (if any)**: `/dev/pipelines/runs`
- **Dev Route (current project path)**: src/routes/dev/pipelines/runs.tsx
- **Component Path**: src/routes/dev/pipelines/runs.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Run history, Run detail, Retry
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Pipeline execution history

---

## DEV-033: Pipeline Monitor

- **Module**: Dev Hub - Pipelines
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/pipelines/monitor`
- **Internal/Admin Route (if any)**: `/dev/pipelines/monitor`
- **Dev Route (current project path)**: src/routes/dev/pipelines/monitor.tsx
- **Component Path**: src/routes/dev/pipelines/monitor.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Active pipelines, Performance metrics
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Pipeline monitoring

---

## DEV-040: OASIS

- **Module**: Dev Hub - OASIS
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/oasis`
- **Internal/Admin Route (if any)**: `/dev/oasis`
- **Dev Route (current project path)**: src/routes/dev/oasis/index.tsx
- **Component Path**: src/routes/dev/oasis/index.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: OASIS overview
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: OASIS system overview

---

## DEV-041: OASIS Events

- **Module**: Dev Hub - OASIS
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/oasis/events`
- **Internal/Admin Route (if any)**: `/dev/oasis/events`
- **Dev Route (current project path)**: src/routes/dev/oasis/events.tsx
- **Component Path**: src/routes/dev/oasis/events.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Event list, Event detail, Filters
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: OASIS event log

---

## DEV-042: OASIS Projections

- **Module**: Dev Hub - OASIS
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/oasis/projections`
- **Internal/Admin Route (if any)**: `/dev/oasis/projections`
- **Dev Route (current project path)**: src/routes/dev/oasis/projections.tsx
- **Component Path**: src/routes/dev/oasis/projections.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Projection list, Rebuild projection
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: OASIS projection management

---

## DEV-043: OASIS Config

- **Module**: Dev Hub - OASIS
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/oasis/config`
- **Internal/Admin Route (if any)**: `/dev/oasis/config`
- **Dev Route (current project path)**: src/routes/dev/oasis/config.tsx
- **Component Path**: src/routes/dev/oasis/config.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Configuration editor
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: OASIS configuration

---

## DEV-050: VTID

- **Module**: Dev Hub - VTID
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/vtid`
- **Internal/Admin Route (if any)**: `/dev/vtid`
- **Dev Route (current project path)**: src/routes/dev/vtid/index.tsx
- **Component Path**: src/routes/dev/vtid/index.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: VTID overview
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: VTID system overview

---

## DEV-051: VTID Explorer

- **Module**: Dev Hub - VTID
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/vtid/explorer`
- **Internal/Admin Route (if any)**: `/dev/vtid/explorer`
- **Dev Route (current project path)**: src/routes/dev/vtid/explorer.tsx
- **Component Path**: src/routes/dev/vtid/explorer.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: VTID search, VTID detail
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: VTID exploration tool

---

## DEV-052: VTID Graph

- **Module**: Dev Hub - VTID
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/vtid/graph`
- **Internal/Admin Route (if any)**: `/dev/vtid/graph`
- **Dev Route (current project path)**: src/routes/dev/vtid/graph.tsx
- **Component Path**: src/routes/dev/vtid/graph.tsx
- **UI Pattern**: Graph visualization
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Relationship graph, Filters
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: VTID relationship graph

---

## DEV-053: VTID Analytics

- **Module**: Dev Hub - VTID
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/vtid/analytics`
- **Internal/Admin Route (if any)**: `/dev/vtid/analytics`
- **Dev Route (current project path)**: src/routes/dev/vtid/analytics.tsx
- **Component Path**: src/routes/dev/vtid/analytics.tsx
- **UI Pattern**: Dashboard with charts
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Usage metrics, Patterns
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: VTID analytics

---

## DEV-060: Gateway

- **Module**: Dev Hub - Gateway
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/gateway`
- **Internal/Admin Route (if any)**: `/dev/gateway`
- **Dev Route (current project path)**: src/routes/dev/gateway/index.tsx
- **Component Path**: src/routes/dev/gateway/index.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Gateway overview
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: API gateway management

---

## DEV-061: Gateway Routes

- **Module**: Dev Hub - Gateway
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/gateway/routes`
- **Internal/Admin Route (if any)**: `/dev/gateway/routes`
- **Dev Route (current project path)**: src/routes/dev/gateway/routes.tsx
- **Component Path**: src/routes/dev/gateway/routes.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Route list, Create route, Edit route
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: API route configuration

---

## DEV-062: Gateway Monitor

- **Module**: Dev Hub - Gateway
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/gateway/monitor`
- **Internal/Admin Route (if any)**: `/dev/gateway/monitor`
- **Dev Route (current project path)**: src/routes/dev/gateway/monitor.tsx
- **Component Path**: src/routes/dev/gateway/monitor.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Real-time traffic, Performance
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Gateway traffic monitoring

---

## DEV-063: Gateway Analytics

- **Module**: Dev Hub - Gateway
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/gateway/analytics`
- **Internal/Admin Route (if any)**: `/dev/gateway/analytics`
- **Dev Route (current project path)**: src/routes/dev/gateway/analytics.tsx
- **Component Path**: src/routes/dev/gateway/analytics.tsx
- **UI Pattern**: Dashboard with charts
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Usage stats, Performance metrics
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Gateway analytics

---

## DEV-070: CI/CD

- **Module**: Dev Hub - CI/CD
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/cicd`
- **Internal/Admin Route (if any)**: `/dev/cicd`
- **Dev Route (current project path)**: src/routes/dev/cicd/index.tsx
- **Component Path**: src/routes/dev/cicd/index.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: CI/CD overview
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: CI/CD pipeline overview

---

## DEV-071: CI/CD Pipelines

- **Module**: Dev Hub - CI/CD
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/cicd/pipelines`
- **Internal/Admin Route (if any)**: `/dev/cicd/pipelines`
- **Dev Route (current project path)**: src/routes/dev/cicd/pipelines.tsx
- **Component Path**: src/routes/dev/cicd/pipelines.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Pipeline list, Run pipeline
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: CI/CD pipeline management

---

## DEV-072: CI/CD Deployments

- **Module**: Dev Hub - CI/CD
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/cicd/deployments`
- **Internal/Admin Route (if any)**: `/dev/cicd/deployments`
- **Dev Route (current project path)**: src/routes/dev/cicd/deployments.tsx
- **Component Path**: src/routes/dev/cicd/deployments.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Deployment history, Rollback
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Deployment history

---

## DEV-073: CI/CD Config

- **Module**: Dev Hub - CI/CD
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/cicd/config`
- **Internal/Admin Route (if any)**: `/dev/cicd/config`
- **Dev Route (current project path)**: src/routes/dev/cicd/config.tsx
- **Component Path**: src/routes/dev/cicd/config.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Configuration editor
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: CI/CD configuration

---

## DEV-080: Observability

- **Module**: Dev Hub - Observability
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/observability`
- **Internal/Admin Route (if any)**: `/dev/observability`
- **Dev Route (current project path)**: src/routes/dev/observability/index.tsx
- **Component Path**: src/routes/dev/observability/index.tsx
- **UI Pattern**: Dashboard
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Observability overview
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: System observability dashboard

---

## DEV-081: Metrics

- **Module**: Dev Hub - Observability
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/observability/metrics`
- **Internal/Admin Route (if any)**: `/dev/observability/metrics`
- **Dev Route (current project path)**: src/routes/dev/observability/metrics.tsx
- **Component Path**: src/routes/dev/observability/metrics.tsx
- **UI Pattern**: Dashboard with charts
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Custom metrics, Filters
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: System metrics

---

## DEV-082: Traces

- **Module**: Dev Hub - Observability
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/observability/traces`
- **Internal/Admin Route (if any)**: `/dev/observability/traces`
- **Dev Route (current project path)**: src/routes/dev/observability/traces.tsx
- **Component Path**: src/routes/dev/observability/traces.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Trace list, Trace detail, Spans
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Distributed tracing

---

## DEV-083: Alerts

- **Module**: Dev Hub - Observability
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/observability/alerts`
- **Internal/Admin Route (if any)**: `/dev/observability/alerts`
- **Dev Route (current project path)**: src/routes/dev/observability/alerts.tsx
- **Component Path**: src/routes/dev/observability/alerts.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Alert rules, Alert history, Create alert
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Alert management

---

## DEV-090: Dev Settings

- **Module**: Dev Hub - Settings
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/settings`
- **Internal/Admin Route (if any)**: `/dev/settings`
- **Dev Route (current project path)**: src/routes/dev/settings/index.tsx
- **Component Path**: src/routes/dev/settings/index.tsx
- **UI Pattern**: sub-page-header
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Settings overview
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Dev Hub settings

---

## DEV-091: Feature Flags

- **Module**: Dev Hub - Settings
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/settings/feature-flags`
- **Internal/Admin Route (if any)**: `/dev/settings/feature-flags`
- **Dev Route (current project path)**: src/routes/dev/settings/feature-flags.tsx
- **Component Path**: src/routes/dev/settings/feature-flags.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Flag list, Create flag, Toggle state
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Feature flag management

---

## DEV-092: Environment Variables

- **Module**: Dev Hub - Settings
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/settings/env-vars`
- **Internal/Admin Route (if any)**: `/dev/settings/env-vars`
- **Dev Route (current project path)**: src/routes/dev/settings/env-vars.tsx
- **Component Path**: src/routes/dev/settings/env-vars.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Variable list, Add variable, Edit
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Environment variable management

---

## DEV-093: Secrets

- **Module**: Dev Hub - Settings
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/settings/secrets`
- **Internal/Admin Route (if any)**: `/dev/settings/secrets`
- **Dev Route (current project path)**: src/routes/dev/settings/secrets.tsx
- **Component Path**: src/routes/dev/settings/secrets.tsx
- **UI Pattern**: data-table
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Secret list, Add secret, Rotate
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Secret management

---

## DEV-100: Documentation

- **Module**: Dev Hub - Docs
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/docs`
- **Internal/Admin Route (if any)**: `/dev/docs`
- **Dev Route (current project path)**: src/routes/dev/docs/index.tsx
- **Component Path**: src/routes/dev/docs/index.tsx
- **UI Pattern**: Documentation viewer
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Docs navigation, Search
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Dev documentation hub

---

## DEV-101: API Docs

- **Module**: Dev Hub - Docs
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/docs/api`
- **Internal/Admin Route (if any)**: `/dev/docs/api`
- **Dev Route (current project path)**: src/routes/dev/docs/api.tsx
- **Component Path**: src/routes/dev/docs/api.tsx
- **UI Pattern**: API documentation
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Endpoint list, Examples, Try it
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: API documentation

---

## DEV-102: Schema Docs

- **Module**: Dev Hub - Docs
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/docs/schema`
- **Internal/Admin Route (if any)**: `/dev/docs/schema`
- **Dev Route (current project path)**: src/routes/dev/docs/schema.tsx
- **Component Path**: src/routes/dev/docs/schema.tsx
- **UI Pattern**: Schema viewer
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Table list, Field details, Relationships
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Database schema documentation

---

## DEV-103: Architecture Docs

- **Module**: Dev Hub - Docs
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/docs/architecture`
- **Internal/Admin Route (if any)**: `/dev/docs/architecture`
- **Dev Route (current project path)**: src/routes/dev/docs/architecture.tsx
- **Component Path**: src/routes/dev/docs/architecture.tsx
- **UI Pattern**: Documentation viewer
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Architecture diagrams, Design docs
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: System architecture documentation

---

## DEV-104: Changelog

- **Module**: Dev Hub - Docs
- **Portal(s)**: Dev Hub only
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: `/dev/docs/changelog`
- **Internal/Admin Route (if any)**: `/dev/docs/changelog`
- **Dev Route (current project path)**: src/routes/dev/docs/changelog.tsx
- **Component Path**: src/routes/dev/docs/changelog.tsx
- **UI Pattern**: Documentation viewer
- **Tenant Availability**: Global (Dev)
- **Subscreens / Tabs / Modals**: Version list, Change details
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: System changelog

---

# GLOBAL OVERLAYS & COMPONENTS

---

## OVRL-001: VITANA Orb Overlay

- **Module**: Global - VITANA
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: N/A (Overlay component)
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/components/vitanaland/VitanaAudioOverlay.tsx
- **Component Path**: src/components/vitanaland/VitanaAudioOverlay.tsx
- **UI Pattern**: orb-overlay (Full-screen voice interface)
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Voice listening, Voice output, Command suggestions, Text input (hidden by default)
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: VITANA voice-first AI assistant overlay; activated via Cmd/Ctrl+K or clicking mini orb in sidebar

---

## OVRL-002: Profile Preview Dialog

- **Module**: Global - Profiles
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: N/A (Overlay component)
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/components/profile/ProfilePreviewDialog.tsx
- **Component Path**: src/components/profile/ProfilePreviewDialog.tsx
- **UI Pattern**: dialog
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Profile card preview, View full profile link
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Quick profile preview without losing context; triggered by clicking avatars with onPreview prop

---

## OVRL-003: Meetup Details Drawer

- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: N/A (Overlay component)
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/components/meetups/MeetupDetailsDrawer.tsx
- **Component Path**: src/components/meetups/MeetupDetailsDrawer.tsx
- **UI Pattern**: drawer
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Event details, RSVP, Share, Host info
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Meetup event details overlay

---

## OVRL-004: Event Details Drawer

- **Module**: Community
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: N/A (Overlay component)
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/components/events/EventDetailsDrawer.tsx (if exists)
- **Component Path**: src/components/events/EventDetailsDrawer.tsx
- **UI Pattern**: drawer
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Event info, Attendees, Register
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Community event details overlay

---

## OVRL-005: Master Action Popup

- **Module**: Global - Actions
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: N/A (Overlay component)
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/components/MasterActionPopup.tsx (if exists)
- **Component Path**: src/components/MasterActionPopup.tsx
- **UI Pattern**: dialog
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Quick action selector
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Global quick action menu

---

## OVRL-006: Calendar Popup

- **Module**: Global - Utility
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: N/A (Overlay component)
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/components/CalendarPopup.tsx (if exists)
- **Component Path**: src/components/CalendarPopup.tsx
- **UI Pattern**: dialog
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Calendar view, Add event
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Quick calendar access popup

---

## OVRL-007: Wallet Popup

- **Module**: Global - Wallet
- **Portal(s)**: All
- **Roles with access**: Community, Patient, Professional, Staff, Admin
- **External Route (client URL)**: N/A (Overlay component)
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/components/WalletPopup.tsx (if exists)
- **Component Path**: src/components/WalletPopup.tsx
- **UI Pattern**: dialog
- **Tenant Availability**: Global
- **Subscreens / Tabs / Modals**: Balance, Quick transfer
- **Status**: 🚧 Placeholder
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Quick wallet access popup

---

## OVRL-008: Presence Debug Panel

- **Module**: Dev - Utility
- **Portal(s)**: All (Dev mode only)
- **Roles with access**: Admin (Dev access)
- **External Route (client URL)**: N/A (Fixed component)
- **Internal/Admin Route (if any)**: N/A
- **Dev Route (current project path)**: src/components/debug/PresenceDebugPanel.tsx
- **Component Path**: src/components/debug/PresenceDebugPanel.tsx
- **UI Pattern**: Fixed debug panel
- **Tenant Availability**: Global (Dev mode)
- **Subscreens / Tabs / Modals**: Presence info, Dismiss button
- **Status**: ✅ Implemented
- **Purpose**: TBD (pending functional review)
- **Primary APIs Used**: TBD (pending functional review)
- **DB Tables / Models Used**: TBD (pending functional review)
- **Compliance Notes**: TBD (pending functional review)
- **Event Triggers**: TBD (pending functional review)
- **Dependencies**: TBD (pending functional review)
- **Notes**: Real-time presence debugging; only visible in dev mode; can be dismissed

---

# Cross-Reference Tables

---

## Route to Screen ID Quick Reference

| Route | Screen ID | Screen Name |
|-------|-----------|-------------|
| `/` | AUTH-001 | Landing Page |
| `/auth` | AUTH-002 | Generic Auth |
| `/maxina` | AUTH-003 | Maxina Portal Login |
| `/alkalma` | AUTH-004 | Alkalma Portal Login |
| `/earthlinks` | AUTH-005 | Earthlinks Portal Login |
| `/community` | AUTH-006 | Community Portal Login |
| `/exafy-admin` | AUTH-007 | Exafy Admin Portal Login |
| `/_intro/:tenantSlug` | AUTH-008 | Intro Experience |
| `/home` | HOME-001 | Home Overview |
| `/home/context` | HOME-002 | Context |
| `/home/actions` | HOME-003 | Actions |
| `/home/matches` | HOME-004 | Matches |
| `/home/aifeed` | HOME-005 | AI Feed |
| `/community` | COMM-001 | Community Overview |
| `/community/events` | COMM-002 | Events & Meetups |
| `/community/live-rooms` | COMM-003 | Live Rooms |
| `/community/media-hub` | COMM-004 | Media Hub |
| `/community/my-business` | COMM-005 | My Business |
| `/discover` | DISC-001 | Discover Overview |
| `/discover/supplements` | DISC-002 | Supplements |
| `/health` | HLTH-001 | Health Overview |
| `/health/biomarkers` | HLTH-003 | My Biology |
| `/inbox` | INBX-001 | Inbox Overview |
| `/ai` | AI-001 | AI Overview |
| `/wallet` | WLLT-001 | Wallet Overview |
| `/sharing` | SHAR-001 | Sharing Overview |
| `/sharing/campaigns` | SHAR-002 | Campaigns |
| `/memory` | MEMO-001 | Memory Overview |
| `/memory/diary` | MEMO-003 | Diary |
| `/settings` | SETT-001 | Settings Overview |
| `/patient` | PTNT-001 | Patient Dashboard |
| `/professional` | PROF-001 | Professional Dashboard |
| `/staff` | STFF-001 | Staff Dashboard |
| `/admin` | ADMN-001 | Admin Dashboard |
| `/admin/tenant-management` | ADMN-020 | Tenant Management |
| `/admin/notification-dashboard` | ADMN-051 | Notification Dashboard |
| `/dev` | DEV-001 | Dev Hub Dashboard |
| `/dev/login` | DEV-002 | Dev Login |

---

## Implementation Status Summary

| Status | Count |
|--------|-------|
| ✅ Implemented | 78 |
| 🚧 Placeholder | 129 |
| ❌ Missing | 8 |
| **TOTAL** | **215** |

---

## Role Access Matrix

| Role | Screen Count | Key Modules |
|------|-------------|-------------|
| Public (unauthenticated) | 15 | Auth, Landing, Portals |
| Community | 55 | Home, Community, Discover, Health, Inbox, AI, Wallet, Sharing, Memory, Settings |
| Patient | 9 | Patient Dashboard, Health, Appointments, Care Team |
| Professional | 9 | Professional Dashboard, Patients, Schedule, Clinical Tools |
| Staff | 9 | Staff Dashboard, Queue, Tasks, Schedule |
| Admin | 47 | Admin Dashboard, User Management, Tenant Management, System Admin, Monitoring, Community Supervision, Media, AI, Automation, Live Stream |
| Dev (Admin) | 63 | Dev Hub, Command, Agents, Pipelines, OASIS, VTID, Gateway, CI/CD, Observability, Settings, Docs |

---

## Module Summary

| Module | Screen Count | Status |
|--------|-------------|--------|
| Public/Auth | 15 | 100% Implemented |
| Home | 5 | 20% Implemented |
| Community | 9 | 56% Implemented |
| Discover | 9 | 56% Implemented |
| Health | 7 | 43% Implemented |
| Inbox | 4 | 25% Implemented |
| AI | 5 | 20% Implemented |
| Wallet | 4 | 25% Implemented |
| Sharing | 5 | 60% Implemented |
| Memory | 5 | 40% Implemented |
| Settings | 8 | 25% Implemented |
| Patient | 9 | 11% Implemented |
| Professional | 9 | 11% Implemented |
| Staff | 9 | 11% Implemented |
| Admin | 47 | 40% Implemented |
| Dev Hub | 63 | 100% Implemented |
| Global Overlays | 8 | 38% Implemented |

---

**End of VITANA Screen Registry v1.0**
