// Vitanaland BackOffice (ERP/CRM) — Navigation Catalog  (VTID-03833)
//
// This file is the SINGLE SOURCE OF TRUTH for the BackOffice sidebar items and
// the horizontal tab bars inside each BackOffice section. It is the exact
// pattern src/config/admin-navigation.ts uses for /admin, one level over:
//   - the sidebar reads it via backOfficeNavigation in role-navigation.ts
//   - <BackOfficeTabs> reads it for the tab row
//   - <BackOfficePlaceholder> reads it for the wave-aware body
//
// Sections are organised by DEPARTMENT, not by ERP module — the plan's B4 table
// (exafyltd/vitana-platform docs/backoffice/GOLDEN-WORKFLOWS.md). Every section
// renders the placeholder until its screens ship; wave-2/3 sections exist in
// the sidebar from day one so it never changes shape when content lands.
//
// HARD RULES (inherited from admin-navigation.ts):
//   - BackOffice pages MUST wrap their content in the existing <AppLayout>. Do
//     NOT create a parallel layout: ORB widget, ProfileDrawer (role switcher)
//     and sidebar dimensions are pixel-identical across roles.
//   - Desktop only, by inheritance: useRole forces `community` on mobile widths.
//   - Never add BackOffice items to the community sidebar.

import {
  ArrowLeft,
  LayoutDashboard,
  Handshake,
  Megaphone,
  BookOpen,
  Landmark,
  Users,
  Truck,
  Scale,
  BarChart3,
  ClipboardCheck,
  ShieldCheck,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// wave: 1 = cockpit + order-to-cash (decision 5); 2 = next; 3 = gated on a named
// owner (payroll journal, gratuity, e-signature). A tab may carry its own wave
// when it ships later than its section (e.g. Accounting › Tax is wave 2 inside
// a wave-1 section).
export type BackOfficeWave = 1 | 2 | 3;

export interface BackOfficeTab {
  key: string;
  label: string;
  path: string;
  wave?: BackOfficeWave;
}

export interface BackOfficeSection {
  key: string;
  label: string;
  icon: LucideIcon;
  basePath: string;
  defaultTab: string;
  tabs: BackOfficeTab[];
  wave: BackOfficeWave;
  // "← Admin" is a link out of BackOffice, not a section: no tabs, shown only
  // when the user also holds the admin role (hasPermission('admin')).
  adminOnly?: boolean;
  // VTID-03834: ERP capabilities (any-of) that make this section usable. Absent =
  // visible to everyone who can enter /backoffice (Overview, Approvals). The
  // gateway enforces on every read/command; this only hides what cannot be used.
  capabilities?: readonly string[];
}

export const BACKOFFICE_HOME = "/backoffice/dashboard";

export const BACKOFFICE_SECTIONS: BackOfficeSection[] = [
  {
    key: "back",
    label: "← Admin",
    icon: ArrowLeft,
    basePath: "/admin/dashboard",
    defaultTab: "admin",
    wave: 1,
    adminOnly: true,
    tabs: [{ key: "admin", label: "← Admin", path: "/admin/dashboard" }],
  },
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    basePath: "/backoffice",
    defaultTab: "dashboard",
    wave: 1,
    tabs: [
      { key: "dashboard", label: "Dashboard", path: "/backoffice/dashboard" },
      { key: "inbox", label: "Approvals Inbox", path: "/backoffice/inbox" },
      { key: "activity", label: "Activity", path: "/backoffice/activity" },
      { key: "health", label: "Health", path: "/backoffice/health" },
    ],
  },
  {
    key: "sales",
    label: "Sales & CRM",
    icon: Handshake,
    basePath: "/backoffice/sales",
    defaultTab: "leads",
    wave: 1,
    capabilities: ["crm.view", "sales.view"],
    tabs: [
      { key: "leads", label: "Leads", path: "/backoffice/sales/leads" },
      { key: "contacts", label: "Contacts & Companies", path: "/backoffice/sales/contacts" },
      { key: "opportunities", label: "Opportunities", path: "/backoffice/sales/opportunities" },
      { key: "followups", label: "Follow-ups", path: "/backoffice/sales/followups" },
      { key: "quotations", label: "Quotations", path: "/backoffice/sales/quotations" },
      { key: "orders", label: "Sales Orders", path: "/backoffice/sales/orders", wave: 2 },
      { key: "invoices", label: "Invoices", path: "/backoffice/sales/invoices" },
      { key: "credit-notes", label: "Credit Notes", path: "/backoffice/sales/credit-notes" },
      { key: "deliveries", label: "Deliveries", path: "/backoffice/sales/deliveries", wave: 2 },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    icon: Megaphone,
    basePath: "/backoffice/marketing",
    defaultTab: "campaigns",
    wave: 2,
    capabilities: ["marketing.view"],
    tabs: [
      { key: "campaigns", label: "Campaigns", path: "/backoffice/marketing/campaigns" },
      { key: "outreach", label: "Outreach", path: "/backoffice/marketing/outreach" },
      { key: "attribution", label: "Lead Sources & Attribution", path: "/backoffice/marketing/attribution" },
      { key: "performance", label: "Performance", path: "/backoffice/marketing/performance" },
    ],
  },
  {
    key: "accounting",
    label: "Accounting",
    icon: BookOpen,
    basePath: "/backoffice/accounting",
    defaultTab: "journals",
    wave: 1,
    capabilities: ["accounting.view"],
    tabs: [
      { key: "journals", label: "Journals", path: "/backoffice/accounting/journals" },
      { key: "chart-of-accounts", label: "Chart of Accounts", path: "/backoffice/accounting/chart-of-accounts" },
      { key: "periods", label: "Fiscal Periods & Close", path: "/backoffice/accounting/periods" },
      { key: "tax", label: "Tax", path: "/backoffice/accounting/tax", wave: 2 },
      { key: "assets", label: "Fixed Assets & Leases", path: "/backoffice/accounting/assets", wave: 2 },
      { key: "intercompany", label: "Intercompany & Consolidation", path: "/backoffice/accounting/intercompany", wave: 2 },
      { key: "budgets", label: "Budgets & Forecasts", path: "/backoffice/accounting/budgets", wave: 2 },
    ],
  },
  {
    key: "finance",
    label: "Finance & Treasury",
    icon: Landmark,
    basePath: "/backoffice/finance",
    defaultTab: "payments",
    wave: 1,
    capabilities: ["finance.view"],
    tabs: [
      { key: "payments", label: "Payments", path: "/backoffice/finance/payments" },
      { key: "bank-reconciliation", label: "Bank Reconciliation", path: "/backoffice/finance/bank-reconciliation" },
      { key: "cash", label: "Cash Position & Forecast", path: "/backoffice/finance/cash", wave: 2 },
      { key: "subscriptions", label: "Recurring Billing", path: "/backoffice/finance/subscriptions", wave: 2 },
      { key: "sync", label: "Stripe / Shopify Sync", path: "/backoffice/finance/sync", wave: 2 },
    ],
  },
  {
    key: "hr",
    label: "HR & People",
    icon: Users,
    basePath: "/backoffice/hr",
    defaultTab: "employees",
    wave: 2,
    capabilities: ["hr.view", "payroll.view"],
    tabs: [
      { key: "employees", label: "Employees & Documents", path: "/backoffice/hr/employees" },
      { key: "leave", label: "Leave", path: "/backoffice/hr/leave" },
      { key: "attendance", label: "Attendance", path: "/backoffice/hr/attendance" },
      { key: "expenses", label: "Expense Claims", path: "/backoffice/hr/expenses" },
      { key: "payroll", label: "Payroll", path: "/backoffice/hr/payroll", wave: 3 },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    icon: Truck,
    basePath: "/backoffice/operations",
    defaultTab: "suppliers",
    wave: 2,
    capabilities: ["ops.view"],
    tabs: [
      { key: "suppliers", label: "Suppliers", path: "/backoffice/operations/suppliers" },
      { key: "purchase-orders", label: "Purchase Orders", path: "/backoffice/operations/purchase-orders" },
      { key: "receipts", label: "Goods Receipts", path: "/backoffice/operations/receipts" },
      { key: "supplier-invoices", label: "Supplier Invoices", path: "/backoffice/operations/supplier-invoices" },
      { key: "items", label: "Items", path: "/backoffice/operations/items" },
      { key: "warehouses", label: "Warehouses", path: "/backoffice/operations/warehouses" },
      { key: "stock", label: "Stock & Moves", path: "/backoffice/operations/stock" },
    ],
  },
  {
    key: "legal",
    label: "Legal & Compliance",
    icon: Scale,
    basePath: "/backoffice/legal",
    defaultTab: "contracts",
    wave: 2,
    capabilities: ["legal.view"],
    tabs: [
      { key: "contracts", label: "Contracts", path: "/backoffice/legal/contracts" },
      { key: "obligations", label: "Obligations", path: "/backoffice/legal/obligations" },
      { key: "compliance", label: "Compliance", path: "/backoffice/legal/compliance" },
      { key: "e-signature", label: "E-Signature", path: "/backoffice/legal/e-signature", wave: 3 },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: BarChart3,
    basePath: "/backoffice/reports",
    defaultTab: "pnl",
    wave: 1,
    capabilities: ["reports.view"],
    tabs: [
      { key: "pnl", label: "P&L", path: "/backoffice/reports/pnl" },
      { key: "balance-sheet", label: "Balance Sheet", path: "/backoffice/reports/balance-sheet", wave: 2 },
      { key: "trial-balance", label: "Trial Balance", path: "/backoffice/reports/trial-balance", wave: 2 },
      { key: "cash-flow", label: "Cash Flow", path: "/backoffice/reports/cash-flow", wave: 2 },
      { key: "aging", label: "AR / AP Aging", path: "/backoffice/reports/aging" },
      { key: "dimensions", label: "By Dimension", path: "/backoffice/reports/dimensions", wave: 2 },
      { key: "board-pack", label: "Board Pack", path: "/backoffice/reports/board-pack", wave: 2 },
    ],
  },
  {
    key: "approvals",
    label: "Approvals",
    icon: ClipboardCheck,
    basePath: "/backoffice/approvals",
    defaultTab: "queue",
    wave: 1,
    tabs: [
      { key: "queue", label: "Queue", path: "/backoffice/approvals/queue" },
      { key: "my-requests", label: "My Requests", path: "/backoffice/approvals/my-requests" },
      { key: "policies", label: "Policies", path: "/backoffice/approvals/policies" },
    ],
  },
  {
    key: "audit",
    label: "Audit",
    icon: ShieldCheck,
    basePath: "/backoffice/audit",
    defaultTab: "receipts",
    wave: 1,
    capabilities: ["audit.view"],
    tabs: [
      { key: "receipts", label: "Command Receipts", path: "/backoffice/audit/receipts" },
      { key: "erp-log", label: "ERP Audit Log", path: "/backoffice/audit/erp-log" },
      { key: "trail", label: "Independent Audit Trail", path: "/backoffice/audit/trail" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    basePath: "/backoffice/settings",
    defaultTab: "company",
    wave: 1,
    capabilities: ["erp.admin", "accounting.configure"],
    tabs: [
      { key: "company", label: "Company & Legal Entities", path: "/backoffice/settings/company" },
      { key: "access", label: "Access", path: "/backoffice/settings/access" },
      { key: "numbering", label: "Numbering", path: "/backoffice/settings/numbering", wave: 2 },
      { key: "integrations", label: "Integrations", path: "/backoffice/settings/integrations", wave: 2 },
      { key: "modules", label: "Modules", path: "/backoffice/settings/modules", wave: 2 },
    ],
  },
];

// Lookup helpers ---------------------------------------------------------------

/** Sections that are real BackOffice destinations (excludes the "← Admin" link). */
export function getBackOfficeContentSections(): BackOfficeSection[] {
  return BACKOFFICE_SECTIONS.filter((s) => !s.adminOnly);
}

export function getBackOfficeSectionByPath(pathname: string): BackOfficeSection | undefined {
  // Match longest basePath first so /backoffice/sales/leads resolves to "sales",
  // not "overview" (which has basePath /backoffice).
  const sorted = [...getBackOfficeContentSections()].sort((a, b) => b.basePath.length - a.basePath.length);
  return sorted.find((section) => {
    if (pathname === section.basePath) return true;
    return pathname.startsWith(section.basePath + "/");
  });
}

export function getBackOfficeTabByPath(pathname: string): BackOfficeTab | undefined {
  const section = getBackOfficeSectionByPath(pathname);
  if (!section) return undefined;
  return section.tabs.find((tab) => pathname === tab.path || pathname.startsWith(tab.path + "/"));
}

/**
 * VTID-03834: can a user with these effective capabilities use the section?
 * `null` capabilities = not loaded yet / unknown → do not hide anything (the
 * gateway still enforces); Exafy super-admins get the whole catalog from /me.
 */
export function canUseBackOfficeSection(section: BackOfficeSection, capabilities: readonly string[] | null | undefined): boolean {
  if (!section.capabilities || section.capabilities.length === 0) return true;
  if (capabilities == null) return true;
  return section.capabilities.some((c) => capabilities.includes(c));
}

/** Effective wave of a tab: its own wave when set, else its section's. */
export function getBackOfficeTabWave(section: BackOfficeSection, tab?: BackOfficeTab): BackOfficeWave {
  return tab?.wave ?? section.wave;
}
