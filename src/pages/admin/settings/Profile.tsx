/**
 * Settings > Profile — tenant name, description, support email, logo URL
 */

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantSettings, useUpdateTenantSettings } from "@/hooks/useAdminSettings";
import { toast } from "sonner";
import { notifySuccess } from '@/lib/i18n-toast';

export default function SettingsProfile() {
  const settingsQuery = useTenantSettings();
  const updateMutation = useUpdateTenantSettings();
  const profile = (settingsQuery.data?.profile || {}) as Record<string, string>;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (profile) {
      setName((profile.name as string) || "");
      setDescription((profile.description as string) || "");
      setSupportEmail((profile.support_email as string) || "");
      setLogoUrl((profile.logo_url as string) || "");
    }
  }, [settingsQuery.data]);

  const handleSave = () => {
    updateMutation.mutate(
      { profile: { name, description, support_email: supportEmail, logo_url: logoUrl } },
      {
        onSuccess: () => notifySuccess('toasts.admin.profileSaved'),
        onError: (err) => toast.error((err as Error).message || "Failed to save"),
      }
    );
  };

  return (
    <AppLayout>
      <AdminTabs sectionKey="settings" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🏢"
          title="Profile"
          description="Basic information about your tenant organization"
        />

        {settingsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading settings...</p>
        )}

        {settingsQuery.isError && (
          <div className="text-sm text-destructive py-8 text-center space-y-2">
            <p>Failed to load settings: {(settingsQuery.error as Error)?.message || "Unknown error"}</p>
            <p className="text-xs text-muted-foreground">Check browser console for details</p>
          </div>
        )}

        {!settingsQuery.isLoading && !settingsQuery.isError && !settingsQuery.data && (
          <p className="text-sm text-muted-foreground py-8 text-center">No settings data available. Tenant ID may not be resolved yet.</p>
        )}

        {settingsQuery.data && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tenant Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tenant Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Organization" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description of your organization" rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium">Support Email</label>
                <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@example.com" />
              </div>
              <div>
                <label className="text-sm font-medium">Logo URL</label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
                {logoUrl && (
                  <img src={logoUrl} alt="Logo preview" className="mt-2 h-12 object-contain rounded" />
                )}
              </div>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
