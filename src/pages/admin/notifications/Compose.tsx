import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { NotificationComposer, ComposeFormData } from "@/components/admin/NotificationComposer";
import { NotificationPreview } from "@/components/admin/NotificationPreview";
import { useTenant } from "@/hooks/useTenant";
import { useComposeNotification } from "@/hooks/useAdminNotifications";
import { notify, notifyError, t } from '@/lib/i18n-toast';

export default function NotificationsCompose() {
  // VTID-04675: the admin's own tenant (was a hardcoded all-zero placeholder).
  const { activeTenantId } = useTenant();
  const DEFAULT_TENANT_ID = activeTenantId || "";
  const { toast } = useToast();
  const composeMutation = useComposeNotification();
  const [preview, setPreview] = useState({
    title: "",
    body: "",
    channel: "push_and_inapp",
    priority: "p1",
  });

  const handlePreviewUpdate = (data: ComposeFormData) => {
    setPreview({
      title: data.title,
      body: data.body,
      channel: data.channel,
      priority: data.priority,
    });
  };

  const handleSubmit = async (data: ComposeFormData) => {
    try {
      const payload: Parameters<typeof composeMutation.mutateAsync>[0] = {
        type: data.type,
        title: data.title,
        body: data.body,
        channel: data.channel,
        priority: data.priority,
      };

      if (data.recipients.mode === "all") {
        payload.send_to_all = true;
        payload.tenant_id = data.recipients.tenantId || DEFAULT_TENANT_ID;
      } else if (data.recipients.mode === "role") {
        payload.recipient_role = data.recipients.role;
        payload.tenant_id = data.recipients.tenantId || DEFAULT_TENANT_ID;
      } else if (data.recipients.mode === "individual") {
        payload.recipient_ids = data.recipients.userIds;
      }

      await composeMutation.mutateAsync(payload);

      notify('toasts.admin.notificationSent');
    } catch {
      notifyError('toasts.admin.sendFailed2');
    }
  };

  return (
    <AppLayout>
      <AdminTabs sectionKey="notifications" />
      <div className="p-6 space-y-6">
        <AdminHeader
          title={t('screens.admin.composeNotification')}
          description={t("notificationControls.pages.compose.description")}
        />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Compose form — 60% */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border bg-card p-6">
              <NotificationComposer
                onSubmit={handleSubmit}
                sending={composeMutation.isPending}
                tenantId={DEFAULT_TENANT_ID}
                onChange={handlePreviewUpdate}
              />
            </div>
          </div>

          {/* Preview — 40% */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border bg-card p-6 sticky top-6">
              <NotificationPreview
                title={preview.title}
                body={preview.body}
                channel={preview.channel}
                priority={preview.priority}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
