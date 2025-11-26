# VITANA Role-Based Screen Access Matrix

**Version**: 1.0  
**Last Updated**: 2025-11-26  
**Source**: docs/SCREEN_REGISTRY.md

---

## Table of Contents

1. [Overview](#overview)
2. [Community Role](#community-role)
3. [Patient Role](#patient-role)
4. [Professional Role](#professional-role)
5. [Staff Role](#staff-role)
6. [Admin Role](#admin-role)
7. [Summary Statistics](#summary-statistics)

---

## Overview

This document provides a complete role-based access matrix for the VITANA platform, showing exactly which screens each role can access. Each role section includes a table with all accessible screens, organized by module and Screen ID.

**Purpose**: Enable rapid understanding of role-specific capabilities, access control planning, and feature scope per role.

**Roles Covered**:
- **Community**: General community members with basic access
- **Patient**: Healthcare patients with medical record access
- **Professional**: Healthcare providers and wellness professionals
- **Staff**: Facility and administrative staff
- **Admin**: System administrators with full access

---

# COMMUNITY ROLE

## Overview

The Community role represents general platform members with access to social, wellness, and marketplace features. This is the base access level for authenticated users.

**Total Screens Accessible**: 55

---

## Community Role - Screen Access Table

| Screen ID | Screen Name | Module | External Route | Internal/Admin Route | Dev Component Path | Status | Notes |
|-----------|-------------|--------|----------------|----------------------|-------------------|--------|-------|
| **HOME MODULE** |
| HOME-001 | Home Overview | Home | /home | N/A | src/pages/Home.tsx | ✅ | Primary dashboard; Screen ID D1-001 |
| HOME-002 | Context | Home | /home/context | N/A | src/pages/home/Context.tsx | 🚧 | User context and recent activity |
| HOME-003 | Actions | Home | /home/actions | N/A | src/pages/home/Actions.tsx | 🚧 | Quick actions and shortcuts |
| HOME-004 | Matches | Home | /home/matches | N/A | src/pages/home/Matches.tsx | 🚧 | AI-powered connection matches |
| HOME-005 | AI Feed | Home | /home/aifeed | N/A | src/pages/home/AIFeed.tsx | 🚧 | Personalized AI-generated content |
| **COMMUNITY MODULE** |
| COMM-001 | Community Overview | Community | /community | N/A | src/pages/Community.tsx | ✅ | Community hub dashboard |
| COMM-002 | Events & Meetups | Community | /community/events | N/A | src/pages/community/EventsAndMeetups.tsx | ✅ | Combined events and meetups view |
| COMM-003 | Live Rooms | Community | /community/live-rooms | N/A | src/pages/community/LiveRooms.tsx | ✅ | Live audio/video rooms |
| COMM-004 | Media Hub | Community | /community/media-hub | N/A | src/pages/community/MediaHub.tsx | 🚧 | Community media library |
| COMM-005 | My Business | Community | /community/my-business | N/A | src/pages/community/MyBusiness.tsx | ✅ | Business profile management |
| COMM-006 | Group Detail | Community | /community/groups/:groupId | N/A | src/pages/community/GroupDetail.tsx | 🚧 | Individual group page |
| COMM-007 | Feed | Community | /community/feed | N/A | src/pages/community/Feed.tsx | 🚧 | Community social feed |
| COMM-008 | Challenges | Community | /community/challenges | N/A | src/pages/community/Challenges.tsx | 🚧 | Wellness challenges |
| COMM-009 | Groups | Community | /community/groups | N/A | src/pages/community/Groups.tsx | ✅ | Community groups discovery |
| **DISCOVER MODULE** |
| DISC-001 | Discover Overview | Discover | /discover | N/A | src/pages/Discover.tsx | ✅ | Discover marketplace hub |
| DISC-002 | Supplements | Discover | /discover/supplements | N/A | src/pages/discover/Supplements.tsx | ✅ | Supplement marketplace |
| DISC-003 | Wellness Services | Discover | /discover/wellness-services | N/A | src/pages/discover/WellnessServices.tsx | 🚧 | Wellness services discovery |
| DISC-004 | Doctors & Coaches | Discover | /discover/doctors-coaches | N/A | src/pages/discover/DoctorsCoaches.tsx | 🚧 | Healthcare professional discovery |
| DISC-005 | Deals & Offers | Discover | /discover/deals-offers | N/A | src/pages/discover/DealsOffers.tsx | 🚧 | Special deals and promotions |
| DISC-006 | Orders | Discover | /discover/orders | N/A | src/pages/discover/Orders.tsx | ✅ | User order history |
| DISC-007 | Product Detail | Discover | /discover/product/:productId | N/A | src/pages/discover/ProductDetail.tsx | ✅ | Product detail page |
| DISC-008 | Provider Profile | Discover | /discover/provider/:providerId | N/A | src/pages/discover/ProviderProfile.tsx | 🚧 | Healthcare provider profile |
| DISC-009 | Cart | Discover | /discover/cart | N/A | src/pages/discover/Cart.tsx | ✅ | Shopping cart |
| **HEALTH MODULE** |
| HLTH-001 | Health Overview | Health | /health | N/A | src/pages/Health.tsx | ✅ | Health hub dashboard |
| HLTH-002 | Services Hub | Health | /health/services-hub | N/A | src/pages/health/ServicesHub.tsx | 🚧 | Health services directory |
| HLTH-003 | My Biology | Health | /health/biomarkers | N/A | src/pages/health/Biomarkers.tsx | ✅ | Personal biomarker tracking |
| HLTH-004 | Plans | Health | /health/plans | N/A | src/pages/health/Plans.tsx | 🚧 | Personalized health plans |
| HLTH-005 | Education | Health | /health/education | N/A | src/pages/health/Education.tsx | 🚧 | Health education content |
| HLTH-006 | Pillars | Health | /health/pillars | N/A | src/pages/health/Pillars.tsx | 🚧 | Health pillar tracking |
| HLTH-007 | Conditions & Risks | Health | /health/conditions | N/A | src/pages/health/ConditionsRisks.tsx | ✅ | Health risk assessments |
| **INBOX MODULE** |
| INBX-001 | Inbox Overview | Inbox | /inbox | N/A | src/pages/Inbox.tsx | ✅ | Inbox hub |
| INBX-002 | Reminder | Inbox | /inbox/reminder | N/A | src/pages/inbox/Reminder.tsx | 🚧 | Reminder messages |
| INBX-003 | Inspiration | Inbox | /inbox/inspiration | N/A | src/pages/inbox/Inspiration.tsx | 🚧 | Inspirational content |
| INBX-004 | Archived | Inbox | /inbox/archived | N/A | src/pages/inbox/Archived.tsx | 🚧 | Archived messages |
| **AI MODULE** |
| AI-001 | AI Overview | AI | /ai | N/A | src/pages/ai/AIOverview.tsx | ✅ | AI hub dashboard |
| AI-002 | Insights | AI | /ai/insights | N/A | src/pages/ai/Insights.tsx | 🚧 | AI-generated insights |
| AI-003 | Recommendations | AI | /ai/recommendations | N/A | src/pages/ai/Recommendations.tsx | 🚧 | AI recommendations |
| AI-004 | Daily Summary | AI | /ai/daily-summary | N/A | src/pages/ai/DailySummary.tsx | 🚧 | Daily AI summary |
| AI-005 | Companion | AI | /ai/companion | N/A | src/pages/ai/Companion.tsx | 🚧 | AI companion chat |
| **WALLET MODULE** |
| WLLT-001 | Wallet Overview | Wallet | /wallet | N/A | src/pages/Wallet.tsx | ✅ | Wallet hub |
| WLLT-002 | Balance | Wallet | /wallet/balance | N/A | src/pages/wallet/Balance.tsx | 🚧 | Wallet balance view |
| WLLT-003 | Transactions | Wallet | /wallet/transactions | N/A | src/pages/wallet/Transactions.tsx | 🚧 | Transaction history |
| WLLT-004 | Payment Methods | Wallet | /wallet/payment-methods | N/A | src/pages/wallet/PaymentMethods.tsx | 🚧 | Payment methods management |
| **SHARING MODULE** |
| SHAR-001 | Sharing Overview | Sharing | /sharing | N/A | src/pages/Sharing.tsx | ✅ | Sharing hub |
| SHAR-002 | Distribution | Sharing | /sharing/distribution | N/A | src/pages/sharing/Distribution.tsx | ✅ | Content distribution |
| SHAR-003 | Campaigns | Sharing | /sharing/campaigns | N/A | src/pages/sharing/Campaigns.tsx | ✅ | Marketing campaigns |
| **MEMORY MODULE** |
| MEMO-001 | Memory Overview | Memory | /memory | N/A | src/pages/Memory.tsx | ✅ | Memory hub |
| MEMO-002 | Diary | Memory | /memory/diary | N/A | src/pages/memory/Diary.tsx | ✅ | Personal diary entries |
| MEMO-003 | Autopilot | Memory | /memory/autopilot | N/A | src/pages/memory/Autopilot.tsx | ✅ | AI autopilot actions |
| **SETTINGS MODULE** |
| SETT-001 | Settings Overview | Settings | /settings | N/A | src/pages/Settings.tsx | ✅ | Settings hub |
| SETT-002 | Profile | Settings | /settings/profile | N/A | src/pages/settings/Profile.tsx | ✅ | Profile settings |
| SETT-003 | Preferences | Settings | /settings/preferences | N/A | src/pages/settings/Preferences.tsx | ✅ | User preferences |
| SETT-004 | Security | Settings | /settings/security | N/A | src/pages/settings/Security.tsx | ✅ | Security settings |
| SETT-005 | Automations | Settings | /settings/automations | N/A | src/pages/settings/Automations.tsx | ✅ | Automation rules |
| **PROFILE MODULE** |
| PROF-001 | User Profile | Profile | /u/:handle | N/A | src/pages/UserProfile.tsx | ✅ | Public user profile |

---

# PATIENT ROLE

## Overview

The Patient role includes all Community role access plus healthcare-specific features for managing appointments, test results, and care teams.

**Total Screens Accessible**: 64 (55 Community + 9 Patient-specific)

---

## Patient Role - Screen Access Table

| Screen ID | Screen Name | Module | External Route | Internal/Admin Route | Dev Component Path | Status | Notes |
|-----------|-------------|--------|----------------|----------------------|-------------------|--------|-------|
| **ALL COMMUNITY SCREENS** | (See Community Role table above for 55 screens) |
| **PATIENT-SPECIFIC SCREENS** |
| PTNT-001 | Patient Dashboard | Patient | /patient | N/A | src/pages/patient/Dashboard.tsx | ✅ | Patient role dashboard |
| PTNT-002 | Medical Records | Patient | /patient/medical-records | N/A | src/pages/patient/MedicalRecords.tsx | 🚧 | Personal medical records |
| PTNT-003 | Appointments | Patient | /patient/appointments | N/A | src/pages/patient/Appointments.tsx | 🚧 | Appointments management |
| PTNT-004 | Test Results | Patient | /patient/test-results | N/A | src/pages/patient/TestResults.tsx | 🚧 | Lab and test results |
| PTNT-005 | Care Team | Patient | /patient/care-team | N/A | src/pages/patient/CareTeam.tsx | 🚧 | Patient's care team |
| PTNT-006 | Health Goals | Patient | /patient/health-goals | N/A | src/pages/patient/HealthGoals.tsx | 🚧 | Patient health goals |
| PTNT-007 | Insurance | Patient | /patient/insurance | N/A | src/pages/patient/Insurance.tsx | 🚧 | Insurance information |
| PTNT-008 | Notifications | Patient | /patient/notifications | N/A | src/pages/patient/Notifications.tsx | 🚧 | Patient notifications |
| PTNT-009 | Settings | Patient | /patient/settings | N/A | src/pages/patient/Settings.tsx | 🚧 | Patient-specific settings |

---

# PROFESSIONAL ROLE

## Overview

The Professional role includes all Community role access plus tools for managing patients, schedules, clinical tools, and professional services.

**Total Screens Accessible**: 64 (55 Community + 9 Professional-specific)

---

## Professional Role - Screen Access Table

| Screen ID | Screen Name | Module | External Route | Internal/Admin Route | Dev Component Path | Status | Notes |
|-----------|-------------|--------|----------------|----------------------|-------------------|--------|-------|
| **ALL COMMUNITY SCREENS** | (See Community Role table above for 55 screens) |
| **PROFESSIONAL-SPECIFIC SCREENS** |
| PROF-001 | Professional Dashboard | Professional | /professional | N/A | src/pages/professional/Dashboard.tsx | ✅ | Professional role dashboard |
| PROF-002 | Patients | Professional | /professional/patients | N/A | src/pages/professional/Patients.tsx | 🚧 | Patient management |
| PROF-003 | Schedule | Professional | /professional/schedule | N/A | src/pages/professional/Schedule.tsx | 🚧 | Professional schedule |
| PROF-004 | Clinical Tools | Professional | /professional/clinical-tools | N/A | src/pages/professional/ClinicalTools.tsx | 🚧 | Clinical assessment tools |
| PROF-005 | Referrals | Professional | /professional/referrals | N/A | src/pages/professional/Referrals.tsx | 🚧 | Patient referral management |
| PROF-006 | Billing | Professional | /professional/billing | N/A | src/pages/professional/Billing.tsx | 🚧 | Professional billing |
| PROF-007 | Professional Profile | Professional | /professional/profile | N/A | src/pages/professional/Profile.tsx | 🚧 | Professional public profile |
| PROF-008 | Education | Professional | /professional/education | N/A | src/pages/professional/Education.tsx | 🚧 | Continuing education |
| PROF-009 | Settings | Professional | /professional/settings | N/A | src/pages/professional/Settings.tsx | 🚧 | Professional settings |

---

# STAFF ROLE

## Overview

The Staff role includes all Community role access plus operational tools for managing queues, tasks, schedules, and facility operations.

**Total Screens Accessible**: 64 (55 Community + 9 Staff-specific)

---

## Staff Role - Screen Access Table

| Screen ID | Screen Name | Module | External Route | Internal/Admin Route | Dev Component Path | Status | Notes |
|-----------|-------------|--------|----------------|----------------------|-------------------|--------|-------|
| **ALL COMMUNITY SCREENS** | (See Community Role table above for 55 screens) |
| **STAFF-SPECIFIC SCREENS** |
| STFF-001 | Staff Dashboard | Staff | /staff | N/A | src/pages/staff/Dashboard.tsx | ✅ | Staff role dashboard |
| STFF-002 | Queue | Staff | /staff/queue | N/A | src/pages/staff/Queue.tsx | 🚧 | Patient queue management |
| STFF-003 | Daily Tasks | Staff | /staff/daily-tasks | N/A | src/pages/staff/DailyTasks.tsx | 🚧 | Daily task management |
| STFF-004 | Schedule | Staff | /staff/schedule | N/A | src/pages/staff/Schedule.tsx | 🚧 | Staff schedule management |
| STFF-005 | Reports | Staff | /staff/reports | N/A | src/pages/staff/Reports.tsx | 🚧 | Staff reporting |
| STFF-006 | Communications | Staff | /staff/communications | N/A | src/pages/staff/Communications.tsx | 🚧 | Staff communications |
| STFF-007 | Staff Tools | Staff | /staff/tools | N/A | src/pages/staff/StaffTools.tsx | 🚧 | Staff utility tools |
| STFF-008 | Time Tracking | Staff | /staff/time-tracking | N/A | src/pages/staff/TimeTracking.tsx | 🚧 | Time tracking for staff |
| STFF-009 | Settings | Staff | /staff/settings | N/A | src/pages/staff/Settings.tsx | 🚧 | Staff-specific settings |

---

# ADMIN ROLE

## Overview

The Admin role has full platform access including all Community screens plus comprehensive administrative tools for user management, system configuration, monitoring, content moderation, and platform operations.

**Total Screens Accessible**: 102 (55 Community + 47 Admin-specific)

---

## Admin Role - Screen Access Table

| Screen ID | Screen Name | Module | External Route | Internal/Admin Route | Dev Component Path | Status | Notes |
|-----------|-------------|--------|----------------|----------------------|-------------------|--------|-------|
| **ALL COMMUNITY SCREENS** | (See Community Role table above for 55 screens) |
| **ADMIN-SPECIFIC SCREENS** |
| **ADMIN DASHBOARD** |
| ADMN-001 | Admin Dashboard | Admin | /admin | /admin | src/pages/admin/Dashboard.tsx | ✅ | Admin main dashboard |
| ADMN-002 | Overview | Admin | /admin/overview | /admin/overview | src/pages/admin/Overview.tsx | ✅ | High-level system overview |
| **USER MANAGEMENT** |
| ADMN-010 | User Management | Admin - User Mgmt | /admin/user-management | /admin/user-management | src/pages/admin/UserManagement.tsx | ✅ | User account management |
| ADMN-011 | Roles & Permissions | Admin - User Mgmt | /admin/roles-permissions | /admin/roles-permissions | src/pages/admin/RolesPermissions.tsx | 🚧 | RBAC management |
| ADMN-012 | User Activity | Admin - User Mgmt | /admin/user-activity | /admin/user-activity | src/pages/admin/UserActivity.tsx | 🚧 | User activity monitoring |
| **TENANT MANAGEMENT** |
| ADMN-020 | Tenant Management | Admin - Tenant | /admin/tenant-management | /admin/tenant-management | src/pages/admin/TenantManagement.tsx | ✅ | Multi-tenant management |
| ADMN-021 | Tenant Analytics | Admin - Tenant | /admin/tenant-analytics | /admin/tenant-analytics | src/pages/admin/TenantAnalytics.tsx | ✅ | Tenant-level analytics |
| ADMN-022 | Tenant Config | Admin - Tenant | /admin/tenant-config | /admin/tenant-config | src/pages/admin/TenantConfig.tsx | 🚧 | Tenant configuration |
| **CONTENT MODERATION** |
| ADMN-030 | Content Moderation | Admin - Moderation | /admin/content-moderation | /admin/content-moderation | src/pages/admin/ContentModeration.tsx | ✅ | Content review queue |
| ADMN-031 | Reported Content | Admin - Moderation | /admin/reported-content | /admin/reported-content | src/pages/admin/ReportedContent.tsx | ✅ | User-reported content |
| ADMN-032 | Moderation Rules | Admin - Moderation | /admin/moderation-rules | /admin/moderation-rules | src/pages/admin/ModerationRules.tsx | 🚧 | Auto-moderation rules |
| ADMN-033 | Flagged Users | Admin - Moderation | /admin/flagged-users | /admin/flagged-users | src/pages/admin/FlaggedUsers.tsx | 🚧 | Flagged user accounts |
| **COMMUNITY ADMIN** |
| ADMN-040 | Group Management | Admin - Community | /admin/group-management | /admin/group-management | src/pages/admin/GroupManagement.tsx | ✅ | Community groups admin |
| ADMN-041 | Event Management | Admin - Community | /admin/event-management | /admin/event-management | src/pages/admin/EventManagement.tsx | ✅ | Events administration |
| ADMN-042 | Live Room Control | Admin - Community | /admin/live-room-control | /admin/live-room-control | src/pages/admin/LiveRoomControl.tsx | 🚧 | Live rooms management |
| **SYSTEM ADMINISTRATION** |
| ADMN-050 | System Config | Admin - System | /admin/system-config | /admin/system-config | src/pages/admin/SystemConfig.tsx | ✅ | System configuration |
| ADMN-051 | Feature Flags | Admin - System | /admin/feature-flags | /admin/feature-flags | src/pages/admin/FeatureFlags.tsx | ✅ | Feature flag management |
| ADMN-052 | Email Templates | Admin - System | /admin/email-templates | /admin/email-templates | src/pages/admin/EmailTemplates.tsx | 🚧 | Email template editor |
| ADMN-053 | Notification Config | Admin - System | /admin/notification-config | /admin/notification-config | src/pages/admin/NotificationConfig.tsx | 🚧 | Notification settings |
| ADMN-054 | API Keys | Admin - System | /admin/api-keys | /admin/api-keys | src/pages/admin/APIKeys.tsx | 🚧 | API key management |
| **MONITORING** |
| ADMN-060 | Performance Monitor | Admin - Monitoring | /admin/performance-monitor | /admin/performance-monitor | src/pages/admin/PerformanceMonitor.tsx | ✅ | System performance |
| ADMN-061 | Error Tracking | Admin - Monitoring | /admin/error-tracking | /admin/error-tracking | src/pages/admin/ErrorTracking.tsx | ✅ | Error logs and tracking |
| ADMN-062 | Audit Logs | Admin - Monitoring | /admin/audit-logs | /admin/audit-logs | src/pages/admin/AuditLogs.tsx | ✅ | System audit trail |
| ADMN-063 | Security Alerts | Admin - Monitoring | /admin/security-alerts | /admin/security-alerts | src/pages/admin/SecurityAlerts.tsx | 🚧 | Security monitoring |
| **HEALTH DATA ADMIN** |
| ADMN-070 | Biomarker Admin | Admin - Health | /admin/biomarker-admin | /admin/biomarker-admin | src/pages/admin/BiomarkerAdmin.tsx | ✅ | Biomarker management |
| ADMN-071 | Health Records | Admin - Health | /admin/health-records | /admin/health-records | src/pages/admin/HealthRecords.tsx | 🚧 | Health record admin |
| ADMN-072 | Test Result Review | Admin - Health | /admin/test-result-review | /admin/test-result-review | src/pages/admin/TestResultReview.tsx | 🚧 | Test result verification |
| **AI & AUTOMATION** |
| ADMN-080 | AI Agent Control | Admin - AI | /admin/ai-agent-control | /admin/ai-agent-control | src/pages/admin/AIAgentControl.tsx | ✅ | AI agent management |
| ADMN-081 | Automation Monitor | Admin - AI | /admin/automation-monitor | /admin/automation-monitor | src/pages/admin/AutomationMonitor.tsx | ✅ | Automation monitoring |
| ADMN-082 | ML Model Config | Admin - AI | /admin/ml-model-config | /admin/ml-model-config | src/pages/admin/MLModelConfig.tsx | 🚧 | ML model configuration |
| **COMMERCE ADMIN** |
| ADMN-090 | Product Management | Admin - Commerce | /admin/product-management | /admin/product-management | src/pages/admin/ProductManagement.tsx | ✅ | Product catalog admin |
| ADMN-091 | Order Management | Admin - Commerce | /admin/order-management | /admin/order-management | src/pages/admin/OrderManagement.tsx | ✅ | Order administration |
| ADMN-092 | Payment Analytics | Admin - Commerce | /admin/payment-analytics | /admin/payment-analytics | src/pages/admin/PaymentAnalytics.tsx | 🚧 | Payment analytics |
| **LIVE & STREAM** |
| ADMN-100 | Live Stream Control | Admin - Live | /admin/live-stream-control | /admin/live-stream-control | src/pages/admin/LiveStreamControl.tsx | ✅ | Live stream management |
| ADMN-101 | Stream Analytics | Admin - Live | /admin/stream-analytics | /admin/stream-analytics | src/pages/admin/StreamAnalytics.tsx | 🚧 | Live stream analytics |
| ADMN-102 | Stream Quality Monitoring | Admin - Live | /admin/stream-quality | /admin/stream-quality | src/pages/admin/StreamQuality.tsx | 🚧 | Stream quality monitoring |
| ADMN-103 | Recording Manager | Admin - Live | /admin/recording-manager | /admin/recording-manager | src/pages/admin/RecordingManager.tsx | 🚧 | Stream recording management |
| ADMN-104 | Broadcast Settings | Admin - Live | /admin/broadcast-settings | /admin/broadcast-settings | src/pages/admin/BroadcastSettings.tsx | 🚧 | Broadcast configuration |
| **ANALYTICS** |
| ADMN-110 | Platform Analytics | Admin - Analytics | /admin/platform-analytics | /admin/platform-analytics | src/pages/admin/PlatformAnalytics.tsx | ✅ | Platform-wide analytics |
| ADMN-111 | User Engagement | Admin - Analytics | /admin/user-engagement | /admin/user-engagement | src/pages/admin/UserEngagement.tsx | 🚧 | Engagement metrics |
| ADMN-112 | Revenue Analytics | Admin - Analytics | /admin/revenue-analytics | /admin/revenue-analytics | src/pages/admin/RevenueAnalytics.tsx | 🚧 | Revenue analytics |
| **INTEGRATIONS** |
| ADMN-120 | Integration Hub | Admin - Integrations | /admin/integration-hub | /admin/integration-hub | src/pages/admin/IntegrationHub.tsx | ✅ | Integration management |
| ADMN-121 | API Testing | Admin - Integrations | /admin/api-testing | /admin/api-testing | src/pages/admin/APITesting.tsx | ✅ | API integration testing |
| ADMN-122 | Webhook Config | Admin - Integrations | /admin/webhook-config | /admin/webhook-config | src/pages/admin/WebhookConfig.tsx | 🚧 | Webhook configuration |

---

# SUMMARY STATISTICS

## Screen Count by Role

| Role | Total Screens | Implemented | Placeholder | Missing | Community Base | Role-Specific |
|------|---------------|-------------|-------------|---------|----------------|---------------|
| **Community** | 55 | 32 | 23 | 0 | 55 | 0 |
| **Patient** | 64 | 33 | 31 | 0 | 55 | 9 |
| **Professional** | 64 | 33 | 31 | 0 | 55 | 9 |
| **Staff** | 64 | 33 | 31 | 0 | 55 | 9 |
| **Admin** | 102 | 52 | 50 | 0 | 55 | 47 |

## Implementation Progress by Role

| Role | % Implemented | % Placeholder | % Missing |
|------|---------------|---------------|-----------|
| Community | 58% | 42% | 0% |
| Patient | 52% | 48% | 0% |
| Professional | 52% | 48% | 0% |
| Staff | 52% | 48% | 0% |
| Admin | 51% | 49% | 0% |

## Module Coverage

### Community Role Modules
- Home (5 screens)
- Community (9 screens)
- Discover (9 screens)
- Health (7 screens)
- Inbox (4 screens)
- AI (5 screens)
- Wallet (4 screens)
- Sharing (3 screens)
- Memory (3 screens)
- Settings (5 screens)
- Profile (1 screen)

### Admin-Specific Modules
- User Management (3 screens)
- Tenant Management (3 screens)
- Content Moderation (4 screens)
- Community Admin (3 screens)
- System Administration (5 screens)
- Monitoring (4 screens)
- Health Data Admin (3 screens)
- AI & Automation (3 screens)
- Commerce Admin (3 screens)
- Live & Stream (5 screens)
- Analytics (3 screens)
- Integrations (3 screens)

---

## Notes

1. **Hierarchical Access**: Patient, Professional, and Staff roles inherit all Community role screens plus their specific role screens.

2. **Admin Access**: Admin role has access to all Community screens plus extensive administrative tools.

3. **Dev Hub Exclusion**: Dev Hub screens (63 screens) are excluded from this matrix as they are accessed via separate dev credentials and not part of the standard role hierarchy.

4. **Global Overlays**: Global components like ProfilePreviewDialog and VitanalandWorldLayer are accessible to all roles and not counted in per-role totals.

5. **Implementation Priority**: Screens marked as 🚧 Placeholder are planned but not fully implemented. Focus areas for development should consider role-specific needs and feature dependencies.

6. **Route Patterns**: 
   - External routes are user-facing URLs
   - Internal/Admin routes (when present) indicate admin-specific paths
   - Dev Component Paths show exact file locations for implementation

---

**Document End**
