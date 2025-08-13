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

export default function Preferences() {
  return (
    <AppLayout>
      <SEO title="Preferences | Settings" description="Customize your app preferences and experience" canonical={window.location.href} />
      <SubNavigation items={settingsSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Preferences</h1>
          <p className="text-muted-foreground">Customize your app experience with personal preferences and display settings.</p>
        </div>
      </div>
    </AppLayout>
  );
}