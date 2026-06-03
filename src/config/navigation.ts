// Centralized navigation configuration to ensure consistency across all sections

// VTID-01900: Home is now a standalone News Feed page — no sub-navigation
export const homeNavigation: { id: string; name: string; path: string }[] = [];

export const aiNavigation = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

// Calendar navigation - REMOVED (using universal popup system)
export const calendarNavigation = [];

export const communityNavigation = [
  { id: "overview", name: "Overview", path: "/comm" },
  { id: "events-meetups", name: "Events & MeetUps", path: "/comm/events-meetups" },
  { id: "find-partner", name: "Find a Match", path: "/comm/find-partner" },
  { id: "live-rooms", name: "Live Rooms", path: "/comm/live-rooms" },
  { id: "media-hub", name: "Media Hub", path: "/comm/media-hub" },
  { id: "talk-to-vitana", name: "Talk to Vitana", path: "/comm/talk-to-vitana" },
];

// Business Hub - standalone section (separate from Community)
export const businessHubNavigation = [
  { id: "overview", name: "Overview", path: "/business" },
  { id: "services", name: "Services", path: "/business/services" },
  { id: "sell-earn", name: "Sell & Earn", path: "/business/sell-earn" },
  { id: "clients", name: "Clients", path: "/business/clients" },
  { id: "analytics", name: "Analytics", path: "/business/analytics" },
];

export const discoverNavigation = [
  { id: "overview", name: "Overview", path: "/discover" },
  { id: "supplements", name: "Supplements", path: "/discover/supplements" },
  { id: "wellness-services", name: "Wellness Services", path: "/discover/wellness-services" },
  { id: "doctors-coaches", name: "Doctors/Coaches", path: "/discover/doctors-coaches" },
  { id: "deals-offers", name: "Deals & Offers", path: "/discover/deals-offers" },
  { id: "orders", name: "Orders", path: "/discover/orders" },
];

export const messagesNavigation = [
  { id: "overview", name: "Overview", path: "/inbox" },
  { id: "inspiration", name: "Inspiration", path: "/inbox/inspiration" },
  { id: "archived", name: "Archived", path: "/inbox/archived" },
];

export const healthNavigation = [
  { id: "overview", name: "Overview", path: "/health" },
  { id: "services-hub", name: "Services Hub", path: "/health/services-hub" },
  { id: "my-biology", name: "My Biology", path: "/health/my-biology" },
  { id: "plans", name: "My Plans", path: "/health/plans" },
  { id: "education-science", name: "Education & Science", path: "/health/education" },
];


export const walletNavigation = [
  { id: "overview", name: "Overview", path: "/wallet" },
  { id: "balance", name: "Balance & Benefits", path: "/wallet/balance" },
  { id: "subscriptions", name: "Subscriptions", path: "/wallet/subscriptions" },
  { id: "rewards", name: "Rewards & Commissions", path: "/wallet/rewards" },
];

export const sharingNavigation = [
  { id: "overview", name: "Overview", path: "/sharing" },
  { id: "campaigns", name: "Campaigns", path: "/sharing/campaigns" },
  { id: "distribution", name: "Distribution", path: "/sharing/distribution" },
  { id: "data-consent", name: "Data & Consent", path: "/sharing/data-consent" },
];

export const memoryNavigation = [
  { id: "overview", name: "Overview", i18nKey: "screens.memory.memorySubnav_overview", path: "/memory" },
  { id: "timeline", name: "Timeline", i18nKey: "screens.memory.memorySubnav_timeline", path: "/memory/timeline" },
  { id: "diary", name: "Daily Diary", i18nKey: "screens.memory.memorySubnav_diary", path: "/memory/diary" },
  { id: "recall", name: "Recall & Search", i18nKey: "screens.memory.memorySubnav_recall", path: "/memory/recall" },
  { id: "permissions", name: "Permissions", i18nKey: "screens.memory.memorySubnav_permissions", path: "/memory/permissions" },
];

// ── ADMIN NAVIGATION (Restructured - 9 Sections) ────────────

// Admin Dashboard
export const adminDashboardNavigation = [
  { id: "overview", name: "Overview", path: "/admin/dashboard" },
  { id: "system-health", name: "System Health", path: "/admin/dashboard/health" },
  { id: "activity", name: "Activity Feed", path: "/admin/dashboard/activity" },
];

// Users & Growth (PRIORITY 1)
export const adminUsersNavigation = [
  { id: "all-users", name: "All Users", path: "/admin/users" },
  { id: "funnel", name: "Signup Funnel", path: "/admin/users/funnel" },
  { id: "invitations", name: "Invitations", path: "/admin/users/invitations" },
  { id: "roles", name: "Roles & Access", path: "/admin/users/roles" },
];

// Notifications (PRIORITY 2)
export const adminNotificationsNavigation = [
  { id: "compose", name: "Compose", path: "/admin/notifications" },
  { id: "categories", name: "Categories", path: "/admin/notifications/categories" },
  { id: "sent", name: "Sent Log", path: "/admin/notifications/sent" },
  { id: "preferences", name: "Preferences", path: "/admin/notifications/preferences" },
];

// Community
export const adminCommunityNavigation = [
  { id: "groups", name: "Groups", path: "/admin/community" },
  { id: "meetups", name: "Meetups", path: "/admin/community/meetups" },
  { id: "invitations", name: "Invitations", path: "/admin/community/invitations" },
  { id: "moderation", name: "Moderation", path: "/admin/community/moderation" },
];

// Live Rooms
export const adminLiveNavigation = [
  { id: "active", name: "Active Now", path: "/admin/live" },
  { id: "rooms", name: "All Rooms", path: "/admin/live/rooms" },
  { id: "sessions", name: "Sessions", path: "/admin/live/sessions" },
  { id: "attendance", name: "Attendance", path: "/admin/live/attendance" },
];

// Content
export const adminContentNavigation = [
  { id: "overview", name: "Overview", path: "/admin/content" },
  { id: "videos", name: "Videos", path: "/admin/content/videos" },
  { id: "podcasts", name: "Podcasts", path: "/admin/content/podcasts" },
  { id: "music", name: "Music", path: "/admin/content/music" },
];

// Intelligence
export const adminIntelligenceNavigation = [
  { id: "memory", name: "Memory", path: "/admin/intelligence" },
  { id: "embeddings", name: "Embeddings", path: "/admin/intelligence/embeddings" },
  { id: "signals", name: "Signals", path: "/admin/intelligence/signals" },
  { id: "relationships", name: "Relationships", path: "/admin/intelligence/relationships" },
];

// System
export const adminSystemNavigation = [
  { id: "configuration", name: "Configuration", path: "/admin/system" },
  { id: "tenants", name: "Tenants", path: "/admin/system/tenants" },
  { id: "creators", name: "Creators", path: "/admin/system/creators" },
  { id: "bootstrap", name: "Bootstrap", path: "/admin/system/bootstrap" },
];

// Audit & Logs
export const adminAuditNavigation = [
  { id: "events", name: "Events", path: "/admin/audit" },
  { id: "users", name: "User Activity", path: "/admin/audit/users" },
  { id: "apis", name: "API Monitor", path: "/admin/audit/apis" },
  { id: "security", name: "Security", path: "/admin/audit/security" },
];

// VTID-02000: Marketplace admin — Catalog section (5 screens max per sidebar section)
export const adminMarketplaceCatalogNavigation = [
  { id: "overview", name: "Overview", path: "/admin/marketplace" },
  { id: "merchants", name: "Merchants", path: "/admin/marketplace/merchants" },
  { id: "products", name: "Products", path: "/admin/marketplace/products" },
  { id: "taxonomy", name: "Taxonomy & Health Knowledge", path: "/admin/marketplace/taxonomy" },
  { id: "feed-curation", name: "Feed Curation", path: "/admin/marketplace/feed-curation" },
];

// VTID-02000: Marketplace admin — Operations section
export const adminMarketplaceOperationsNavigation = [
  { id: "ingestion", name: "Ingestion & Coverage", path: "/admin/marketplace/ingestion" },
  { id: "networks", name: "Affiliate Networks", path: "/admin/marketplace/networks" },
  { id: "geo", name: "Geo Policies", path: "/admin/marketplace/geo" },
  { id: "attribution", name: "Attribution", path: "/admin/marketplace/attribution" },
  { id: "moderation", name: "Moderation", path: "/admin/marketplace/moderation" },
];

// VTID-NAV-02: Vitana Navigator admin (catalog + coverage + telemetry + history)
export const adminNavigatorNavigation = [
  { id: "catalog", name: "Catalog", path: "/admin/navigator" },
  { id: "coverage", name: "Coverage", path: "/admin/navigator/coverage" },
  { id: "telemetry", name: "Telemetry", path: "/admin/navigator/telemetry" },
  { id: "history", name: "History", path: "/admin/navigator/history" },
];

export const settingsNavigation = [
  { id: "notifications", name: "Notifications", i18nKey: "screens.settings.settingsSubnav_notifications", path: "/settings/notifications" },
  { id: "preferences", name: "Preferences", i18nKey: "screens.settings.settingsSubnav_preferences", path: "/settings/preferences" },
  { id: "limitations", name: "Limitations", i18nKey: "screens.settings.settingsSubnav_limitations", path: "/settings/limitations" },
  { id: "privacy", name: "Privacy", i18nKey: "screens.settings.settingsSubnav_privacy", path: "/settings/privacy" },
  { id: "billing", name: "Billing", i18nKey: "screens.settings.settingsSubnav_billing", path: "/settings/billing" },
];

// ── Legacy aliases (backward compatibility for old pages) ────
// These old names are used by legacy admin pages that haven't been
// rebuilt yet. They point to the new navigation arrays so the old
// pages can still render without breaking the build.
export const adminUserManagementNavigation = adminUsersNavigation;
export const adminTenantManagementNavigation = adminSystemNavigation;
export const adminClinicalNavigation = adminSystemNavigation;
export const adminMonitoringNavigation = adminAuditNavigation;
export const adminMediaNavigation = adminContentNavigation;
export const adminAIAssistantNavigation = adminIntelligenceNavigation;
export const adminAutomationNavigation = adminIntelligenceNavigation;
export const adminLiveStreamNavigation = adminLiveNavigation;