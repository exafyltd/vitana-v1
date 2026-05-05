import { useState } from "react";
import { Users, UserCheck, Shield, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { t } from '@/lib/i18n-toast';

export type RecipientMode = "all" | "role" | "individual";

export interface RecipientSelection {
  mode: RecipientMode;
  role?: string;
  userIds?: string[];
  tenantId?: string;
}

interface RecipientSelectorProps {
  value: RecipientSelection;
  onChange: (selection: RecipientSelection) => void;
  tenantId: string;
}

const ROLE_OPTIONS = [
  { value: "community", label: "Community" },
  { value: "patient", label: "Patient" },
  { value: "professional", label: "Professional" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

export function RecipientSelector({ value, onChange, tenantId }: RecipientSelectorProps) {
  const [search, setSearch] = useState("");
  const { users, isLoading } = useAdminUsers();

  const filteredUsers = users.filter((u) => {
    if (!search) return false; // Only show when searching
    const term = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(term) ||
      u.display_name?.toLowerCase().includes(term)
    );
  });

  const handleModeChange = (mode: RecipientMode) => {
    onChange({
      mode,
      tenantId,
      role: mode === "role" ? "community" : undefined,
      userIds: mode === "individual" ? value.userIds || [] : undefined,
    });
  };

  const toggleUser = (userId: string) => {
    const current = value.userIds || [];
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    onChange({ ...value, userIds: next });
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Recipients</label>

      {/* Mode selector */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={value.mode === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => handleModeChange("all")}
        >
          <Users className="mr-1 h-4 w-4" />
          All Users
        </Button>
        <Button
          type="button"
          variant={value.mode === "role" ? "default" : "outline"}
          size="sm"
          onClick={() => handleModeChange("role")}
        >
          <Shield className="mr-1 h-4 w-4" />
          By Role
        </Button>
        <Button
          type="button"
          variant={value.mode === "individual" ? "default" : "outline"}
          size="sm"
          onClick={() => handleModeChange("individual")}
        >
          <UserCheck className="mr-1 h-4 w-4" />
          Individual
        </Button>
      </div>

      {/* Role selector */}
      {value.mode === "role" && (
        <Select
          value={value.role || "community"}
          onValueChange={(role) => onChange({ ...value, role })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('screens.admin.selectRole')} />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Individual user search */}
      {value.mode === "individual" && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('screens.admin.searchUsersByNameEmail')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected users */}
          {(value.userIds?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {value.userIds!.map((uid) => {
                const user = users.find((u) => u.user_id === uid);
                return (
                  <Badge
                    key={uid}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => toggleUser(uid)}
                  >
                    {user?.display_name || user?.email || uid.slice(0, 8)}
                    <span className="ml-1 text-xs">x</span>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Search results */}
          {search && (
            <div className="max-h-48 overflow-y-auto rounded-md border">
              {isLoading ? (
                <div className="p-3 text-sm text-muted-foreground">{t('screens.admin.loading')}</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">{t('screens.admin.noUsersFound')}</div>
              ) : (
                filteredUsers.slice(0, 20).map((user) => {
                  const userId = user.user_id;
                  const isSelected = value.userIds?.includes(userId);
                  return (
                    <button
                      key={userId}
                      type="button"
                      onClick={() => toggleUser(userId)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted ${
                        isSelected ? "bg-muted/50" : ""
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <span className="font-medium">{user.display_name || "No name"}</span>
                        <span className="ml-2 text-muted-foreground">{user.email}</span>
                      </div>
                      {isSelected && <UserCheck className="h-4 w-4 text-green-500" />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <p className="text-xs text-muted-foreground">
        {value.mode === "all" && "Notification will be sent to all users in the tenant."}
        {value.mode === "role" && `Notification will be sent to all ${value.role} users.`}
        {value.mode === "individual" &&
          `${value.userIds?.length || 0} user(s) selected.`}
      </p>
    </div>
  );
}
