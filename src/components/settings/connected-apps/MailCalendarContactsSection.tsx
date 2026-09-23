/**
 * VTID-04406 — the mobile Connected Apps section wrapper: the same
 * collapsible header as the other sections (emoji, title, n/9 on), with the
 * hub-driven panel inside. Opens by itself when the member lands here from a
 * provider's consent screen, so they see the app they just turned on.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { fetchConnectedApps, readGrantReturn } from "@/lib/connected-apps-client";
import { CONNECTED_APPS_QUERY_KEY, MailCalendarContactsPanel } from "./MailCalendarContactsPanel";

export function MailCalendarContactsSection({ title, defaultExpanded = false }: { title: string; defaultExpanded?: boolean }) {
  const [open, setOpen] = useState(() => defaultExpanded || !!readGrantReturn(window.location.search).app);
  const apps = useQuery({ queryKey: CONNECTED_APPS_QUERY_KEY, queryFn: fetchConnectedApps, staleTime: 15_000 });
  const on = (apps.data ?? []).filter((a) => a.status === "on").length;
  const total = apps.data?.length ?? 9;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-card/60 p-3 transition-transform active:scale-[0.99]"
        data-testid="mailhub-section-trigger"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>📅</span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={on > 0 ? "default" : "secondary"} className="text-xs">
            {on}/{total}
          </Badge>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <MailCalendarContactsPanel />
      </CollapsibleContent>
    </Collapsible>
  );
}
