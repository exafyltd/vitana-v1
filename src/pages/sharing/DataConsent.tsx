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

export default withScreenId(function DataConsent() {
  const [grantAccessOpen, setGrantAccessOpen] = React.useState(false);
  const [createPackageOpen, setCreatePackageOpen] = React.useState(false);
  const [privacySettingsOpen, setPrivacySettingsOpen] = React.useState(false);

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
                  <Plus className="w-4 h-4 mr-2" />
                  Manage Access
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setGrantAccessOpen(true)}>
                  <Shield className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">{t('screens.sharing.grantPermission')}</span>
                    <span className="text-xs text-muted-foreground">{t('screens.sharing.allowDataAccessEntity')}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreatePackageOpen(true)}>
                  <Package className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">{t('screens.sharing.createDataPackage')}</span>
                    <span className="text-xs text-muted-foreground">{t('screens.sharing.bundleDataForSharing')}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPrivacySettingsOpen(true)}>
                  <Database className="w-4 h-4 mr-2" />
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
                    Active Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Coming soon: View and manage granted permissions
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Pending Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Coming soon: Review pending consent requests
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Privacy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Status overview
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Packages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Data packages
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <GrantAccessDialog open={grantAccessOpen} onOpenChange={setGrantAccessOpen} />
      <CreatePackageDialog open={createPackageOpen} onOpenChange={setCreatePackageOpen} />
      <PrivacySettingsDialog open={privacySettingsOpen} onOpenChange={setPrivacySettingsOpen} />
    </AppLayout>
  );
}, SCREEN_IDS.SHARING_OVERVIEW);
