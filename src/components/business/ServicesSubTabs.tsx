import { useState } from "react";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { OrganizerEventsSection } from "./OrganizerEventsSection";
import { Button } from "@/components/ui/button";
import { Briefcase, Package, Plus, Loader2 } from "lucide-react";
import { CreatePackageDialog } from "@/components/sharing/CreatePackageDialog";
import { PackageCard } from "./PackageCard";
import { useBusinessPackages } from "@/hooks/useBusinessPackages";

interface ServicesSubTabsProps {
  onCreateService: () => void;
}

export function ServicesSubTabs({ onCreateService }: ServicesSubTabsProps) {
  const [showCreatePackage, setShowCreatePackage] = useState(false);
  const { packages, isLoading } = useBusinessPackages();

  return (
    <>
      <SplitBar defaultValue="services" className="w-full">
        <SplitBarList>
          <SplitBarTrigger value="services">💼 My Services</SplitBarTrigger>
          <SplitBarTrigger value="events">📅 My Events</SplitBarTrigger>
          <SplitBarTrigger value="packages">📦 Packages</SplitBarTrigger>
        </SplitBarList>

        <SplitBarContent value="services" className="space-y-4 mt-4">
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Services Yet</h3>
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
              <h3 className="text-lg font-semibold text-foreground mb-2">Create Session Packages</h3>
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
                  <PackageCard key={pkg.id} pkg={pkg} />
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
    </>
  );
}
