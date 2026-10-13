import React from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GrantAccessDialog } from "@/components/sharing/GrantAccessDialog";
import { CreatePackageDialog } from "@/components/sharing/CreatePackageDialog";
import { PrivacySettingsDialog } from "@/components/sharing/PrivacySettingsDialog";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Shield, AlertCircle, Database, Package, Plus, ChevronDown } from "lucide-react";
import { t } from '@/lib/i18n-toast';
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { VCard } from "@/components/ui/vcard";
import { TIER_B_GRID_2 } from "@/components/spotlight/tier-b/TierBKit";

export default withScreenId(function DataConsent() {
  const [grantAccessOpen, setGrantAccessOpen] = React.useState(false);
  const [createPackageOpen, setCreatePackageOpen] = React.useState(false);
  const [privacySettingsOpen, setPrivacySettingsOpen] = React.useState(false);
  // VTID-05111 — Spotlight Tier B (desktop + flag only; phones and flag-off keep the screen below).
  const spotlight = useSpotlightEnabled();

  const dialogs = (
    <>
      <GrantAccessDialog open={grantAccessOpen} onOpenChange={setGrantAccessOpen} />
      <CreatePackageDialog open={createPackageOpen} onOpenChange={setCreatePackageOpen} />
      <PrivacySettingsDialog open={privacySettingsOpen} onOpenChange={setPrivacySettingsOpen} />
    </>
  );

  if (spotlight) {
    const panels = [
      { icon: Shield, title: t('screens.sharing.activePermissions'), body: t('screens.sharing.comingSoonViewManageGrantedPermissions') },
      { icon: AlertCircle, title: t('screens.sharing.pendingRequests'), body: t('screens.sharing.comingSoonReviewPendingConsentRequests') },
      { icon: Database, title: t('screens.sharing.privacy'), body: t('screens.sharing.statusOverview') },
      { icon: Package, title: t('screens.sharing.packages'), body: t('screens.sharing.dataPackages') },
    ];
    const menuItem = (Icon: typeof Shield, title: string, sub: string, onSelect: () => void) => (
      <DropdownMenuItem onClick={onSelect}>
        <Icon className="me-2 h-4 w-4" />
        <div className="flex flex-col">
          <span className="font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{sub}</span>
        </div>
      </DropdownMenuItem>
    );
    return (
      <AppLayout>
        <SEO title={t('screens.sharing.dataConsentManagementVitana')} description={t('spotlightTierB.sharing.consentDescription')} canonical={window.location.href} />
        <ScreenFrame
          archetype="collection"
          subNav={{ items: sharingNavigation }}
          header={{ title: t('screens.sharing.dataConsent'), description: t('spotlightTierB.sharing.consentDescription'), emoji: '🔐' }}
          utility={{
            children: (
              <>
                <ExpandableSearchButton placeholder={t('screens.sharing.searchPermissionsPackages')} />
                <UniversalCalendarButton />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="default">
                      <Plus className="me-2 h-4 w-4" />
                      {t('screens.sharing.manageAccess')}
                      <ChevronDown className="ms-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {menuItem(Shield, t('screens.sharing.grantPermission'), t('screens.sharing.allowDataAccessEntity'), () => setGrantAccessOpen(true))}
                    {menuItem(Package, t('screens.sharing.createDataPackage'), t('screens.sharing.bundleDataForSharing'), () => setCreatePackageOpen(true))}
                    <DropdownMenuSeparator />
                    {menuItem(Database, t('screens.sharing.privacySettings'), t('screens.sharing.configureGlobalControls'), () => setPrivacySettingsOpen(true))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ),
          }}
        >
          <div className={TIER_B_GRID_2}>
            {panels.map((p) => (
              <VCard key={p.title} size="standard" eyebrow={<p.icon className="h-4 w-4" aria-hidden="true" />} title={p.title} body={p.body} />
            ))}
          </div>
        </ScreenFrame>
        {dialogs}
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO
        title={t('screens.sharing.dataConsentManagementVitana')}
        description="Manage permissions, privacy settings, and data packages"
        canonical={window.location.href}
      />
      <SubNavigation items={sharingNavigation} />

      <div className="p-6 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title={t('screens.sharing.dataConsent')}
            description="Control who has access to your data and manage permissions"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder={t('screens.sharing.searchPermissionsPackages')}
            />
            <UniversalCalendarButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="default">
                  <Plus className="w-4 h-4 me-2" />
                  {t('screens.sharing.manageAccess')}
                  <ChevronDown className="w-4 h-4 ms-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setGrantAccessOpen(true)}>
                  <Shield className="w-4 h-4 me-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">{t('screens.sharing.grantPermission')}</span>
                    <span className="text-xs text-muted-foreground">{t('screens.sharing.allowDataAccessEntity')}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreatePackageOpen(true)}>
                  <Package className="w-4 h-4 me-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">{t('screens.sharing.createDataPackage')}</span>
                    <span className="text-xs text-muted-foreground">{t('screens.sharing.bundleDataForSharing')}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPrivacySettingsOpen(true)}>
                  <Database className="w-4 h-4 me-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">{t('screens.sharing.privacySettings')}</span>
                    <span className="text-xs text-muted-foreground">{t('screens.sharing.configureGlobalControls')}</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </UtilityActionButton>

          {/* Four Split Screens: 30/30/20/20 */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Top Row */}
            <div className="lg:col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    {t('screens.sharing.activePermissions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.sharing.comingSoonViewManageGrantedPermissions')}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {t('screens.sharing.pendingRequests')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.sharing.comingSoonReviewPendingConsentRequests')}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    {t('screens.sharing.privacy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.sharing.statusOverview')}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {t('screens.sharing.packages')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.sharing.dataPackages')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {dialogs}
    </AppLayout>
  );
}, SCREEN_IDS.SHARING_OVERVIEW);
