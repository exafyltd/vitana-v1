import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  Send,
  Wrench,
  Calendar,
  Clock,
  ShieldCheck,
  User,
} from "lucide-react";
import { t } from '@/lib/i18n-toast';

import { fmtDate, fmtDateTime } from '@/lib/locale-format';
interface UserDetail {
  user_id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  active_role?: string;
  tenant_id?: string;
  is_primary?: boolean;
  created_at?: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
}

interface UserDetailPanelProps {
  user: UserDetail;
  onInvite?: (userId: string) => void;
  onRepair?: (userId: string) => void;
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  try {
    return fmtDate(new Date(dateStr), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "Never";
  try {
    return fmtDateTime(new Date(dateStr), {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

const ROLE_VARIANT_MAP: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
  admin: "destructive",
  community: "default",
  provider: "secondary",
  patient: "outline",
};

function getRoleBadgeVariant(role?: string): "default" | "secondary" | "success" | "destructive" | "outline" {
  if (!role) return "outline";
  return ROLE_VARIANT_MAP[role.toLowerCase()] || "secondary";
}

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  valueClassName?: string;
}

function InfoRow({ icon: Icon, label, value, valueClassName }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium truncate ${valueClassName || ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function UserDetailPanel({ user, onInvite, onRepair }: UserDetailPanelProps) {
  const initials = getInitials(user.display_name, user.email);
  const emailVerified = !!user.email_confirmed_at;

  return (
    <div className="space-y-4">
      {/* User identity header */}
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14">
          {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.display_name || user.email} />}
          <AvatarFallback className="text-lg font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-semibold truncate text-foreground">
            {user.display_name || "No display name"}
          </h4>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          {user.active_role && (
            <Badge
              variant={getRoleBadgeVariant(user.active_role)}
              className="mt-1 capitalize"
            >
              {user.active_role}
            </Badge>
          )}
        </div>
      </div>

      {/* Info card */}
      <Card>
        <CardContent className="p-4">
          <div className="divide-y divide-border">
            <InfoRow
              icon={User}
              label="User ID"
              value={user.user_id}
              valueClassName="text-xs font-mono"
            />
            <InfoRow
              icon={Calendar}
              label="Joined"
              value={formatDate(user.created_at)}
            />
            <InfoRow
              icon={Clock}
              label="Last Sign-in"
              value={formatDateTime(user.last_sign_in_at)}
            />
            <InfoRow
              icon={Mail}
              label="Email Verified"
              value={
                emailVerified
                  ? `Yes - ${formatDate(user.email_confirmed_at)}`
                  : "No"
              }
              valueClassName={emailVerified ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}
            />
            <InfoRow
              icon={ShieldCheck}
              label="Primary Account"
              value={user.is_primary ? "Yes" : "No"}
            />
            {user.tenant_id && (
              <InfoRow
                icon={User}
                label="Tenant ID"
                value={user.tenant_id}
                valueClassName="text-xs font-mono"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {onInvite && (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => onInvite(user.user_id)}
          >
            <Send className="h-4 w-4" />
            {t('screens.admin.sendInvitation')}
          </Button>
        )}
        {onRepair && (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => onRepair(user.user_id)}
          >
            <Wrench className="h-4 w-4" />
            {t('screens.admin.repairProvisioning')}
          </Button>
        )}
      </div>
    </div>
  );
}
