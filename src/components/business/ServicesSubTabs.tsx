import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizerEventsSection } from "./OrganizerEventsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, Package, Plus } from "lucide-react";

interface ServicesSubTabsProps {
  onCreateService: () => void;
}

export function ServicesSubTabs({ onCreateService }: ServicesSubTabsProps) {
  return (
    <Tabs defaultValue="services" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="services">My Services</TabsTrigger>
        <TabsTrigger value="events">My Events</TabsTrigger>
        <TabsTrigger value="packages">Packages</TabsTrigger>
      </TabsList>

      <TabsContent value="services" className="space-y-4">
        {/* Placeholder for services - to be connected to actual services data */}
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
      </TabsContent>

      <TabsContent value="events">
        <OrganizerEventsSection />
      </TabsContent>

      <TabsContent value="packages" className="space-y-4">
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
      </TabsContent>
    </Tabs>
  );
}
