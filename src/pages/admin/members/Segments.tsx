/**
 * Members > Segments tab (thin v1)
 *
 * Placeholder cohort builder. Shows a few hardcoded example segments
 * with counts from a future aggregation endpoint. Wave-1 priority is
 * Directory + Invitations + Roles & Access; Segments ships as a
 * cosmetic placeholder with hardcoded examples.
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Card, CardContent } from "@/components/ui/card";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

const EXAMPLE_SEGMENTS = [
  { name: "Active last 7 days", description: "Members with at least one session in the last 7 days", count: null },
  { name: "At-risk (no activity 14d)", description: "Previously active members with no session in 14 days", count: null },
  { name: "New signups (7d)", description: "Members who joined in the last 7 days", count: null },
  { name: "Admin team", description: "Members with admin role", count: null },
];

export default function MembersSegments() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="members" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="📊"
          title="Segments"
          description="Define cohorts of members for targeted notifications and autopilot actions"
        />

        <div className="grid gap-3 md:grid-cols-2">
          {EXAMPLE_SEGMENTS.map((seg) => (
            <Card key={seg.name}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium">{seg.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{seg.description}</div>
                  </div>
                  <AdminStatusBadge variant="inactive">
                    {seg.count !== null ? seg.count : "—"}
                  </AdminStatusBadge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <AdminEmptyState
          title="Segment builder coming soon"
          description="Custom segments with saved queries will ship in a future update. The examples above show the structure."
        />
      </div>
    </AppLayout>
  );
}
