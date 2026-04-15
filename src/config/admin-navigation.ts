// Maxina Tenant Admin — Navigation Catalog
//
// This file is the SINGLE SOURCE OF TRUTH for the admin sidebar items and the
// horizontal tab bars rendered inside each admin section. Both the sidebar
// (consumed via getRoleNavigation('admin') in role-navigation.ts) and the
// AdminTabs primitive read from ADMIN_SECTIONS below.
//
// HARD RULES (see /home/dstev/.claude/plans/linear-mixing-chipmunk.md):
//   - Admin pages MUST wrap their content in the existing <AppLayout> so they
//     inherit ORB widget, ProfileDrawer (with role switcher), and the shared
//     sidebar. Do NOT create a parallel AdminLayout.
//   - The ORB widget, user profile, and sidebar dimensions are pixel-identical
//     across every role. Only the navigation item list changes by role.
//   - Wave 2 sections render a "Coming in wave 2" placeholder until they ship,
//     so the sidebar is never broken even before content lands.

import {
  LayoutDashboard,
  Users,
  Sparkles,
  BookOpen,
  Compass,
  Zap,
  MessageSquare,
  Video,
  Bell,
  BarChart3,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminTab {
  key: string;
  label: string;
  path: string;
}

export interface AdminSection {
  key: string;
  label: string;
  icon: LucideIcon;
  basePath: string;
  defaultTab: string;
  tabs: AdminTab[];
  // wave: 1 = ships in the first wave with real content
  //       2 = sidebar item exists but renders a placeholder until wave 2
  wave: 1 | 2;
}

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    basePath: "/admin",
    defaultTab: "dashboard",
    wave: 1,
    tabs: [
      { key: "dashboard", label: "Dashboard", path: "/admin/dashboard" },
      { key: "activity", label: "Activity", path: "/admin/activity" },
      { key: "alerts", label: "Alerts", path: "/admin/alerts" },
      { key: "health", label: "Health", path: "/admin/health" },
    ],
  },
  {
    key: "members",
    label: "Members",
    icon: Users,
    basePath: "/admin/members",
    defaultTab: "directory",
    wave: 1,
    tabs: [
      { key: "directory", label: "Directory", path: "/admin/members/directory" },
      { key: "invitations", label: "Invitations", path: "/admin/members/invitations" },
      { key: "roles", label: "Roles & Access", path: "/admin/members/roles" },
      { key: "segments", label: "Segments", path: "/admin/members/segments" },
      { key: "audit", label: "Audit", path: "/admin/members/audit" },
    ],
  },
  {
    key: "assistant",
    label: "Assistant",
    icon: Sparkles,
    basePath: "/admin/assistant",
    defaultTab: "personality",
    wave: 1,
    tabs: [
      { key: "personality", label: "Personality", path: "/admin/assistant/personality" },
      { key: "voice", label: "Voice", path: "/admin/assistant/voice" },
      { key: "tools", label: "Tools", path: "/admin/assistant/tools" },
      { key: "routing", label: "Routing", path: "/admin/assistant/routing" },
      { key: "playground", label: "Playground", path: "/admin/assistant/playground" },
      { key: "sessions", label: "Sessions", path: "/admin/assistant/sessions" },
    ],
  },
  {
    key: "knowledge",
    label: "Knowledge",
    icon: BookOpen,
    basePath: "/admin/knowledge",
    defaultTab: "documents",
    wave: 1,
    tabs: [
      { key: "documents", label: "Documents", path: "/admin/knowledge/documents" },
      { key: "topics", label: "Topics", path: "/admin/knowledge/topics" },
      { key: "indexing", label: "Indexing", path: "/admin/knowledge/indexing" },
      { key: "search-test", label: "Search Test", path: "/admin/knowledge/search-test" },
      { key: "governance", label: "Governance", path: "/admin/knowledge/governance" },
    ],
  },
  {
    key: "navigator",
    label: "Navigator",
    icon: Compass,
    // VTID-NAV-02 (Session B, merged to main 2026-04-12): Navigator section is
    // fully implemented and live. These tab names + paths match Session B's
    // adminNavigatorNavigation in src/config/navigation.ts. Each tab is a real
    // page under src/pages/admin/navigator/ that wraps itself in AppLayout
    // and renders SubNavigation with these same tabs, so the sidebar links
    // and in-page horizontal nav resolve consistently. Simulator is embedded
    // as a right pane inside Catalog, not a standalone tab.
    basePath: "/admin/navigator",
    defaultTab: "catalog",
    wave: 1,
    tabs: [
      { key: "catalog", label: "Catalog", path: "/admin/navigator" },
      { key: "coverage", label: "Coverage", path: "/admin/navigator/coverage" },
      { key: "telemetry", label: "Telemetry", path: "/admin/navigator/telemetry" },
      { key: "history", label: "History", path: "/admin/navigator/history" },
    ],
  },
  {
    key: "autopilot",
    label: "Autopilot",
    icon: Zap,
    basePath: "/admin/autopilot",
    defaultTab: "planning",
    wave: 1,
    tabs: [
      { key: "planning", label: "Planning", path: "/admin/autopilot/planning" },
      { key: "recommendations", label: "Recommendations", path: "/admin/autopilot/recommendations" },
      { key: "automations", label: "Active Automations", path: "/admin/autopilot/automations" },
      { key: "runs", label: "Runs", path: "/admin/autopilot/runs" },
      { key: "guardrails", label: "Guardrails", path: "/admin/autopilot/guardrails" },
      { key: "growth", label: "Growth", path: "/admin/autopilot/growth" },
    ],
  },
  {
    key: "community",
    label: "Community",
    icon: MessageSquare,
    basePath: "/admin/community",
    defaultTab: "reported",
    wave: 2,
    tabs: [
      { key: "reported", label: "Reported Content", path: "/admin/community/reported" },
      { key: "meetups", label: "Meetups", path: "/admin/community/meetups" },
      { key: "live-rooms", label: "Live Rooms", path: "/admin/community/live-rooms" },
      { key: "groups", label: "Groups", path: "/admin/community/groups" },
      { key: "creators", label: "Creators", path: "/admin/community/creators" },
    ],
  },
  {
    key: "content",
    label: "Content",
    icon: Video,
    basePath: "/admin/content",
    defaultTab: "videos",
    wave: 2,
    tabs: [
      { key: "videos", label: "Videos", path: "/admin/content/videos" },
      { key: "podcasts", label: "Podcasts", path: "/admin/content/podcasts" },
      { key: "music", label: "Music", path: "/admin/content/music" },
      { key: "uploads", label: "Uploads", path: "/admin/content/uploads" },
      { key: "analytics", label: "Analytics", path: "/admin/content/analytics" },
    ],
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: Bell,
    basePath: "/admin/notifications",
    defaultTab: "compose",
    wave: 2,
    tabs: [
      { key: "compose", label: "Compose", path: "/admin/notifications/compose" },
      { key: "categories", label: "Categories", path: "/admin/notifications/categories" },
      { key: "templates", label: "Templates", path: "/admin/notifications/templates" },
      { key: "sent", label: "Sent", path: "/admin/notifications/sent" },
      { key: "subscriptions", label: "Subscriptions", path: "/admin/notifications/subscriptions" },
      { key: "providers", label: "Providers", path: "/admin/notifications/providers" },
    ],
  },
  {
    key: "insights",
    label: "Insights",
    icon: BarChart3,
    basePath: "/admin/insights",
    defaultTab: "growth",
    wave: 2,
    tabs: [
      { key: "growth", label: "Growth", path: "/admin/insights/growth" },
      { key: "engagement", label: "Engagement", path: "/admin/insights/engagement" },
      { key: "assistant-usage", label: "Assistant Usage", path: "/admin/insights/assistant-usage" },
      { key: "autopilot-impact", label: "Autopilot Impact", path: "/admin/insights/autopilot-impact" },
      { key: "reports", label: "Reports", path: "/admin/insights/reports" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    basePath: "/admin/settings",
    defaultTab: "profile",
    wave: 1,
    tabs: [
      { key: "profile", label: "Profile", path: "/admin/settings/profile" },
      { key: "branding", label: "Branding", path: "/admin/settings/branding" },
      { key: "feature-flags", label: "Feature Flags", path: "/admin/settings/feature-flags" },
      { key: "integrations", label: "Integrations", path: "/admin/settings/integrations" },
      { key: "domains", label: "Domains", path: "/admin/settings/domains" },
      { key: "billing", label: "Billing", path: "/admin/settings/billing" },
    ],
  },
  {
    key: "audit",
    label: "Audit & Compliance",
    icon: ShieldCheck,
    basePath: "/admin/audit",
    defaultTab: "actions",
    wave: 1,
    tabs: [
      { key: "actions", label: "Admin Actions", path: "/admin/audit/actions" },
      { key: "access", label: "Access Log", path: "/admin/audit/access" },
      { key: "events", label: "OASIS Events", path: "/admin/audit/events" },
      { key: "policies", label: "Policies", path: "/admin/audit/policies" },
      { key: "data-rights", label: "Data Rights", path: "/admin/audit/data-rights" },
    ],
  },
];

// Lookup helpers ---------------------------------------------------------------

export function getAdminSectionByPath(pathname: string): AdminSection | undefined {
  // Match longest basePath first so /admin/members/directory resolves to "members",
  // not "overview" (which has basePath /admin).
  const sorted = [...ADMIN_SECTIONS].sort((a, b) => b.basePath.length - a.basePath.length);
  return sorted.find((section) => {
    if (pathname === section.basePath) return true;
    return pathname.startsWith(section.basePath + "/");
  });
}

export function getAdminTabByPath(pathname: string): AdminTab | undefined {
  const section = getAdminSectionByPath(pathname);
  if (!section) return undefined;
  return section.tabs.find((tab) => pathname === tab.path || pathname.startsWith(tab.path + "/"));
}
