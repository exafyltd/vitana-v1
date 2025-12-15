/**
 * EARNING MOMENTUM PANEL
 * 
 * Premium business activation panel for the Snapshot tab.
 * Asymmetric two-card layout with primary/secondary emphasis.
 */

import { Button } from "@/components/ui/button";
import { CalendarPlus, Package } from "lucide-react";

interface BusinessStarterPanelProps {
  onCreateEvent: () => void;
  onBrowseEvents: () => void;
  onStartGuidedSetup: () => void;
}

export function BusinessStarterPanel({
  onCreateEvent,
  onBrowseEvents,
  onStartGuidedSetup,
}: BusinessStarterPanelProps) {
  return (
    <div className="bg-gradient-to-br from-card/90 via-card/70 to-accent/5 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Your earning momentum</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how you want to activate income in VITANA.
        </p>
      </div>

      {/* Asymmetric Two-Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Primary Card - Create Event (larger) */}
        <div className="md:col-span-7 bg-background/70 backdrop-blur-md rounded-xl border border-accent/20 p-6 space-y-4 hover:shadow-md hover:border-accent/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center">
              <CalendarPlus className="h-5 w-5 text-accent" />
            </div>
            <h4 className="font-medium text-foreground">Create your first event</h4>
          </div>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sell tickets directly and build your own revenue stream.
          </p>
          
          <Button 
            onClick={onCreateEvent}
            className="rounded-full px-6"
          >
            Create event
          </Button>
        </div>

        {/* Secondary Card - Browse Events (smaller) */}
        <div className="md:col-span-5 bg-background/70 backdrop-blur-md rounded-xl border border-border/20 p-6 space-y-4 hover:shadow-md hover:border-border/40 transition-all">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <h4 className="font-medium text-foreground">Add events to your inventory</h4>
          </div>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            Earn commissions by sharing curated experiences.
          </p>
          
          <Button 
            variant="outline"
            onClick={onBrowseEvents}
            className="rounded-full px-6"
          >
            Browse events
          </Button>
        </div>
      </div>

      {/* Guided Setup Link */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onStartGuidedSetup}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Prefer guidance? <span className="underline underline-offset-2">Start guided setup</span> →
        </button>
      </div>
    </div>
  );
}
