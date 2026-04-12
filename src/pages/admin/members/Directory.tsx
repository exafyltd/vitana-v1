/**
 * Members > Directory tab
 *
 * Dense table of every Maxina tenant member with avatar, name, email,
 * active role, granted roles as colored pills, and last seen timestamp.
 * Search + role filter. Click row → member detail drawer (future).
 */

import { useState } from "react";
import { Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMembers, useRolesSummary } from "@/hooks/useAdminMembers";

const ROLE_VARIANT: Record<string, "active" | "warning" | "error" | "inactive" | "info"> = {
  admin: "error",
  staff: "warning",
  professional: "info",
  patient: "active",
  community: "inactive",
  developer: "info",
  infra: "warning",
};

export default function MembersDirectory() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const membersQuery = useMembers({ query: search, role: roleFilter });
  const rolesQuery = useRolesSummary();

  const members = membersQuery.data || [];
  const totalByRole = rolesQuery.data || [];

  function handleReset() {
    setSearch("");
    setRoleFilter("all");
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="members" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="👥"
          title="Members"
          description={`${members.length} member${members.length !== 1 ? "s" : ""} in this tenant`}
        />

        {/* Role summary strip */}
        {totalByRole.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {totalByRole.filter(r => r.user_count > 0).map((r) => (
              <AdminStatusBadge key={r.role} variant={ROLE_VARIANT[r.role] || "inactive"}>
                {r.role}: {r.user_count}
              </AdminStatusBadge>
            ))}
          </div>
        )}

        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by email..."
          filters={[
            {
              value: roleFilter,
              onChange: setRoleFilter,
              placeholder: "All roles",
              options: [
                { value: "all", label: "All roles" },
                { value: "community", label: "Community" },
                { value: "patient", label: "Patient" },
                { value: "professional", label: "Professional" },
                { value: "staff", label: "Staff" },
                { value: "admin", label: "Admin" },
              ],
            },
          ]}
          onReset={handleReset}
        />

        {membersQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading members...</p>
        )}

        {membersQuery.isError && (
          <p className="text-sm text-destructive py-8 text-center">
            {(membersQuery.error as Error)?.message || "Failed to load members"}
          </p>
        )}

        {!membersQuery.isLoading && members.length === 0 && (
          <AdminEmptyState
            title="No members found"
            description={search ? "Try a different search term or clear the filters." : "Invite your first member to get started."}
          />
        )}

        {members.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Active Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.user_id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.avatar_url || undefined} alt={m.display_name || m.email} />
                        <AvatarFallback className="text-xs">
                          {(m.display_name || m.email || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {m.display_name || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {m.email}
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge variant={ROLE_VARIANT[m.active_role || ""] || "inactive"}>
                        {m.active_role || "none"}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge variant={m.status === "Active" ? "active" : "inactive"}>
                        {m.status}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
