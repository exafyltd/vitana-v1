/**
 * Assistant > Sessions tab
 *
 * Lists recent ORB voice sessions for this tenant.
 * Read-only v1 using the voice-lab sessions endpoint.
 */

import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminFetch } from "@/lib/admin-api";

interface Session {
  session_id: string;
  user_id?: string;
  user_email?: string;
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  status: string;
}

export default function AssistantSessions() {
  const sessionsQuery = useQuery({
    queryKey: ["admin-voice-sessions"],
    queryFn: async () => {
      const json = await adminFetch("/api/v1/voice-lab/live/sessions");
      return (json.sessions || json) as Session[];
    },
  });

  const sessions = sessionsQuery.data || [];

  function formatDuration(ms?: number): string {
    if (!ms) return "—";
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }

  function statusVariant(status: string) {
    if (status === "active" || status === "connected") return "active" as const;
    if (status === "error" || status === "failed") return "error" as const;
    return "inactive" as const;
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="assistant" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="📡"
          title="Voice Sessions"
          description="Recent ORB voice sessions for your tenant. View session details and diagnostics."
        />

        {sessionsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading sessions...</p>
        )}

        {!sessionsQuery.isLoading && sessions.length === 0 && (
          <AdminEmptyState
            title="No sessions found"
            description="Voice sessions will appear here once users start using the ORB."
          />
        )}

        {sessions.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.session_id}>
                      <TableCell>
                        <code className="text-xs">{s.session_id.slice(0, 12)}...</code>
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.user_email || s.user_id?.slice(0, 8) || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(s.started_at).toLocaleString("de-DE", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-sm">{formatDuration(s.duration_ms)}</TableCell>
                      <TableCell>
                        <AdminStatusBadge variant={statusVariant(s.status)}>
                          {s.status}
                        </AdminStatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
