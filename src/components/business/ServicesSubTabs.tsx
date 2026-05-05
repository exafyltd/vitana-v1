import { useState } from "react";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { OrganizerEventsSection } from "./OrganizerEventsSection";
import { Button } from "@/components/ui/button";
import { Briefcase, Package, Plus, Loader2 } from "lucide-react";
import { CreatePackageDialog } from "@/components/sharing/CreatePackageDialog";
import { EditPackageDialog } from "@/components/sharing/EditPackageDialog";
import { PackageCard } from "./PackageCard";
import { useBusinessPackages, BusinessPackage, PackageItem } from "@/hooks/useBusinessPackages";
import { t } from '@/lib/i18n-toast';

interface ServicesSubTabsProps {
  onCreateService: () => void;
}

export function ServicesSubTabs({ onCreateService }: ServicesSubTabsProps) {
  const [showCreatePackage, setShowCreatePackage] = useState(false);
  const [editingPackage, setEditingPackage] = useState<BusinessPackage | null>(null);
  const { packages, isLoading, updatePackageWithItems, isUpdating } = useBusinessPackages();

  const handleEditPackage = (pkg: BusinessPackage) => {
    setEditingPackage(pkg);
  };

  const handleSavePackage = (packageId: string, data: Partial<BusinessPackage>, items: PackageItem[]) => {
    updatePackageWithItems({ id: packageId, ...data, items });
    setEditingPackage(null);
  };

  return (
    <>
      <SplitBar defaultValue="services" className="w-full">
        <SplitBarList>
          <SplitBarTrigger value="services">{t('screens.business.myServices')}</SplitBarTrigger>
          <SplitBarTrigger value="events">{t('screens.business.myEvents')}</SplitBarTrigger>
          <SplitBarTrigger value="packages">{t('screens.business.packages')}</SplitBarTrigger>
        </SplitBarList>

        <SplitBarContent value="services" className="space-y-4 mt-4">
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">{t('screens.business.noServicesYet')}</h3>
            <p className="text-muted-foreground mb-4">
              Create coaching sessions, consultations, or other services to offer.
            </p>
            <Button onClick={onCreateService} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Service
            </Button>
          </div>
        </SplitBarContent>

        <SplitBarContent value="events" className="mt-4">
          <OrganizerEventsSection />
        </SplitBarContent>

        <SplitBarContent value="packages" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('screens.business.createSessionPackages')}</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Bundle multiple sessions, events, or perks into packages that increase commitment and lifetime value.
              </p>
              <Button onClick={() => setShowCreatePackage(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Package
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {packages.length} {packages.length === 1 ? 'package' : 'packages'}
                </p>
                <Button onClick={() => setShowCreatePackage(true)} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Package
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {packages.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} onEdit={handleEditPackage} />
                ))}
              </div>
            </>
          )}
        </SplitBarContent>
      </SplitBar>

      <CreatePackageDialog 
        open={showCreatePackage} 
        onOpenChange={setShowCreatePackage} 
      />

      {editingPackage && (
        <EditPackageDialog
          open={!!editingPackage}
          onOpenChange={(open) => !open && setEditingPackage(null)}
          package_={editingPackage}
          onSave={handleSavePackage}
          isSaving={isUpdating}
        />
      )}
    </>
  );
}
