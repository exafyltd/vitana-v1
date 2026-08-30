/**
 * Admin Community → Reported Content (/admin/community/reported).
 *
 * VTID-03319 moderation center. Reads content_reports DIRECTLY from Supabase
 * (admin RLS) with a realtime subscription, shows the reported post + author,
 * and lets moderators ENFORCE in one place:
 *   - Remove post  → moderate_profile_post('removed') + resolve report
 *   - Ban author   → set_user_suspension() + resolve report
 *   - Dismiss      → mark the report dismissed
 * Plus a Bans view (active suspensions, with Unban) and an Audit view
 * (moderation_actions). admin-facing tooling.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Ban, ExternalLink, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifySuccess, notifyError, t } from "@/lib/i18n-toast";
import { fmtDate } from "@/lib/locale-format";

interface ReportRow {
  id: string;
  reporter_user_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: string;
  action_taken: string | null;
  created_at: string;
  authorId: string | null;
  authorName: string | null;
  postContent: string | null;
}
interface BanRow { id: string; user_id: string; reason: string | null; created_at: string; expires_at: string | null; name: string }
interface AuditRow { id: string; actor_id: string | null; action: string; target_type: string; target_id: string | null; reason: string | null; created_at: string }

const REPORT_VIEW = "reports", BANS_VIEW = "bans", AUDIT_VIEW = "audit";

export default function ReportedContentNew() {
  const navigate = useNavigate();
  const [view, setView] = useState<string>(REPORT_VIEW);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [bans, setBans] = useState<BanRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: reps } = await supabase
        .from("content_reports").select("*").order("created_at", { ascending: false });

      const postIds = [...new Set((reps || []).filter((r) => r.content_type === "profile_post").map((r) => r.content_id))];
      const postMap = new Map<string, { user_id: string; content: string | null }>();
      const authorIds = new Set<string>();
      if (postIds.length) {
        const { data: posts } = await supabase
          .from("profile_posts" as never).select("id, user_id, content").in("id", postIds);
        for (const p of (posts as unknown as { id: string; user_id: string; content: string | null }[]) || []) {
          postMap.set(p.id, { user_id: p.user_id, content: p.content });
          authorIds.add(p.user_id);
        }
      }
      const nameMap = new Map<string, string>();
      if (authorIds.size) {
        const { data: profs } = await supabase
          .from("global_community_profiles").select("user_id, display_name").in("user_id", [...authorIds]);
        for (const pr of profs || []) nameMap.set(pr.user_id, pr.display_name || "");
      }
      setReports((reps || []).map((r) => {
        const post = r.content_type === "profile_post" ? postMap.get(r.content_id) : undefined;
        return {
          ...r,
          authorId: post?.user_id ?? null,
          authorName: post ? (nameMap.get(post.user_id) || null) : null,
          postContent: post?.content ?? null,
        } as ReportRow;
      }));

      const { data: b, error: bansError } = await supabase.from("user_suspensions").select("*").order("created_at", { ascending: false });
      if (bansError) {
        console.error("[ReportedContentNew] Failed to load bans:", bansError);
        notifyError("screens.admin.modActionFailed");
      }
      const banIds = [...new Set((b || []).map((x) => x.user_id))];
      const banNames = new Map<string, string>();
      if (banIds.length) {
        const { data: bp } = await supabase.from("global_community_profiles").select("user_id, display_name").in("user_id", banIds);
        for (const x of bp || []) banNames.set(x.user_id, x.display_name || "");
      }
      setBans((b || []).map((x) => ({ ...x, name: banNames.get(x.user_id) || x.user_id })) as BanRow[]);

      const { data: a } = await supabase
        .from("moderation_actions").select("*").order("created_at", { ascending: false }).limit(100);
      setAudit((a || []) as AuditRow[]);
    } catch {
      notifyError("screens.admin.modActionFailed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-mod-center")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_reports" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_suspensions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const resolveReport = async (id: string, action: "removed" | "no_action") => {
    const { data: { user } } = await supabase.auth.getUser();
    return supabase.from("content_reports").update({
      status: action === "no_action" ? "dismissed" : "resolved",
      action_taken: action,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
  };

  const removePost = async (r: ReportRow) => {
    const { error } = await supabase.rpc("moderate_profile_post", { p_post_id: r.content_id, p_status: "removed", p_reason: `report:${r.reason}` });
    if (error) return notifyError("screens.admin.modActionFailed");
    await resolveReport(r.id, "removed");
    notifySuccess("screens.admin.modPostRemoved");
    load();
  };
  const banAuthor = async (r: ReportRow) => {
    if (!r.authorId) return notifyError("screens.admin.modActionFailed");
    const { error } = await supabase.rpc("set_user_suspension", { p_user_id: r.authorId, p_reason: `report:${r.reason}` });
    if (error) return notifyError("screens.admin.modActionFailed");
    await resolveReport(r.id, "removed");
    notifySuccess("screens.admin.modAuthorBanned");
    load();
  };
  const dismiss = async (r: ReportRow) => {
    const { error } = await resolveReport(r.id, "no_action");
    if (error) return notifyError("screens.admin.modActionFailed");
    notifySuccess("screens.admin.modReportDismissed");
    load();
  };
  const unban = async (b: BanRow) => {
    const { error } = await supabase.from("user_suspensions").delete().eq("id", b.id);
    if (error) return notifyError("screens.admin.modActionFailed");
    notifySuccess("screens.admin.modUserUnbanned");
    load();
  };

  const filteredReports = reports.filter((r) => (statusFilter === "all" ? true : r.status === statusFilter));
  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const statusVariant = (s: string) => (s === "pending" ? "warning" : s === "resolved" ? "active" : "inactive") as "warning" | "active" | "inactive";

  return (
    <AppLayout>
      <AdminTabs sectionKey="community" />
      <div className="p-6 space-y-6">
        <AdminHeader emoji="🚩" title={t("screens.admin.reportedContent")} description={t("screens.admin.modCenterDesc")} />

        {/* view switch */}
        <div className="flex flex-wrap gap-2">
          {[
            { k: REPORT_VIEW, label: `${t("screens.admin.modReports")}${pendingCount ? ` (${pendingCount})` : ""}` },
            { k: BANS_VIEW, label: `${t("screens.admin.modBans")}${bans.length ? ` (${bans.length})` : ""}` },
            { k: AUDIT_VIEW, label: t("screens.admin.modAudit") },
          ].map((v) => (
            <Button key={v.k} size="sm" variant={view === v.k ? "default" : "outline"} onClick={() => setView(v.k)}>{v.label}</Button>
          ))}
        </div>

        {view === REPORT_VIEW && (
          <>
            <div className="flex flex-wrap gap-2">
              {[["all", t("screens.admin.allReports")], ["pending", t("screens.admin.pending")], ["resolved", t("screens.admin.resolved")], ["dismissed", t("screens.admin.dismissed")]].map(([k, label]) => (
                <Button key={k} size="sm" variant={statusFilter === k ? "default" : "outline"} onClick={() => setStatusFilter(k)}>{label}</Button>
              ))}
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("screens.admin.loadingReports")}</p>
            ) : filteredReports.length === 0 ? (
              <AdminEmptyState title={t("screens.admin.noReportsFound")} description={t("screens.admin.modNoReportsDesc")} />
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("screens.admin.reason")}</TableHead>
                      <TableHead>{t("screens.admin.modAuthor")}</TableHead>
                      <TableHead>{t("screens.admin.modPost")}</TableHead>
                      <TableHead>{t("screens.admin.status")}</TableHead>
                      <TableHead>{t("screens.admin.date")}</TableHead>
                      <TableHead>{t("screens.admin.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell><Badge variant="destructive" className="capitalize">{r.reason}</Badge></TableCell>
                        <TableCell className="text-sm">{r.authorName || (r.content_type === "profile_post" ? t("screens.admin.modContentUnavailable") : r.content_type)}</TableCell>
                        <TableCell className="max-w-xs"><p className="text-sm truncate text-muted-foreground">{r.postContent || r.description || "—"}</p></TableCell>
                        <TableCell><AdminStatusBadge variant={statusVariant(r.status)}>{r.status}</AdminStatusBadge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(new Date(r.created_at))}</TableCell>
                        <TableCell>
                          {r.status === "pending" || r.status === "reviewing" ? (
                            <div className="flex flex-wrap gap-2">
                              {r.authorId && (
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/u/${r.authorId}`)}><ExternalLink className="h-4 w-4 mr-1" />{t("screens.admin.modView")}</Button>
                              )}
                              {r.content_type === "profile_post" && (
                                <Button size="sm" variant="destructive" onClick={() => removePost(r)}><Trash2 className="h-4 w-4 mr-1" />{t("screens.admin.modRemovePost")}</Button>
                              )}
                              {r.authorId && (
                                <Button size="sm" variant="outline" className="text-destructive" onClick={() => banAuthor(r)}><Ban className="h-4 w-4 mr-1" />{t("screens.admin.modBanAuthor")}</Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => dismiss(r)}>{t("screens.admin.dismiss")}</Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">{r.action_taken || "—"}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </>
        )}

        {view === BANS_VIEW && (
          loading ? <p className="text-sm text-muted-foreground text-center py-8">{t("screens.admin.loadingReports")}</p>
          : bans.length === 0 ? <AdminEmptyState title={t("screens.admin.modNoBans")} description={t("screens.admin.modNoBansDesc")} />
          : (
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t("screens.admin.modAuthor")}</TableHead>
                  <TableHead>{t("screens.admin.reason")}</TableHead>
                  <TableHead>{t("screens.admin.date")}</TableHead>
                  <TableHead>{t("screens.admin.actions")}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {bans.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-sm">{b.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.reason || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(new Date(b.created_at))}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => unban(b)}><ShieldOff className="h-4 w-4 mr-1" />{t("screens.admin.modUnban")}</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )
        )}

        {view === AUDIT_VIEW && (
          loading ? <p className="text-sm text-muted-foreground text-center py-8">{t("screens.admin.loadingReports")}</p>
          : audit.length === 0 ? <AdminEmptyState title={t("screens.admin.modNoAudit")} description={t("screens.admin.modNoAuditDesc")} />
          : (
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t("screens.admin.modAction")}</TableHead>
                  <TableHead>{t("screens.admin.modTarget")}</TableHead>
                  <TableHead>{t("screens.admin.reason")}</TableHead>
                  <TableHead>{t("screens.admin.date")}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {audit.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell><Badge variant="outline" className="capitalize">{a.action.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">{a.target_type}: {a.target_id}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.reason || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(new Date(a.created_at))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )
        )}
      </div>
    </AppLayout>
  );
}
