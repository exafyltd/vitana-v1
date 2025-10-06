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
  { id: "my-groups", name: "My Groups", path: "/comm/my-groups" },
  { id: "feed", name: "Feed", path: "/comm/feed" },
  { id: "events", name: "Events", path: "/comm/events" },
  { id: "live-rooms", name: "Live Rooms", path: "/comm/live-rooms" },
  { id: "media-hub", name: "Media Hub", path: "/comm/media-hub" },
  { id: "my-business", name: "My Business", path: "/comm/my-business" },
  { id: "meetups", name: "Meetups", path: "/comm/meetups" },
];

export const discoverNavigation = [
  { id: "overview", name: "Overview", path: "/discover" },
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
  { id: "distribution", name: "Distribution", path: "/sharing/distribution" },
  { id: "data-consent", name: "Data & Consent", path: "/sharing/data-consent" },
  { id: "integrations", name: "Integrations", path: "/sharing/integrations" },
];

export const memoryNavigation = [
  { id: "overview", name: "Overview", path: "/memory" },
  { id: "timeline", name: "Timeline", path: "/memory/timeline" },
  { id: "diary", name: "Daily Diary", path: "/memory/diary" },
  { id: "recall", name: "Recall & Search", path: "/memory/recall" },
  { id: "permissions", name: "Permissions", path: "/memory/permissions" },
];

export const adminNavigation = [
  { id: "overview", name: "Overview", path: "/admin" },
  { id: "user-management", name: "User Management", path: "/admin/user-management" },
  { id: "tenant-management", name: "Tenant Management", path: "/admin/tenant-management" },
  { id: "bootstrap", name: "Admin Bootstrap", path: "/admin/bootstrap" },
  { id: "queue", name: "Queue & Check-In", path: "/admin/queue" },
  { id: "patient-records", name: "Patient Record Viewer", path: "/admin/patient-records" },
  { id: "stream-supervision", name: "Stream Supervision", path: "/admin/stream-supervision" },
  { id: "staff", name: "Staff Directory & Scheduling", path: "/admin/staff" },
  { id: "reports", name: "Reports & KPIs", path: "/admin/reports" },
  { id: "audit", name: "Audit Logs & Compliance", path: "/admin/audit" },
];

export const settingsNavigation = [
  { id: "overview", name: "Overview", path: "/settings" },
  { id: "preferences", name: "Preferences", path: "/settings/preferences" },
  { id: "privacy", name: "Privacy", path: "/settings/privacy" },
  { id: "connected-apps", name: "Connected Apps & Integrations", path: "/settings/connected-apps" },
  { id: "billing", name: "Billing", path: "/settings/billing" },
  { id: "support", name: "Support", path: "/settings/support" },
];