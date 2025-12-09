// Centralized navigation configuration to ensure consistency across all sections

export const homeNavigation = [
  { id: "overview", name: "Overview", path: "/home" },
  { id: "context", name: "Context", path: "/home/context" },
  { id: "actions", name: "Actions", path: "/home/actions" },
  { id: "matches", name: "Matches", path: "/home/matches" },
  { id: "aifeed", name: "AI Feed", path: "/home/aifeed" },
];

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
  { id: "live-rooms", name: "Live Rooms", path: "/comm/live-rooms" },
  { id: "media-hub", name: "Media Hub", path: "/comm/media-hub" },
  { id: "my-business", name: "My Business", path: "/comm/my-business" },
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
  { id: "reminder", name: "Reminder", path: "/inbox/reminder" },
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
  { id: "overview", name: "Overview", path: "/memory" },
  { id: "timeline", name: "Timeline", path: "/memory/timeline" },
  { id: "diary", name: "Daily Diary", path: "/memory/diary" },
  { id: "recall", name: "Recall & Search", path: "/memory/recall" },
  { id: "permissions", name: "Permissions", path: "/memory/permissions" },
];

// Admin Dashboard - landing page with high-level metrics
export const adminDashboardNavigation = [
  { id: "overview", name: "Overview", path: "/admin" },
  { id: "system-health", name: "System Health", path: "/admin/system-health" },
];

// User Management - consolidated user/staff/audit
export const adminUserManagementNavigation = [
  { id: "overview", name: "Overview", path: "/admin/user-management" },
  { id: "staff", name: "Staff Management", path: "/admin/user-management/staff" },
  { id: "audit", name: "User Audit Logs", path: "/admin/user-management/audit" },
];

// Tenant Management - tenant config and audit
export const adminTenantManagementNavigation = [
  { id: "overview", name: "Overview", path: "/admin/tenant-management" },
  { id: "configuration", name: "Configuration", path: "/admin/tenant-management/config" },
  { id: "audit", name: "Tenant Audit Logs", path: "/admin/tenant-management/audit" },
];

// System Administration - critical system-level tools
export const adminSystemNavigation = [
  { id: "bootstrap", name: "Super Admin Bootstrap", path: "/admin/system/bootstrap" },
  { id: "config", name: "System Configuration", path: "/admin/system/config" },
  { id: "security", name: "Security Settings", path: "/admin/system/security" },
];

// Clinical Operations - healthcare-specific (Alkalma/Earthlinks)
export const adminClinicalNavigation = [
  { id: "patient-records", name: "Patient Records", path: "/admin/clinical/patient-records" },
  { id: "queue", name: "Queue & Check-In", path: "/admin/clinical/queue" },
];

// Monitoring & Compliance - oversight tools
export const adminMonitoringNavigation = [
  { id: "apis", name: "API & MCP Monitor", path: "/admin/monitoring/apis" },
  { id: "stream-supervision", name: "Stream Supervision", path: "/admin/monitoring/stream-supervision" },
  { id: "reports", name: "Reports & KPIs", path: "/admin/monitoring/reports" },
  { id: "notifications", name: "Notifications", path: "/admin/monitoring/notifications" },
];

// Community Supervision - content moderation
export const adminCommunityNavigation = [
  { id: "overview", name: "Overview", path: "/admin/community" },
  { id: "events", name: "Events", path: "/admin/community/events" },
  { id: "groups", name: "Groups", path: "/admin/community/groups" },
  { id: "reported", name: "Reported Content", path: "/admin/community/reported" },
];

// Media Management - content uploads and moderation
export const adminMediaNavigation = [
  { id: "overview", name: "Overview", path: "/admin/media" },
  { id: "videos", name: "Videos", path: "/admin/media/videos" },
  { id: "podcasts", name: "Podcasts", path: "/admin/media/podcasts" },
  { id: "music", name: "Music", path: "/admin/media/music" },
  { id: "analytics", name: "Analytics", path: "/admin/media/analytics" },
];

// AI Assistant - automation & intelligence system
export const adminAIAssistantNavigation = [
  { id: "overview", name: "Overview", path: "/admin/ai-assistant" },
  { id: "ai-analyzer", name: "AI Situation Analyzer", path: "/admin/ai-assistant/ai-analyzer" },
  { id: "pattern-discovery", name: "Pattern Discovery", path: "/admin/ai-assistant/pattern-discovery" },
  { id: "proactive-settings", name: "Proactive Settings", path: "/admin/ai-assistant/proactive-settings" },
  { id: "analytics", name: "Analytics & Performance", path: "/admin/ai-assistant/analytics" },
];

// Automation - workflow automation system
export const adminAutomationNavigation = [
  { id: "overview", name: "Overview", path: "/admin/automation" },
  { id: "builder", name: "Automation Builder", path: "/admin/automation/builder" },
];

// Live & Stream - streaming management
export const adminLiveStreamNavigation = [
  { id: "overview", name: "Overview", path: "/admin/live-stream" },
  { id: "vertex-testing", name: "Vertex AI Testing", path: "/admin/live-stream/vertex-testing" },
  { id: "community-rooms", name: "Community Rooms", path: "/admin/live-stream/community-rooms" },
  { id: "telemedicine", name: "Telemedicine Sessions", path: "/admin/live-stream/telemedicine" },
  { id: "settings", name: "Stream Settings", path: "/admin/live-stream/settings" },
];

export const settingsNavigation = [
  { id: "overview", name: "Overview", path: "/settings" },
  { id: "preferences", name: "Preferences", path: "/settings/preferences" },
  { id: "privacy", name: "Privacy", path: "/settings/privacy" },
  { id: "connected-apps", name: "Connected Apps & Integrations", path: "/settings/connected-apps" },
  { id: "billing", name: "Billing", path: "/settings/billing" },
  { id: "support", name: "Support", path: "/settings/support" },
];