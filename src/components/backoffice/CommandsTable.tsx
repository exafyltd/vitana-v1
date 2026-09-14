/** VTID-03849 — command rows from GET /api/v1/backoffice/commands (Activity, My Requests, Command Receipts). */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChannelBadge, CommandStatusBadge, TierBadge } from "@/components/backoffice/CommandBadges";
import ReceiptDetail from "@/components/backoffice/ReceiptDetail";
import type { BackOfficeCommand } from "@/hooks/useBackOfficeCommands";
import { shortId } from "@/hooks/useBackOfficeCommands";
import { fmtDateTime } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

interface CommandsTableProps {
  commands: BackOfficeCommand[];
  showReceipt?: boolean;
  showRequester?: boolean;
  meUserId?: string | null;
}

export default function CommandsTable({ commands, showReceipt = false, showRequester = true, meUserId }: CommandsTableProps) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("screens.backoffice.commands.when")}</TableHead>
            <TableHead>{t("screens.backoffice.commands.command")}</TableHead>
            <TableHead>{t("screens.backoffice.commands.tier")}</TableHead>
            <TableHead>{t("screens.backoffice.commands.status")}</TableHead>
            <TableHead>{t("screens.backoffice.commands.channel")}</TableHead>
            {showRequester && <TableHead>{t("screens.backoffice.commands.requester")}</TableHead>}
            <TableHead>{showReceipt ? t("screens.backoffice.commands.receipt") : t("screens.backoffice.commands.reason")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commands.map((c) => (
            <TableRow key={c.command_id}>
              <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(c.created_at, { dateStyle: "medium", timeStyle: "short" })}</TableCell>
              <TableCell>
                <div className="font-mono text-xs" dir="ltr">{c.type}</div>
                <div className="font-mono text-[11px] text-muted-foreground" dir="ltr">{shortId(c.command_id)}</div>
              </TableCell>
              <TableCell><TierBadge tier={c.tier} /></TableCell>
              <TableCell><CommandStatusBadge status={c.status} /></TableCell>
              <TableCell><ChannelBadge channel={c.channel} /></TableCell>
              {showRequester && (
                <TableCell className="font-mono text-xs" dir="ltr">
                  {meUserId && c.requester_id === meUserId ? t("screens.backoffice.commands.you") : shortId(c.requester_id)}
                </TableCell>
              )}
              <TableCell>
                {showReceipt ? (
                  <ReceiptDetail receipt={c.receipt} />
                ) : (
                  <span className="text-xs text-muted-foreground font-mono" dir="ltr">{c.reason ?? "—"}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
