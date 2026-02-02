import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { MobileIntegrationRow } from "./MobileIntegrationRow";
import type { Integration } from "./integrationData";

interface MobileIntegrationSectionProps {
  title: string;
  emoji: string;
  integrations: Integration[];
  onSelect: (app: Integration) => void;
  defaultExpanded?: boolean;
}

export function MobileIntegrationSection({
  title,
  emoji,
  integrations,
  onSelect,
  defaultExpanded = true,
}: MobileIntegrationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-card/60 rounded-xl border border-border/50 active:scale-[0.99] transition-transform">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className="font-medium text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={connectedCount > 0 ? "default" : "secondary"}
            className="text-xs"
          >
            {connectedCount}/{integrations.length}
          </Badge>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2 mt-2">
        {integrations.map((app) => (
          <MobileIntegrationRow
            key={app.id}
            integration={app}
            onTap={() => onSelect(app)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
