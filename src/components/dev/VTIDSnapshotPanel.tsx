import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDevVTID } from "@/hooks/dev/useDevVTID";
import { SoftWarningBanner } from "./SoftWarningBanner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { t } from '@/lib/i18n-toast';

export function VTIDSnapshotPanel() {
  const { vtids, error, available, isLoading, refetch } = useDevVTID();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('screens.dev.vtidSnapshot')}</CardTitle>
            <CardDescription>{t('screens.dev.recentVtidAssignmentsAutorefresh30s')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('screens.dev.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!available && error && (
          <SoftWarningBanner
            message="Awaiting VTID endpoint activation"
          />
        )}

        {isLoading && vtids.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : vtids.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('screens.dev.noVtidRecordsAvailable')}</p>
            <p className="text-sm mt-2">{t('screens.dev.vtidAssignmentsWillAppearHereOnce')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2 font-medium">{t('screens.dev.vtidLabel')}</th>
                  <th className="pb-2 font-medium">{t('screens.dev.color')}</th>
                  <th className="pb-2 font-medium">{t('screens.dev.layer')}</th>
                  <th className="pb-2 font-medium">{t('screens.dev.module')}</th>
                  <th className="pb-2 font-medium">{t('screens.dev.number')}</th>
                  <th className="pb-2 font-medium">{t('screens.dev.created')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vtids.map((vtid) => (
                  <tr key={`${vtid.label}-${vtid.global_number}`} className="hover:bg-accent/50">
                    <td className="py-2 font-medium">{vtid.label}</td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-xs">
                        {vtid.color}
                      </Badge>
                    </td>
                    <td className="py-2 text-muted-foreground">{vtid.layer}</td>
                    <td className="py-2 text-muted-foreground">{vtid.module}</td>
                    <td className="py-2">
                      <span className="font-mono text-xs">
                        {vtid.global_number}.{vtid.sub_number}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(vtid.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
