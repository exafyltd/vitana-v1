/**
 * Assistant > Routing tab
 *
 * Read-only view of model routing per surface.
 * Shows which LLM model is configured for each surface.
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAssistantSurfaces } from "@/hooks/useAdminAssistant";
import { t } from '@/lib/i18n-toast';

const SURFACE_LABELS: Record<string, string> = {
  voice_live: "Voice Live (ORB)",
  text_chat: "Text Chat",
  unified_conversation: "Unified Conversation",
  operator_chat: "Operator Chat",
  dev_orb: "Dev ORB",
  developer_assistant: "Developer Assistant",
};

export default function AssistantRouting() {
  const surfacesQuery = useAssistantSurfaces();
  const surfaces = surfacesQuery.data || [];

  function getModel(surface: any): string {
    return (
      surface.effective_config?.model ||
      surface.effective_config?.model_id ||
      surface.effective_config?.llm_model ||
      "Not configured"
    );
  }

  function getOverrideModel(surface: any): string | null {
    if (!surface.tenant_override) return null;
    return (
      surface.tenant_override.model ||
      surface.tenant_override.model_id ||
      surface.tenant_override.llm_model ||
      null
    );
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="assistant" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🔀"
          title={t('screens.admin.modelRouting')}
          description="View which LLM model handles each assistant surface. Override support coming soon."
        />

        {surfacesQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingRoutingConfig')}</p>
        )}

        {surfaces.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('screens.admin.surface')}</TableHead>
                    <TableHead>{t('screens.admin.effectiveModel')}</TableHead>
                    <TableHead>{t('screens.admin.override')}</TableHead>
                    <TableHead>{t('screens.admin.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surfaces.map((surface) => {
                    const model = getModel(surface);
                    const override = getOverrideModel(surface);
                    return (
                      <TableRow key={surface.surface_key}>
                        <TableCell className="font-medium">
                          {SURFACE_LABELS[surface.surface_key] || surface.surface_key}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">{model}</code>
                        </TableCell>
                        <TableCell>
                          {override ? (
                            <code className="text-xs bg-muted px-2 py-0.5 rounded">{override}</code>
                          ) : (
                            <span className="text-xs text-muted-foreground">{t('screens.admin.none')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {surface.has_tenant_override ? (
                            <AdminStatusBadge variant="active">Custom</AdminStatusBadge>
                          ) : (
                            <AdminStatusBadge variant="inactive">{t('screens.admin.global')}</AdminStatusBadge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
