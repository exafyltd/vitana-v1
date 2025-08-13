import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

const settingsSubItems = [
  { id: "account", name: "Account", path: "/settings" },
  { id: "privacy", name: "Privacy", path: "/settings/privacy" },
  { id: "notifications", name: "Notifications", path: "/settings/notifications" },
  { id: "preferences", name: "Preferences", path: "/settings/preferences" },
  { id: "connected-apps", name: "Connected Apps", path: "/settings/connected-apps" },
  { id: "billing", name: "Billing", path: "/settings/billing" },
  { id: "support", name: "Support", path: "/settings/support" },
];

export default function Billing() {
  return (
    <AppLayout>
      <SEO title="Billing | Settings" description="Manage your subscription and billing information" canonical={window.location.href} />
      <SubNavigation items={settingsSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription plan, payment methods, and billing history.</p>
        </div>
      </div>
    </AppLayout>
  );
}