// Role-specific navigation configurations
import { UserRole } from "@/hooks/useRole";
import { 
  LayoutDashboard, Users, Calendar, Activity, FileText, 
  Heart, Wallet, Share2, Database, Settings, Shield,
  Stethoscope, TestTube, Target, BookOpen, Bell,
  ClipboardList, UserCheck, BarChart3, Clock,
  MessageSquare, Search, Zap, Flag, Video, Sparkles
} from "lucide-react";

interface NavigationItem {
  title: string;
  path: string;
  icon: any;
}

// Community Role Navigation - Social platform focused
export const communityNavigation: NavigationItem[] = [
  { title: "Home", path: "/home", icon: LayoutDashboard },
  { title: "Community", path: "/comm", icon: MessageSquare },
  { title: "Discover", path: "/discover", icon: Search },
  { title: "Inbox", path: "/inbox", icon: MessageSquare },
  { title: "Health", path: "/health", icon: Heart },
  { title: "AI Assistant", path: "/assistant", icon: Sparkles },
  { title: "Wallet", path: "/wallet", icon: Wallet },
  { title: "Sharing", path: "/sharing", icon: Share2 },
  { title: "Memory", path: "/memory", icon: Database },
  { title: "Settings", path: "/settings", icon: Settings },
];

// Patient Role Navigation - Health management focused
export const patientNavigation: NavigationItem[] = [
  { title: "Dashboard", path: "/patient/dashboard", icon: LayoutDashboard },
  { title: "My Health", path: "/patient/health", icon: Heart },
  { title: "Appointments", path: "/patient/appointments", icon: Calendar },
  { title: "Test Results", path: "/patient/results", icon: TestTube },
  { title: "Care Team", path: "/patient/care-team", icon: Users },
  { title: "Health Goals", path: "/patient/goals", icon: Target },
  { title: "Insurance", path: "/patient/insurance", icon: Shield },
  { title: "Notifications", path: "/patient/notifications", icon: Bell },
  { title: "Settings", path: "/settings", icon: Settings },
];

// Professional Role Navigation - Healthcare provider focused
export const professionalNavigation: NavigationItem[] = [
  { title: "Dashboard", path: "/professional/dashboard", icon: LayoutDashboard },
  { title: "My Patients", path: "/professional/patients", icon: Users },
  { title: "Schedule", path: "/professional/schedule", icon: Calendar },
  { title: "Clinical Tools", path: "/professional/tools", icon: Stethoscope },
  { title: "Referrals", path: "/professional/referrals", icon: FileText },
  { title: "Billing", path: "/professional/billing", icon: Wallet },
  { title: "Professional Profile", path: "/professional/profile", icon: UserCheck },
  { title: "Education", path: "/professional/education", icon: BookOpen },
  { title: "Settings", path: "/settings", icon: Settings },
];

// Staff Role Navigation - Healthcare staff focused
export const staffNavigation: NavigationItem[] = [
  { title: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard },
  { title: "Patient Queue", path: "/staff/queue", icon: ClipboardList },
  { title: "Daily Tasks", path: "/staff/tasks", icon: Activity },
  { title: "Schedule", path: "/staff/schedule", icon: Calendar },
  { title: "Reports", path: "/staff/reports", icon: BarChart3 },
  { title: "Communications", path: "/staff/communications", icon: MessageSquare },
  { title: "Staff Tools", path: "/staff/tools", icon: Zap },
  { title: "Time Tracking", path: "/staff/time", icon: Clock },
  { title: "Settings", path: "/settings", icon: Settings },
];

// Admin Role Navigation - System management focused
export const adminNavigation: NavigationItem[] = [
  { title: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { title: "User Management", path: "/admin/user-management", icon: Users },
  { title: "Community Supervision", path: "/admin/community", icon: Flag },
  { title: "Media Management", path: "/admin/media", icon: Video },
  { title: "Tenant Management", path: "/admin/tenant-management", icon: Shield },
  { title: "System Admin", path: "/admin/system/bootstrap", icon: Settings },
  { title: "Clinical Ops", path: "/admin/clinical/patient-records", icon: Stethoscope },
  { title: "Monitoring", path: "/admin/monitoring/reports", icon: Activity },
];

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