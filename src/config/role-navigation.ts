// Role-specific navigation configurations
import { UserRole } from "@/hooks/useRole";
import { ADMIN_SECTIONS } from "@/config/admin-navigation";
import {
  LayoutDashboard, Users, Calendar, Activity, FileText,
  Heart, Wallet, Share2, Database, Settings, Shield,
  Stethoscope, TestTube, Target, BookOpen, Bell,
  ClipboardList, UserCheck, BarChart3, Clock,
  MessageSquare, Search, Zap, Flag, Video, Sparkles, Radio, Briefcase,
  Newspaper, Plug, LifeBuoy
} from "lucide-react";

interface NavigationItem {
  title: string;
  path: string;
  icon: any;
  i18nKey?: string; // Translation key for internationalization
}

// Community Role Navigation - Social platform focused
export const communityNavigation: NavigationItem[] = [
  { title: "News", path: "/home", icon: Newspaper, i18nKey: "sidebar.news" },
  { title: "My Journey", path: "/autopilot", icon: Zap, i18nKey: "sidebar.myJourney" },
  { title: "Community", path: "/comm", icon: MessageSquare, i18nKey: "sidebar.community" },
  { title: "Discover", path: "/discover", icon: Search, i18nKey: "sidebar.discover" },
  { title: "Business Hub", path: "/business", icon: Briefcase, i18nKey: "sidebar.businessHub" },
  { title: "Inbox", path: "/inbox", icon: MessageSquare, i18nKey: "sidebar.inbox" },
  { title: "Health", path: "/health", icon: Heart, i18nKey: "sidebar.health" },
  { title: "Connectors", path: "/connectors", icon: Plug, i18nKey: "sidebar.connectors" },
  { title: "AI Assistant", path: "/assistant", icon: Sparkles, i18nKey: "sidebar.aiAssistant" },
  { title: "Wallet", path: "/wallet", icon: Wallet, i18nKey: "sidebar.wallet" },
  { title: "Sharing", path: "/sharing", icon: Share2, i18nKey: "sidebar.sharing" },
  { title: "Memory", path: "/memory", icon: Database, i18nKey: "sidebar.memory" },
  { title: "Settings", path: "/settings", icon: Settings, i18nKey: "sidebar.settings" },
  { title: "Support", path: "/support", icon: LifeBuoy, i18nKey: "sidebar.support" },
];

// Patient Role Navigation - Health management focused
export const patientNavigation: NavigationItem[] = [
  { title: "Dashboard", path: "/patient/dashboard", icon: LayoutDashboard, i18nKey: "sidebar.dashboard" },
  { title: "My Health", path: "/patient/health", icon: Heart, i18nKey: "sidebar.myHealth" },
  { title: "Appointments", path: "/patient/appointments", icon: Calendar, i18nKey: "sidebar.appointments" },
  { title: "Test Results", path: "/patient/results", icon: TestTube, i18nKey: "sidebar.testResults" },
  { title: "Care Team", path: "/patient/care-team", icon: Users, i18nKey: "sidebar.careTeam" },
  { title: "Health Goals", path: "/patient/goals", icon: Target, i18nKey: "sidebar.healthGoals" },
  { title: "Insurance", path: "/patient/insurance", icon: Shield, i18nKey: "sidebar.insurance" },
  { title: "Notifications", path: "/patient/notifications", icon: Bell, i18nKey: "sidebar.notifications" },
  { title: "Settings", path: "/settings", icon: Settings, i18nKey: "sidebar.settings" },
];

// Professional Role Navigation - Healthcare provider focused
export const professionalNavigation: NavigationItem[] = [
  { title: "Dashboard", path: "/professional/dashboard", icon: LayoutDashboard, i18nKey: "sidebar.dashboard" },
  { title: "My Patients", path: "/professional/patients", icon: Users, i18nKey: "sidebar.myPatients" },
  { title: "Schedule", path: "/professional/schedule", icon: Calendar, i18nKey: "sidebar.schedule" },
  { title: "Clinical Tools", path: "/professional/tools", icon: Stethoscope, i18nKey: "sidebar.clinicalTools" },
  { title: "Referrals", path: "/professional/referrals", icon: FileText, i18nKey: "sidebar.referrals" },
  { title: "Billing", path: "/professional/billing", icon: Wallet, i18nKey: "sidebar.billing" },
  { title: "Professional Profile", path: "/professional/profile", icon: UserCheck, i18nKey: "sidebar.professionalProfile" },
  { title: "Education", path: "/professional/education", icon: BookOpen, i18nKey: "sidebar.education" },
  { title: "Settings", path: "/settings", icon: Settings, i18nKey: "sidebar.settings" },
];

// Staff Role Navigation - Healthcare staff focused
export const staffNavigation: NavigationItem[] = [
  { title: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard, i18nKey: "sidebar.dashboard" },
  { title: "Patient Queue", path: "/staff/queue", icon: ClipboardList, i18nKey: "sidebar.patientQueue" },
  { title: "Daily Tasks", path: "/staff/tasks", icon: Activity, i18nKey: "sidebar.dailyTasks" },
  { title: "Schedule", path: "/staff/schedule", icon: Calendar, i18nKey: "sidebar.schedule" },
  { title: "Reports", path: "/staff/reports", icon: BarChart3, i18nKey: "sidebar.reports" },
  { title: "Communications", path: "/staff/communications", icon: MessageSquare, i18nKey: "sidebar.communications" },
  { title: "Staff Tools", path: "/staff/tools", icon: Zap, i18nKey: "sidebar.staffTools" },
  { title: "Time Tracking", path: "/staff/time", icon: Clock, i18nKey: "sidebar.timeTracking" },
  { title: "Settings", path: "/settings", icon: Settings, i18nKey: "sidebar.settings" },
];

// Admin Role Navigation — Maxina Tenant Admin (12 sections)
//
// Derived from ADMIN_SECTIONS in @/config/admin-navigation, which is the single
// source of truth for both this sidebar and the in-page horizontal tab bars.
// Each sidebar item links to the section's default tab so the user lands on
// real content, not an empty section route.
export const adminNavigation: NavigationItem[] = ADMIN_SECTIONS.map((section) => {
  const defaultTab = section.tabs.find((t) => t.key === section.defaultTab) ?? section.tabs[0];
  return {
    title: section.label,
    path: defaultTab?.path ?? section.basePath,
    icon: section.icon,
    i18nKey: `sidebar.admin.${section.key}`,
  };
});

// Function to get navigation based on user role
export function getRoleNavigation(role: UserRole | null): NavigationItem[] {
  switch (role) {
    case "community":
      return communityNavigation;
    case "patient":
      return patientNavigation;
    case "professional":
      return professionalNavigation;
    case "staff":
      return staffNavigation;
    case "admin":
      return adminNavigation;
    default:
      return communityNavigation; // Default to community navigation
  }
}