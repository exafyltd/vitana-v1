import React from "react";

/**
 * Screen ID management system for UI pattern enforcement
 * Synchronized with docs/SCREEN_REGISTRY.md
 * 
 * Total Screen IDs: 214 (DEV-044 removed - not in registry)
 * Last Synced: 2025-11-26
 */

// ============================================================================
// PUBLIC & AUTHENTICATION (15 screens)
// ============================================================================

export const SCREEN_AUTH_001 = "AUTH-001"; // Landing Page
export const SCREEN_AUTH_002 = "AUTH-002"; // Generic Auth
export const SCREEN_AUTH_003 = "AUTH-003"; // Maxina Portal Login
export const SCREEN_AUTH_004 = "AUTH-004"; // Alkalma Portal Login
export const SCREEN_AUTH_005 = "AUTH-005"; // Earthlinks Portal Login
export const SCREEN_AUTH_006 = "AUTH-006"; // Community Portal Login
export const SCREEN_AUTH_007 = "AUTH-007"; // Exafy Admin Portal Login
export const SCREEN_AUTH_008 = "AUTH-008"; // Intro Experience
export const SCREEN_AUTH_009 = "AUTH-009"; // Email Confirmation (Maxina)
export const SCREEN_AUTH_010 = "AUTH-010"; // Email Confirmation (Alkalma)
export const SCREEN_AUTH_011 = "AUTH-011"; // Email Confirmation (Earthlinks)
export const SCREEN_AUTH_012 = "AUTH-012"; // Email Confirmation (Community)
export const SCREEN_AUTH_013 = "AUTH-013"; // Email Confirmation (Exafy)
export const SCREEN_AUTH_014 = "AUTH-014"; // Not Found (404)
export const SCREEN_AUTH_015 = "AUTH-015"; // Legacy Profile Redirect

// ============================================================================
// HOME MODULE (5 screens)
// ============================================================================

export const SCREEN_HOME_001 = "HOME-001"; // Home Overview
export const SCREEN_HOME_002 = "HOME-002"; // Context
export const SCREEN_HOME_003 = "HOME-003"; // Actions
export const SCREEN_HOME_004 = "HOME-004"; // Matches
export const SCREEN_HOME_005 = "HOME-005"; // AI Feed

// ============================================================================
// COMMUNITY MODULE (9 screens)
// ============================================================================

export const SCREEN_COMM_001 = "COMM-001"; // Community Overview
export const SCREEN_COMM_002 = "COMM-002"; // Events & Meetups
export const SCREEN_COMM_003 = "COMM-003"; // Live Rooms
export const SCREEN_COMM_004 = "COMM-004"; // Media Hub
export const SCREEN_COMM_005 = "COMM-005"; // My Business
export const SCREEN_COMM_006 = "COMM-006"; // Group Detail
export const SCREEN_COMM_007 = "COMM-007"; // Feed
export const SCREEN_COMM_008 = "COMM-008"; // Challenges
export const SCREEN_COMM_009 = "COMM-009"; // Groups

// ============================================================================
// DISCOVER MODULE (9 screens)
// ============================================================================

export const SCREEN_DISC_001 = "DISC-001"; // Discover Overview
export const SCREEN_DISC_002 = "DISC-002"; // Supplements
export const SCREEN_DISC_003 = "DISC-003"; // Wellness Services
export const SCREEN_DISC_004 = "DISC-004"; // Doctors & Coaches
export const SCREEN_DISC_005 = "DISC-005"; // Deals & Offers
export const SCREEN_DISC_006 = "DISC-006"; // Orders
export const SCREEN_DISC_007 = "DISC-007"; // Product Detail
export const SCREEN_DISC_008 = "DISC-008"; // Provider Profile
export const SCREEN_DISC_009 = "DISC-009"; // Cart

// ============================================================================
// HEALTH MODULE (7 screens)
// ============================================================================

export const SCREEN_HLTH_001 = "HLTH-001"; // Health Overview
export const SCREEN_HLTH_002 = "HLTH-002"; // Services Hub
export const SCREEN_HLTH_003 = "HLTH-003"; // My Biology (Biomarkers)
export const SCREEN_HLTH_004 = "HLTH-004"; // Plans
export const SCREEN_HLTH_005 = "HLTH-005"; // Education
export const SCREEN_HLTH_006 = "HLTH-006"; // Pillars
export const SCREEN_HLTH_007 = "HLTH-007"; // Conditions & Risks

// ============================================================================
// INBOX MODULE (4 screens)
// ============================================================================

export const SCREEN_INBX_001 = "INBX-001"; // Inbox Overview
export const SCREEN_INBX_002 = "INBX-002"; // Reminder
export const SCREEN_INBX_003 = "INBX-003"; // Inspiration
export const SCREEN_INBX_004 = "INBX-004"; // Archived

// ============================================================================
// AI MODULE (5 screens)
// ============================================================================

export const SCREEN_AI_001 = "AI-001"; // AI Overview
export const SCREEN_AI_002 = "AI-002"; // Insights
export const SCREEN_AI_003 = "AI-003"; // Recommendations
export const SCREEN_AI_004 = "AI-004"; // Daily Summary
export const SCREEN_AI_005 = "AI-005"; // Companion

// ============================================================================
// WALLET MODULE (4 screens)
// ============================================================================

export const SCREEN_WLLT_001 = "WLLT-001"; // Wallet Overview
export const SCREEN_WLLT_002 = "WLLT-002"; // Balance
export const SCREEN_WLLT_003 = "WLLT-003"; // Subscriptions
export const SCREEN_WLLT_004 = "WLLT-004"; // Rewards

// ============================================================================
// SHARING MODULE (5 screens)
// ============================================================================

export const SCREEN_SHAR_001 = "SHAR-001"; // Sharing Overview
export const SCREEN_SHAR_002 = "SHAR-002"; // Campaigns
export const SCREEN_SHAR_003 = "SHAR-003"; // Campaign Detail
export const SCREEN_SHAR_004 = "SHAR-004"; // Distribution
export const SCREEN_SHAR_005 = "SHAR-005"; // Data & Consent

// ============================================================================
// MEMORY MODULE (5 screens)
// ============================================================================

export const SCREEN_MEMO_001 = "MEMO-001"; // Memory Overview
export const SCREEN_MEMO_002 = "MEMO-002"; // Timeline
export const SCREEN_MEMO_003 = "MEMO-003"; // Diary
export const SCREEN_MEMO_004 = "MEMO-004"; // Recall
export const SCREEN_MEMO_005 = "MEMO-005"; // Permissions

// ============================================================================
// SETTINGS MODULE (8 screens)
// ============================================================================

export const SCREEN_SETT_001 = "SETT-001"; // Settings Overview
export const SCREEN_SETT_002 = "SETT-002"; // Preferences
export const SCREEN_SETT_003 = "SETT-003"; // Privacy
export const SCREEN_SETT_004 = "SETT-004"; // Notifications
export const SCREEN_SETT_005 = "SETT-005"; // Connected Apps
export const SCREEN_SETT_006 = "SETT-006"; // Billing & Rewards
export const SCREEN_SETT_007 = "SETT-007"; // Support
export const SCREEN_SETT_008 = "SETT-008"; // Tenant & Role

// ============================================================================
// UTILITY SCREENS (5 screens)
// ============================================================================

export const SCREEN_UTIL_001 = "UTIL-001"; // AI Assistant (Persistent Chat)
export const SCREEN_UTIL_002 = "UTIL-002"; // Calendar
export const SCREEN_UTIL_003 = "UTIL-003"; // Search
export const SCREEN_UTIL_004 = "UTIL-004"; // Profile Edit
export const SCREEN_UTIL_005 = "UTIL-005"; // Public Profile

// ============================================================================
// PATIENT ROLE SCREENS (9 screens)
// ============================================================================

export const SCREEN_PTNT_001 = "PTNT-001"; // Patient Dashboard
export const SCREEN_PTNT_002 = "PTNT-002"; // Health
export const SCREEN_PTNT_003 = "PTNT-003"; // Appointments
export const SCREEN_PTNT_004 = "PTNT-004"; // Test Results
export const SCREEN_PTNT_005 = "PTNT-005"; // Care Team
export const SCREEN_PTNT_006 = "PTNT-006"; // Health Goals
export const SCREEN_PTNT_007 = "PTNT-007"; // Insurance
export const SCREEN_PTNT_008 = "PTNT-008"; // Notifications
export const SCREEN_PTNT_009 = "PTNT-009"; // Settings

// ============================================================================
// PROFESSIONAL ROLE SCREENS (9 screens)
// ============================================================================

export const SCREEN_PROF_001 = "PROF-001"; // Professional Dashboard
export const SCREEN_PROF_002 = "PROF-002"; // Patients
export const SCREEN_PROF_003 = "PROF-003"; // Schedule
export const SCREEN_PROF_004 = "PROF-004"; // Clinical Tools
export const SCREEN_PROF_005 = "PROF-005"; // Referrals
export const SCREEN_PROF_006 = "PROF-006"; // Billing
export const SCREEN_PROF_007 = "PROF-007"; // Professional Profile
export const SCREEN_PROF_008 = "PROF-008"; // Education
export const SCREEN_PROF_009 = "PROF-009"; // Settings

// ============================================================================
// STAFF ROLE SCREENS (9 screens)
// ============================================================================

export const SCREEN_STFF_001 = "STFF-001"; // Staff Dashboard
export const SCREEN_STFF_002 = "STFF-002"; // Queue
export const SCREEN_STFF_003 = "STFF-003"; // Daily Tasks
export const SCREEN_STFF_004 = "STFF-004"; // Schedule
export const SCREEN_STFF_005 = "STFF-005"; // Reports
export const SCREEN_STFF_006 = "STFF-006"; // Communications
export const SCREEN_STFF_007 = "STFF-007"; // Staff Tools
export const SCREEN_STFF_008 = "STFF-008"; // Time Tracking
export const SCREEN_STFF_009 = "STFF-009"; // Settings

// ============================================================================
// ADMIN ROLE SCREENS (47 screens)
// ============================================================================

// --- Admin Dashboard ---
export const SCREEN_ADMN_001 = "ADMN-001"; // Admin Dashboard
export const SCREEN_ADMN_002 = "ADMN-002"; // Overview

// --- User Management ---
export const SCREEN_ADMN_010 = "ADMN-010"; // User Management
export const SCREEN_ADMN_011 = "ADMN-011"; // Roles & Permissions
export const SCREEN_ADMN_012 = "ADMN-012"; // User Activity

// --- Tenant Management ---
export const SCREEN_ADMN_020 = "ADMN-020"; // Tenant Management
export const SCREEN_ADMN_021 = "ADMN-021"; // Tenant Config
export const SCREEN_ADMN_022 = "ADMN-022"; // Membership Management

// --- System Administration ---
export const SCREEN_ADMN_030 = "ADMN-030"; // System Config
export const SCREEN_ADMN_031 = "ADMN-031"; // Database Admin
export const SCREEN_ADMN_032 = "ADMN-032"; // API Management

// --- Staff Operations ---
export const SCREEN_ADMN_040 = "ADMN-040"; // Queue & Check-In
export const SCREEN_ADMN_041 = "ADMN-041"; // Patient Records

// --- Monitoring ---
export const SCREEN_ADMN_050 = "ADMN-050"; // System Monitoring
export const SCREEN_ADMN_051 = "ADMN-051"; // Notification Dashboard
export const SCREEN_ADMN_052 = "ADMN-052"; // Audit Logs
export const SCREEN_ADMN_053 = "ADMN-053"; // Staff Directory

// --- Community Supervision ---
export const SCREEN_ADMN_060 = "ADMN-060"; // Stream Supervision
export const SCREEN_ADMN_061 = "ADMN-061"; // Content Moderation
export const SCREEN_ADMN_062 = "ADMN-062"; // User Reports
export const SCREEN_ADMN_063 = "ADMN-063"; // Community Analytics

// --- Media Management ---
export const SCREEN_ADMN_070 = "ADMN-070"; // Media Library
export const SCREEN_ADMN_071 = "ADMN-071"; // Media Moderation
export const SCREEN_ADMN_072 = "ADMN-072"; // Content Rights

// --- AI Assistant ---
export const SCREEN_ADMN_080 = "ADMN-080"; // AI Assistant Control
export const SCREEN_ADMN_081 = "ADMN-081"; // AI Situations
export const SCREEN_ADMN_082 = "ADMN-082"; // AI Recommendations
export const SCREEN_ADMN_083 = "ADMN-083"; // AI Analytics
export const SCREEN_ADMN_084 = "ADMN-084"; // AI Training

// --- Automation ---
export const SCREEN_ADMN_090 = "ADMN-090"; // Automation Rules
export const SCREEN_ADMN_091 = "ADMN-091"; // Automation Executions

// --- Live & Stream ---
export const SCREEN_ADMN_100 = "ADMN-100"; // Live Stream Control
export const SCREEN_ADMN_101 = "ADMN-101"; // Stream Analytics
export const SCREEN_ADMN_102 = "ADMN-102"; // Stream Quality Monitoring
export const SCREEN_ADMN_103 = "ADMN-103"; // Recording Manager
export const SCREEN_ADMN_104 = "ADMN-104"; // Broadcast Settings

// --- Analytics ---
export const SCREEN_ADMN_110 = "ADMN-110"; // Platform Analytics
export const SCREEN_ADMN_111 = "ADMN-111"; // User Engagement
export const SCREEN_ADMN_112 = "ADMN-112"; // Revenue Analytics

// --- Integrations ---
export const SCREEN_ADMN_120 = "ADMN-120"; // Integration Hub
export const SCREEN_ADMN_121 = "ADMN-121"; // API Testing
export const SCREEN_ADMN_122 = "ADMN-122"; // Webhook Config

// ============================================================================
// DEV HUB SCREENS (63 screens)
// ============================================================================

// --- Dev Hub Main ---
export const SCREEN_DEV_001 = "DEV-001"; // Dev Hub Dashboard
export const SCREEN_DEV_002 = "DEV-002"; // Dev Login

// --- Dev Dashboard ---
export const SCREEN_DEV_003 = "DEV-003"; // Dev Dashboard (Overview)
export const SCREEN_DEV_004 = "DEV-004"; // Dev Analytics
export const SCREEN_DEV_005 = "DEV-005"; // Dev Health
export const SCREEN_DEV_006 = "DEV-006"; // Dev Logs

// --- Command Center ---
export const SCREEN_DEV_010 = "DEV-010"; // Command Center
export const SCREEN_DEV_011 = "DEV-011"; // Terminal
export const SCREEN_DEV_012 = "DEV-012"; // Scripts
export const SCREEN_DEV_013 = "DEV-013"; // Cron Jobs
export const SCREEN_DEV_014 = "DEV-014"; // Webhooks
export const SCREEN_DEV_015 = "DEV-015"; // Tasks

// --- Agents ---
export const SCREEN_DEV_020 = "DEV-020"; // Agents
export const SCREEN_DEV_021 = "DEV-021"; // Agent Monitor
export const SCREEN_DEV_022 = "DEV-022"; // Agent Logs
export const SCREEN_DEV_023 = "DEV-023"; // Agent Config
export const SCREEN_DEV_024 = "DEV-024"; // Agent Crew

// --- Pipelines ---
export const SCREEN_DEV_030 = "DEV-030"; // Pipelines
export const SCREEN_DEV_031 = "DEV-031"; // Pipeline Builder
export const SCREEN_DEV_032 = "DEV-032"; // Pipeline Runs
export const SCREEN_DEV_033 = "DEV-033"; // Pipeline Monitor

// --- OASIS ---
export const SCREEN_DEV_040 = "DEV-040"; // OASIS
export const SCREEN_DEV_041 = "DEV-041"; // OASIS Events
export const SCREEN_DEV_042 = "DEV-042"; // OASIS Projections
export const SCREEN_DEV_043 = "DEV-043"; // OASIS Config

// --- VTID ---
export const SCREEN_DEV_050 = "DEV-050"; // VTID
export const SCREEN_DEV_051 = "DEV-051"; // VTID Explorer
export const SCREEN_DEV_052 = "DEV-052"; // VTID Graph
export const SCREEN_DEV_053 = "DEV-053"; // VTID Analytics

// --- Gateway ---
export const SCREEN_DEV_060 = "DEV-060"; // Gateway
export const SCREEN_DEV_061 = "DEV-061"; // Gateway Routes
export const SCREEN_DEV_062 = "DEV-062"; // Gateway Monitor
export const SCREEN_DEV_063 = "DEV-063"; // Gateway Analytics

// --- CI/CD ---
export const SCREEN_DEV_070 = "DEV-070"; // CI/CD
export const SCREEN_DEV_071 = "DEV-071"; // CI/CD Pipelines
export const SCREEN_DEV_072 = "DEV-072"; // CI/CD Deployments
export const SCREEN_DEV_073 = "DEV-073"; // CI/CD Config

// --- Observability ---
export const SCREEN_DEV_080 = "DEV-080"; // Observability
export const SCREEN_DEV_081 = "DEV-081"; // Metrics
export const SCREEN_DEV_082 = "DEV-082"; // Traces
export const SCREEN_DEV_083 = "DEV-083"; // Alerts

// --- Dev Settings ---
export const SCREEN_DEV_090 = "DEV-090"; // Dev Settings
export const SCREEN_DEV_091 = "DEV-091"; // Feature Flags
export const SCREEN_DEV_092 = "DEV-092"; // Environment Variables
export const SCREEN_DEV_093 = "DEV-093"; // Secrets

// --- Dev Documentation ---
export const SCREEN_DEV_100 = "DEV-100"; // Documentation
export const SCREEN_DEV_101 = "DEV-101"; // API Docs
export const SCREEN_DEV_102 = "DEV-102"; // Schema Docs
export const SCREEN_DEV_103 = "DEV-103"; // Architecture Docs
export const SCREEN_DEV_104 = "DEV-104"; // Changelog

// ============================================================================
// GLOBAL OVERLAYS & COMPONENTS (8 screens)
// ============================================================================

export const SCREEN_OVRL_001 = "OVRL-001"; // VITANA Orb Overlay
export const SCREEN_OVRL_002 = "OVRL-002"; // Profile Preview Dialog
export const SCREEN_OVRL_003 = "OVRL-003"; // Meetup Details Drawer
export const SCREEN_OVRL_004 = "OVRL-004"; // Event Details Drawer
export const SCREEN_OVRL_005 = "OVRL-005"; // Master Action Popup
export const SCREEN_OVRL_006 = "OVRL-006"; // Calendar Popup
export const SCREEN_OVRL_007 = "OVRL-007"; // Wallet Popup
export const SCREEN_OVRL_008 = "OVRL-008"; // Presence Debug Panel

// ============================================================================
// LEGACY SCREEN IDS (Maintained for backward compatibility)
// ============================================================================

export const SCREEN_IDS = {
  // Main Sidebar Navigation (D1) - Legacy format
  HOME_DASHBOARD: "D1-001",
  COMMUNITY_OVERVIEW: "D1-002", 
  DISCOVER_OVERVIEW: "D1-003",
  INBOX_OVERVIEW: "D1-004",
  HEALTH_OVERVIEW: "D1-005",
  WALLET_OVERVIEW: "D1-006",
  SHARING_OVERVIEW: "D1-007",
  MEMORY_OVERVIEW: "D1-008",
  SETTINGS_OVERVIEW: "D1-009",
  ADMIN_OVERVIEW: "D1-010",
  SUPPORT_OVERVIEW: "D1-011",

  // Home Sub-pages (D1-001-xx)
  HOME_CONTEXT: "D1-001-01",
  HOME_ACTIONS: "D1-001-02", 
  HOME_MATCHES: "D1-001-03",
  HOME_AI_FEED: "D1-001-04",

  // Community Sub-pages (D1-002-xx)
  COMMUNITY_MY_GROUPS: "D1-002-01",
  COMMUNITY_FEED: "D1-002-02",
  COMMUNITY_EVENTS: "D1-002-03",
  COMMUNITY_LIVE_ROOMS: "D1-002-04",
  COMMUNITY_MEDIA_HUB: "D1-002-05",
  COMMUNITY_BUSINESS: "D1-002-06",
  COMMUNITY_MEETUPS: "D1-002-07",

  // Discover Sub-pages (D1-003-xx)
  DISCOVER_WELLNESS_SERVICES: "D1-003-01",
  DISCOVER_DOCTORS_COACHES: "D1-003-02",
  DISCOVER_DEALS_OFFERS: "D1-003-03",
  DISCOVER_ORDERS: "D1-003-04",

  // Inbox Sub-pages (D1-004-xx)
  INBOX_REMINDER: "D1-004-01",
  INBOX_INSPIRATION: "D1-004-02",

  // Health Sub-pages (D1-005-xx)
  HEALTH_SERVICES_HUB: "D1-005-01",
  HEALTH_BIOMARKERS: "D1-005-02",
  HEALTH_TRACKER: "D1-005-03",
  HEALTH_EDUCATION: "D1-005-04",
  HEALTH_PLANS: "D1-005-05",

  // Settings Sub-pages (D1-009-xx)
  SETTINGS_PREFERENCES: "D1-009-01",
  SETTINGS_PRIVACY: "D1-009-02",
  SETTINGS_CONNECTED_APPS: "D1-009-03",
  SETTINGS_BILLING_REWARDS: "D1-009-04",

  // Wallet Sub-pages (D1-006-xx)
  WALLET_BALANCE: "D1-006-01",
  WALLET_SUBSCRIPTIONS: "D1-006-02", 
  WALLET_REWARDS: "D1-006-03",

  // Sharing Sub-pages (D1-007-xx)
  SHARING_CONSENT: "D1-007-01",
  SHARING_PACKAGES: "D1-007-02",
  SHARING_SMART_PACKAGE: "D1-007-03",
  SHARING_MARKETPLACE: "D1-007-04",
  SHARING_LOGS: "D1-007-05",
  SHARING_CAMPAIGNS: "D1-007-06",
  SHARING_CAMPAIGN_DETAIL: "D1-007-07",

  // Memory Sub-pages (D1-008-xx)
  MEMORY_TIMELINE: "D1-008-01",
  MEMORY_DIARY: "D1-008-02",
  MEMORY_RECALL: "D1-008-03", 
  MEMORY_PERMISSIONS: "D1-008-04",

  // Admin Sub-pages (D1-010-xx)
  ADMIN_QUEUE_CHECKIN: "D1-010-01",
  ADMIN_PATIENT_RECORDS: "D1-010-02",
  ADMIN_STREAM_SUPERVISION: "D1-010-03",
  ADMIN_STAFF_DIRECTORY: "D1-010-04",
  ADMIN_REPORTS_KPIS: "D1-010-05",
  ADMIN_AUDIT_LOGS: "D1-010-06"
} as const;

export type ScreenId = typeof SCREEN_IDS[keyof typeof SCREEN_IDS];

// ============================================================================
// SCREEN MAPPINGS
// ============================================================================

export interface ScreenIdMapping {
  screenId: ScreenId | string;
  route: string;
  category: string;
  pattern: string;
}

export const SCREEN_MAPPINGS: ScreenIdMapping[] = [
  // Main Navigation
  { screenId: SCREEN_IDS.HOME_DASHBOARD, route: "/home", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_IDS.COMMUNITY_OVERVIEW, route: "/community", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_IDS.DISCOVER_OVERVIEW, route: "/discover", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_IDS.INBOX_OVERVIEW, route: "/inbox", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_IDS.HEALTH_OVERVIEW, route: "/health", category: "main", pattern: "3-card-header" },
  
  // Community Sub-pages
  { screenId: SCREEN_IDS.COMMUNITY_FEED, route: "/community/feed", category: "community", pattern: "sub-page-header" },
  { screenId: SCREEN_IDS.COMMUNITY_EVENTS, route: "/community/events", category: "community", pattern: "sub-page-header" },
  { screenId: SCREEN_IDS.COMMUNITY_LIVE_ROOMS, route: "/community/live-rooms", category: "community", pattern: "sub-page-header" },
  { screenId: SCREEN_IDS.COMMUNITY_MEDIA_HUB, route: "/community/media-hub", category: "community", pattern: "sub-page-header" },
  { screenId: SCREEN_IDS.COMMUNITY_BUSINESS, route: "/community/my-business", category: "community", pattern: "split-screen" },
  { screenId: SCREEN_IDS.COMMUNITY_MEETUPS, route: "/community/meetups", category: "community", pattern: "sub-page-header" },

  // Discover Sub-pages
  { screenId: SCREEN_IDS.DISCOVER_WELLNESS_SERVICES, route: "/discover/wellness-services", category: "discover", pattern: "sub-page-header" },
  { screenId: SCREEN_IDS.DISCOVER_DOCTORS_COACHES, route: "/discover/doctors-coaches", category: "discover", pattern: "sub-page-header" },
  { screenId: SCREEN_IDS.DISCOVER_DEALS_OFFERS, route: "/discover/deals-offers", category: "discover", pattern: "split-screen" },
  { screenId: SCREEN_IDS.DISCOVER_ORDERS, route: "/discover/orders", category: "discover", pattern: "sub-page-header" },

  // Health Sub-pages 
  { screenId: SCREEN_IDS.HEALTH_SERVICES_HUB, route: "/health/services-hub", category: "health", pattern: "split-screen" },
  { screenId: SCREEN_IDS.HEALTH_BIOMARKERS, route: "/health/biomarkers", category: "health", pattern: "sub-page-header" },
  { screenId: SCREEN_IDS.HEALTH_TRACKER, route: "/health/tracker", category: "health", pattern: "split-screen" },
  { screenId: SCREEN_IDS.HEALTH_EDUCATION, route: "/health/education", category: "health", pattern: "sub-page-header" },
  { screenId: SCREEN_IDS.HEALTH_PLANS, route: "/health/plans", category: "health", pattern: "sub-page-header" },

  // New Screen ID Mappings (using new format)
  { screenId: SCREEN_HOME_001, route: "/home", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_HOME_002, route: "/home/context", category: "home", pattern: "sub-page-header" },
  { screenId: SCREEN_HOME_003, route: "/home/actions", category: "home", pattern: "sub-page-header" },
  { screenId: SCREEN_HOME_004, route: "/home/matches", category: "home", pattern: "sub-page-header" },
  { screenId: SCREEN_HOME_005, route: "/home/aifeed", category: "home", pattern: "sub-page-header" },

  { screenId: SCREEN_COMM_001, route: "/community", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_COMM_002, route: "/community/events", category: "community", pattern: "card-grid" },
  { screenId: SCREEN_COMM_003, route: "/community/live-rooms", category: "community", pattern: "card-grid" },
  { screenId: SCREEN_COMM_004, route: "/community/media-hub", category: "community", pattern: "sub-page-header" },
  { screenId: SCREEN_COMM_005, route: "/community/my-business", category: "community", pattern: "split-screen" },
  { screenId: SCREEN_COMM_006, route: "/community/groups/:groupId", category: "community", pattern: "sub-page-header" },
  { screenId: SCREEN_COMM_007, route: "/community/feed", category: "community", pattern: "sub-page-header" },
  { screenId: SCREEN_COMM_008, route: "/community/challenges", category: "community", pattern: "sub-page-header" },
  { screenId: SCREEN_COMM_009, route: "/community/groups", category: "community", pattern: "split-screen" },

  { screenId: SCREEN_DISC_001, route: "/discover", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_DISC_002, route: "/discover/supplements", category: "discover", pattern: "card-grid" },
  { screenId: SCREEN_DISC_003, route: "/discover/wellness-services", category: "discover", pattern: "sub-page-header" },
  { screenId: SCREEN_DISC_004, route: "/discover/doctors-coaches", category: "discover", pattern: "sub-page-header" },
  { screenId: SCREEN_DISC_005, route: "/discover/deals-offers", category: "discover", pattern: "split-screen" },
  { screenId: SCREEN_DISC_006, route: "/discover/orders", category: "discover", pattern: "sub-page-header" },
  { screenId: SCREEN_DISC_007, route: "/discover/product/:productId", category: "discover", pattern: "product-detail" },
  { screenId: SCREEN_DISC_008, route: "/discover/provider/:providerId", category: "discover", pattern: "profile-page" },
  { screenId: SCREEN_DISC_009, route: "/discover/cart", category: "discover", pattern: "cart-page" },

  { screenId: SCREEN_HLTH_001, route: "/health", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_HLTH_002, route: "/health/services-hub", category: "health", pattern: "split-screen" },
  { screenId: SCREEN_HLTH_003, route: "/health/biomarkers", category: "health", pattern: "sub-page-header" },
  { screenId: SCREEN_HLTH_004, route: "/health/plans", category: "health", pattern: "sub-page-header" },
  { screenId: SCREEN_HLTH_005, route: "/health/education", category: "health", pattern: "sub-page-header" },
  { screenId: SCREEN_HLTH_006, route: "/health/pillars", category: "health", pattern: "sub-page-header" },
  { screenId: SCREEN_HLTH_007, route: "/health/conditions", category: "health", pattern: "sub-page-header" },

  { screenId: SCREEN_INBX_001, route: "/inbox", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_INBX_002, route: "/inbox/reminder", category: "inbox", pattern: "sub-page-header" },
  { screenId: SCREEN_INBX_003, route: "/inbox/inspiration", category: "inbox", pattern: "sub-page-header" },
  { screenId: SCREEN_INBX_004, route: "/inbox/archived", category: "inbox", pattern: "sub-page-header" },

  { screenId: SCREEN_AI_001, route: "/ai", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_AI_002, route: "/ai/insights", category: "ai", pattern: "sub-page-header" },
  { screenId: SCREEN_AI_003, route: "/ai/recommendations", category: "ai", pattern: "sub-page-header" },
  { screenId: SCREEN_AI_004, route: "/ai/daily-summary", category: "ai", pattern: "sub-page-header" },
  { screenId: SCREEN_AI_005, route: "/ai/companion", category: "ai", pattern: "sub-page-header" },

  { screenId: SCREEN_WLLT_001, route: "/wallet", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_WLLT_002, route: "/wallet/balance", category: "wallet", pattern: "sub-page-header" },
  { screenId: SCREEN_WLLT_003, route: "/wallet/subscriptions", category: "wallet", pattern: "sub-page-header" },
  { screenId: SCREEN_WLLT_004, route: "/wallet/rewards", category: "wallet", pattern: "sub-page-header" },

  { screenId: SCREEN_SHAR_001, route: "/sharing", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_SHAR_002, route: "/sharing/campaigns", category: "sharing", pattern: "sub-page-header" },
  { screenId: SCREEN_SHAR_003, route: "/sharing/campaigns/:campaignId", category: "sharing", pattern: "sub-page-header" },
  { screenId: SCREEN_SHAR_004, route: "/sharing/distribution", category: "sharing", pattern: "sub-page-header" },
  { screenId: SCREEN_SHAR_005, route: "/sharing/data-consent", category: "sharing", pattern: "sub-page-header" },

  { screenId: SCREEN_MEMO_001, route: "/memory", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_MEMO_002, route: "/memory/timeline", category: "memory", pattern: "sub-page-header" },
  { screenId: SCREEN_MEMO_003, route: "/memory/diary", category: "memory", pattern: "sub-page-header" },
  { screenId: SCREEN_MEMO_004, route: "/memory/recall", category: "memory", pattern: "sub-page-header" },
  { screenId: SCREEN_MEMO_005, route: "/memory/permissions", category: "memory", pattern: "sub-page-header" },

  { screenId: SCREEN_SETT_001, route: "/settings", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_SETT_002, route: "/settings/preferences", category: "settings", pattern: "sub-page-header" },
  { screenId: SCREEN_SETT_003, route: "/settings/privacy", category: "settings", pattern: "sub-page-header" },
  { screenId: SCREEN_SETT_004, route: "/settings/notifications", category: "settings", pattern: "sub-page-header" },
  { screenId: SCREEN_SETT_005, route: "/connectors", category: "settings", pattern: "sub-page-header" },
  { screenId: SCREEN_SETT_006, route: "/settings/billing", category: "settings", pattern: "sub-page-header" },
  { screenId: SCREEN_SETT_007, route: "/support", category: "settings", pattern: "sub-page-header" },
  { screenId: SCREEN_SETT_008, route: "/settings/tenant", category: "settings", pattern: "sub-page-header" },

  { screenId: SCREEN_AUTH_001, route: "/", category: "public", pattern: "landing" },
  { screenId: SCREEN_AUTH_002, route: "/auth", category: "public", pattern: "auth" },
  { screenId: SCREEN_AUTH_003, route: "/maxina", category: "public", pattern: "auth" },
  { screenId: SCREEN_AUTH_004, route: "/alkalma", category: "public", pattern: "auth" },
  { screenId: SCREEN_AUTH_005, route: "/earthlinks", category: "public", pattern: "auth" },
  { screenId: SCREEN_AUTH_006, route: "/community", category: "public", pattern: "auth" },
  { screenId: SCREEN_AUTH_007, route: "/exafy-admin", category: "public", pattern: "auth" },
  { screenId: SCREEN_AUTH_008, route: "/_intro/:tenantSlug", category: "public", pattern: "intro" },

  { screenId: SCREEN_PTNT_001, route: "/patient", category: "patient", pattern: "3-card-header" },
  { screenId: SCREEN_PROF_001, route: "/professional", category: "professional", pattern: "3-card-header" },
  { screenId: SCREEN_STFF_001, route: "/staff", category: "staff", pattern: "3-card-header" },
  
  { screenId: SCREEN_ADMN_001, route: "/admin", category: "admin", pattern: "3-card-header" },
  { screenId: SCREEN_ADMN_020, route: "/admin/tenant-management", category: "admin", pattern: "sub-page-header" },
  { screenId: SCREEN_ADMN_051, route: "/admin/notification-dashboard", category: "admin", pattern: "dashboard" },

  { screenId: SCREEN_DEV_001, route: "/dev", category: "dev", pattern: "3-card-header" },
  { screenId: SCREEN_DEV_002, route: "/dev/login", category: "dev", pattern: "auth" },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getScreenId(route: string): ScreenId | string | null {
  const mapping = SCREEN_MAPPINGS.find(m => m.route === route);
  return mapping ? mapping.screenId : null;
}

export function getScreenPattern(screenId: ScreenId | string): string | null {
  const mapping = SCREEN_MAPPINGS.find(m => m.screenId === screenId);
  return mapping ? mapping.pattern : null;
}

export function validateScreenId(screenId: string): boolean {
  return Object.values(SCREEN_IDS).includes(screenId as ScreenId);
}

/**
 * HOC to add Screen ID to any page component
 */
export function withScreenId<T extends object>(
  Component: React.ComponentType<T>,
  screenId: ScreenId | string
): React.ComponentType<T> {
  const ScreenIdWrapper = (props: T) => {
    return React.createElement(
      'div',
      { 'data-screen-id': screenId, className: 'h-full' },
      React.createElement(Component, props)
    );
  };
  
  ScreenIdWrapper.displayName = `withScreenId(${Component.displayName || Component.name})`;
  return ScreenIdWrapper;
}
