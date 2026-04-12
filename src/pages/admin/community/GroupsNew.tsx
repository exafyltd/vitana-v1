import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCommunityGroups } from "@/hooks/useAdminCommunity";

export default function GroupsNew() {
  const { data: groups = [], isLoading } = useCommunityGroups();
  const columns = groups.length > 0 ? Object.keys(groups[0]).filter((k) => k !== "id") : [];

  return (
    <AppLayout>
      <AdminTabs sectionKey="community" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="👥"
          title="Groups"
          description={`${groups.length} group${groups.length !== 1 ? "s" : ""} found`}
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading groups...</p>
        ) : groups.length === 0 ? (
          <AdminEmptyState title="No groups found" description="There are no community groups yet." />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col} className="capitalize">
                      {col.replace(/_/g, " ")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((row: any, idx: number) => (
                  <TableRow key={row.id ?? idx}>
                    {columns.map((col) => (
                      <TableCell key={col} className="text-sm max-w-[200px] truncate">
                        {row[col] == null ? "--" : typeof row[col] === "object" ? JSON.stringify(row[col]) : String(row[col])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
