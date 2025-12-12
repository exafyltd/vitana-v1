import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { OrganizerEventsSection } from "./OrganizerEventsSection";
import { Button } from "@/components/ui/button";
import { Briefcase, Package, Plus } from "lucide-react";

interface ServicesSubTabsProps {
  onCreateService: () => void;
}

export function ServicesSubTabs({ onCreateService }: ServicesSubTabsProps) {
  return (
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
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Create Session Packages</h3>
          <p className="text-muted-foreground mb-4">
            Combine multiple sessions into bundles or monthly plans.
          </p>
          <Button variant="outline" className="gap-2" disabled>
            <Plus className="w-4 h-4" />
            Create Package
            <span className="text-xs text-muted-foreground">(Coming Soon)</span>
          </Button>
        </div>
      </SplitBarContent>
    </SplitBar>
  );
}
