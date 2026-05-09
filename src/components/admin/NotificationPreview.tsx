import { Bell, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from '@/lib/i18n-toast';

interface NotificationPreviewProps {
  title: string;
  body: string;
  channel: string;
  priority: string;
}

export function NotificationPreview({
  title,
  body,
  channel,
  priority,
}: NotificationPreviewProps) {
  const showPush = channel === "push" || channel === "push_and_inapp";
  const showInApp = channel === "inapp" || channel === "push_and_inapp";

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">{t('screens.admin.livePreview')}</h3>

      {/* Push notification mockup */}
      {showPush && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4" />
              {t('screens.admin.pushNotification')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="rounded-xl bg-muted/50 border p-4 space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center">
                  <Bell className="h-3 w-3 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Vitana
                </span>
                <span className="ml-auto text-xs text-muted-foreground">{t('screens.admin.now')}</span>
              </div>
              <p className="text-sm font-semibold leading-tight">
                {title || "Notification Title"}
              </p>
              <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                {body || "Notification body text will appear here..."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* In-app notification mockup */}
      {showInApp && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4" />
              {t('screens.admin.inappCard')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="rounded-lg border p-3 space-y-1 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {title || "Notification Title"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">
                    {body || "Notification body text will appear here..."}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{t('screens.admin.justNow')}</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Silent notification info */}
      {channel === "silent" && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            {t('screens.admin.silentNotificationsWrittenDatabaseButNot')}
          </CardContent>
        </Card>
      )}

      {/* Meta info */}
      <div className="rounded-lg border p-3 space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>{t('screens.admin.channel')}</span>
          <span className="font-medium text-foreground">{channel || "push_and_inapp"}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('screens.admin.priority')}</span>
          <span className="font-medium text-foreground">{priority || "p1"}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('screens.admin.dndBypass')}</span>
          <span className="font-medium text-foreground">
            {priority === "p0" ? "Yes (Critical)" : "No"}
          </span>
        </div>
      </div>
    </div>
  );
}
