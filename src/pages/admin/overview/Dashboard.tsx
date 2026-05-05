/**
 * Overview > Dashboard — the supervisor's pulse on Maxina
 *
 * Answers three questions in five seconds:
 *   1. Is the community growing or shrinking?
 *   2. Are members engaged or drifting away?
 *   3. What needs my attention right now?
 *
 * Every number has a delta vs prior period. Every actionable count is a link.
 */

import { Link } from "react-router-dom";
import { Users, Mail, FileText, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOverviewSummary, useAtRiskMembers, useOverviewAlerts } from "@/hooks/useAdminOverview";
import { t } from '@/lib/i18n-toast';

function DeltaIndicator({ pct }: { pct: number }) {
  if (pct > 0) return <span className="inline-flex items-center text-xs text-green-600"><TrendingUp className="h-3 w-3 mr-0.5" />+{pct}%</span>;
  if (pct < 0) return <span className="inline-flex items-center text-xs text-red-600"><TrendingDown className="h-3 w-3 mr-0.5" />{pct}%</span>;
  return <span className="inline-flex items-center text-xs text-muted-foreground"><Minus className="h-3 w-3 mr-0.5" />0%</span>;
}

export default function OverviewDashboard() {
  const summaryQuery = useOverviewSummary();
  const atRiskQuery = useAtRiskMembers();
  const alertsQuery = useOverviewAlerts();

  const summary = summaryQuery.data;
  const atRisk = atRiskQuery.data || [];
  const alerts = alertsQuery.data || [];
  const kpi = summary?.kpi;
  const roles = summary?.role_distribution || {};
  const inbox = summary?.action_inbox;

  return (
    <AppLayout>
      <AdminTabs sectionKey="overview" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="📊"
          title={t('screens.admin.dashboard')}
          description="Real-time overview of your tenant community"
        />

        {summaryQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingDashboard')}</p>
        )}

        {summaryQuery.isError && (
          <p className="text-sm text-destructive py-8 text-center">
            {(summaryQuery.error as Error)?.message || "Failed to load dashboard"}
          </p>
        )}

        {kpi && (
          <>
            {/* Action Inbox strip */}
            {inbox && (inbox.pending_invitations > 0 || alerts.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {inbox.pending_invitations > 0 && (
                  <Link to="/admin/members/invitations">
                    <AdminStatusBadge variant="warning">{t('screens.admin.pending_invitationsPendingInvitationValue1', { pending_invitations: inbox.pending_invitations, value1: inbox.pending_invitations !== 1 ? "s" : "" })}</AdminStatusBadge>
                  </Link>
                )}
                {alerts.length > 0 && (
                  <Link to="/admin/alerts">
                    <AdminStatusBadge variant="error">{t('screens.admin.lengthAlertValue124h', { length: alerts.length, value1: alerts.length !== 1 ? "s" : "" })}
                    </AdminStatusBadge>
                  </Link>
                )}
              </div>
            )}

            {/* Top KPI cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link to="/admin/members/directory">
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.totalMembers')}</div>
                        <div className="text-3xl font-bold mt-1">{kpi.total_members}</div>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.newSignups7d')}</div>
                      <div className="text-3xl font-bold mt-1">{kpi.new_signups_7d}</div>
                      <DeltaIndicator pct={kpi.new_signups_delta_pct} />
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                </CardContent>
              </Card>

              <Link to="/admin/members/invitations">
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.pendingInvitations')}</div>
                        <div className="text-3xl font-bold mt-1">{kpi.pending_invitations}</div>
                      </div>
                      <Mail className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/admin/knowledge/documents">
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.kbDocuments')}</div>
                        <div className="text-3xl font-bold mt-1">{kpi.kb_documents}</div>
                      </div>
                      <FileText className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Role Distribution + At-Risk */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Role Distribution */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('screens.admin.roleDistribution')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(roles)
                      .filter(([_, count]) => count > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([role, count]) => (
                        <div key={role} className="flex items-center justify-between">
                          <AdminStatusBadge
                            variant={
                              role === "admin" ? "error" :
                              role === "staff" ? "warning" :
                              role === "professional" ? "info" :
                              role === "patient" ? "active" :
                              "inactive"
                            }
                          >
                            {role}
                          </AdminStatusBadge>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* At-Risk Cohort */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t('screens.admin.atriskMembers')}</CardTitle>
                    <AdminStatusBadge variant={atRisk.length > 0 ? "warning" : "active"}>{t('screens.admin.lengthMemberValue1', { length: atRisk.length, value1: atRisk.length !== 1 ? "s" : "" })}</AdminStatusBadge>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('screens.admin.noActivity14Days')}</p>
                </CardHeader>
                <CardContent>
                  {atRisk.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('screens.admin.noAtriskMembersEveryoneActive')}</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {atRisk.slice(0, 10).map((m) => (
                        <div key={m.user_id} className="flex items-center gap-2 text-sm">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={m.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {(m.display_name || m.email || "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium">{m.display_name || m.email}</div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(m.last_seen).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Alerts */}
            {alerts.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <CardTitle className="text-base">{t('screens.admin.recentAlerts24h')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {alerts.slice(0, 10).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                        <div>
                          <AdminStatusBadge variant="error">{alert.status}</AdminStatusBadge>
                          <span className="ml-2 text-muted-foreground">{alert.topic}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
