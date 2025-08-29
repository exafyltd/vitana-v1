import React from "react";

/**
 * Screen ID management system for UI pattern enforcement
 */

export const SCREEN_IDS = {
  // Main Sidebar Navigation (D1)
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

  // Memory Sub-pages (D1-008-xx)
  MEMORY_TIMELINE: "D1-008-01",
  MEMORY_RECALL: "D1-008-02", 
  MEMORY_PERMISSIONS: "D1-008-03",

  // Admin Sub-pages (D1-010-xx)
  ADMIN_QUEUE_CHECKIN: "D1-010-01",
  ADMIN_PATIENT_RECORDS: "D1-010-02",
  ADMIN_STREAM_SUPERVISION: "D1-010-03",
  ADMIN_STAFF_DIRECTORY: "D1-010-04",
  ADMIN_REPORTS_KPIS: "D1-010-05",
  ADMIN_AUDIT_LOGS: "D1-010-06"
} as const;

export type ScreenId = typeof SCREEN_IDS[keyof typeof SCREEN_IDS];

export interface ScreenIdMapping {
  screenId: ScreenId;
  route: string;
  category: string;
  pattern: string;
}

export const SCREEN_MAPPINGS: ScreenIdMapping[] = [
  // Main Navigation
  { screenId: SCREEN_IDS.HOME_DASHBOARD, route: "/dashboard", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_IDS.COMMUNITY_OVERVIEW, route: "/community", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_IDS.DISCOVER_OVERVIEW, route: "/discover", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_IDS.INBOX_OVERVIEW, route: "/inbox", category: "main", pattern: "3-card-header" },
  { screenId: SCREEN_IDS.HEALTH_OVERVIEW, route: "/health", category: "main", pattern: "3-card-header" },
  
  // Community Sub-pages
  { screenId: SCREEN_IDS.COMMUNITY_MY_GROUPS, route: "/community/my-groups", category: "community", pattern: "sub-page-header" },
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
];

export function getScreenId(route: string): ScreenId | null {
  const mapping = SCREEN_MAPPINGS.find(m => m.route === route);
  return mapping ? mapping.screenId : null;
}

export function getScreenPattern(screenId: ScreenId): string | null {
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
  screenId: ScreenId
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