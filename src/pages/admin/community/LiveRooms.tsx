import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCommunityLiveRooms } from "@/hooks/useAdminCommunity";
import { t } from '@/lib/i18n-toast';

export default function LiveRooms() {
  const { data: rooms = [], isLoading, isError, error } = useCommunityLiveRooms();
  const columns = rooms.length > 0 ? Object.keys(rooms[0]).filter((k) => k !== "id") : [];

  return (
    <AppLayout>
      <AdminTabs sectionKey="community" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="🎙️"
          title={t('screens.admin.liveRooms')}
          description={`${rooms.length} live room${rooms.length !== 1 ? "s" : ""} found`}
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('screens.admin.loadingLiveRooms')}</p>
        ) : isError ? (
          <p className="text-sm text-destructive text-center py-8">{t('screens.admin.failedLoadLiveRoomsValue0', { value0: (error as Error)?.message || "Unknown error" })}</p>
        ) : rooms.length === 0 ? (
          <AdminEmptyState title={t('screens.admin.noLiveRoomsFound')} description="There are no live rooms yet." />
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
                {rooms.map((row: any, idx: number) => (
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
