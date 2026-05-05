/**
 * Settings > Branding — brand colors and logo configuration
 */

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantSettings, useUpdateTenantSettings } from "@/hooks/useAdminSettings";
import { toast } from "sonner";
import { notifySuccess, t } from '@/lib/i18n-toast';

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-md border" style={{ backgroundColor: value || "#ffffff" }} />
      <div className="flex-1">
        <label className="text-sm font-medium">{label}</label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#000000" className="mt-1" />
      </div>
    </div>
  );
}

export default function SettingsBranding() {
  const settingsQuery = useTenantSettings();
  const updateMutation = useUpdateTenantSettings();
  const branding = (settingsQuery.data?.branding || {}) as Record<string, string>;

  const [accent, setAccent] = useState("");
  const [bg, setBg] = useState("");
  const [fg, setFg] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (branding) {
      setAccent((branding.brand_accent as string) || "");
      setBg((branding.brand_bg as string) || "");
      setFg((branding.brand_fg as string) || "");
      setLogoUrl((branding.logo_url as string) || "");
    }
  }, [settingsQuery.data]);

  const handleSave = () => {
    updateMutation.mutate(
      { branding: { brand_accent: accent, brand_bg: bg, brand_fg: fg, logo_url: logoUrl } },
      {
        onSuccess: () => notifySuccess('toasts.admin.brandingSaved'),
        onError: (err) => toast.error((err as Error).message || "Failed to save"),
      }
    );
  };

  return (
    <AppLayout>
      <AdminTabs sectionKey="settings" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🎨"
          title={t('screens.admin.branding')}
          description="Customize colors and logo for your tenant"
        />

        {settingsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingBranding')}</p>
        )}

        {settingsQuery.data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('screens.admin.brandColors')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ColorField label="Accent Color" value={accent} onChange={setAccent} />
                <ColorField label="Background Color" value={bg} onChange={setBg} />
                <ColorField label="Foreground Color" value={fg} onChange={setFg} />
                <div>
                  <label className="text-sm font-medium">{t('screens.admin.logoUrl')}</label>
                  <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder={t('screens.admin.https')} className="mt-1" />
                </div>
              </CardContent>
            </Card>

            {/* Preview strip */}
            {(accent || bg || fg) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('screens.admin.preview')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 h-12 rounded-md overflow-hidden border">
                    {bg && <div className="flex-1 flex items-center justify-center text-xs" style={{ backgroundColor: bg, color: fg || "#000" }}>{t('screens.admin.background')}</div>}
                    {accent && <div className="flex-1 flex items-center justify-center text-xs text-white" style={{ backgroundColor: accent }}>{t('screens.admin.accent')}</div>}
                    {fg && <div className="flex-1 flex items-center justify-center text-xs" style={{ backgroundColor: fg, color: "#fff" }}>{t('screens.admin.foreground')}</div>}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Branding"}
            </Button>
          </>
        )}
      </div>
    </AppLayout>
  );
}
