/** VTID-03849 — tier / status / channel pills shared by every BackOffice table. */
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import type { ApprovalStatus, CommandStatus, CommandTier } from "@/hooks/useBackOfficeCommands";
import { t } from "@/lib/i18n-toast";

const TIER_VARIANT: Record<CommandTier, "inactive" | "info" | "warning" | "error"> = {
  read: "inactive",
  draft: "info",
  commit: "warning",
  high: "error",
};

export function TierBadge({ tier }: { tier: CommandTier | string }) {
  const variant = TIER_VARIANT[tier as CommandTier] ?? "inactive";
  return <AdminStatusBadge variant={variant} className="whitespace-nowrap">{t(`screens.backoffice.tiers.${tier}`)}</AdminStatusBadge>;
}

const COMMAND_STATUS_VARIANT: Record<CommandStatus, "active" | "error" | "warning" | "inactive"> = {
  executed: "active",
  failed: "error",
  awaiting_approval: "warning",
  rejected: "inactive",
};

export function CommandStatusBadge({ status }: { status: CommandStatus | string }) {
  const variant = COMMAND_STATUS_VARIANT[status as CommandStatus] ?? "inactive";
  return <AdminStatusBadge variant={variant} className="whitespace-nowrap">{t(`screens.backoffice.commandStatus.${status}`)}</AdminStatusBadge>;
}

const APPROVAL_STATUS_VARIANT: Record<ApprovalStatus, "warning" | "active" | "inactive"> = {
  pending: "warning",
  approved: "active",
  rejected: "inactive",
};

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus | string }) {
  const variant = APPROVAL_STATUS_VARIANT[status as ApprovalStatus] ?? "inactive";
  return <AdminStatusBadge variant={variant} className="whitespace-nowrap">{t(`screens.backoffice.approvalStatus.${status}`)}</AdminStatusBadge>;
}

export function ChannelBadge({ channel }: { channel: string | null | undefined }) {
  if (!channel) return <span className="text-xs text-muted-foreground">—</span>;
  return <AdminStatusBadge variant="inactive">{t(`screens.backoffice.channels.${channel}`)}</AdminStatusBadge>;
}
