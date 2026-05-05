/**
 * Assistant > Tools tab
 *
 * Matrix showing which tools are available per surface.
 * Read-only v1 — shows current state, no toggling yet.
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Button } from "@/components/ui/button";
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

export default function AssistantTools() {
  const surfacesQuery = useAssistantSurfaces();
  const surfaces = surfacesQuery.data || [];

  function getTools(surface: any): string[] {
    const tools = surface.effective_config?.tools || surface.effective_config?.tool_overrides || [];
    if (Array.isArray(tools)) return tools.map((t: any) => typeof t === "string" ? t : t.name || "unknown");
    if (typeof tools === "object") return Object.keys(tools);
    return [];
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="assistant" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🔧"
          title={t('screens.admin.toolConfiguration')}
          description="Overview of available tools per assistant surface. Tool toggling will be available in a future release."
        />

        {surfacesQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingSurfaces')}</p>
        )}

        {surfaces.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('screens.admin.surface')}</TableHead>
                    <TableHead>{t('screens.admin.tools')}</TableHead>
                    <TableHead>{t('screens.admin.override')}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surfaces.map((surface) => {
                    const tools = getTools(surface);
                    return (
                      <TableRow key={surface.surface_key}>
                        <TableCell className="font-medium">
                          {SURFACE_LABELS[surface.surface_key] || surface.surface_key}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tools.length > 0 ? tools.map((t) => (
                              <AdminStatusBadge key={t} variant="info">{t}</AdminStatusBadge>
                            )) : (
                              <span className="text-xs text-muted-foreground">{t('screens.admin.noToolsConfigured')}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {surface.has_tenant_override ? (
                            <AdminStatusBadge variant="active">Custom</AdminStatusBadge>
                          ) : (
                            <AdminStatusBadge variant="inactive">{t('screens.admin.global')}</AdminStatusBadge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" disabled>
                            {t('screens.admin.configure')}
                          </Button>
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
