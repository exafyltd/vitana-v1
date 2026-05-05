import { Event } from "@/types/command-hub";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface EventDetailDrawerProps {
  event: Event;
  open: boolean;
  onClose: () => void;
}

export function EventDetailDrawer({ event, open, onClose }: EventDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {t('screens.dev.eventDetails')}
            <Badge variant={getBadgeVariant(event.status)}>
              {event.status.toUpperCase()}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            {new Date(event.ts).toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-1">{t('screens.dev.title')}</h4>
            <p className="text-sm">{event.title}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-1">{t('screens.dev.kind')}</h4>
            <p className="text-sm font-mono text-xs bg-muted px-2 py-1 rounded">
              {event.kind}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-1">{t('screens.dev.layer')}</h4>
              <p className="text-sm">{event.layer}</p>
            </div>
            {event.module && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Module</h4>
                <p className="text-sm">{event.module}</p>
              </div>
            )}
          </div>

          {event.vtid && (
            <div>
              <h4 className="text-sm font-semibold mb-1">VTID</h4>
              <p className="text-sm font-mono text-xs bg-muted px-2 py-1 rounded">
                {event.vtid}
              </p>
            </div>
          )}

          {event.data && Object.keys(event.data).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-1">{t('screens.dev.data')}</h4>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[200px]">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          )}

          {event.links && event.links.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Links</h4>
              <div className="space-y-2">
                {event.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold mb-1">{t('screens.dev.eventId')}</h4>
            <p className="text-xs font-mono text-muted-foreground">
              {event.id}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function getBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "success":
      return "default";
    case "error":
      return "destructive";
    case "warn":
      return "outline";
    default:
      return "secondary";
  }
}
