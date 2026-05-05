import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { Users, UserPlus, History, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { t } from '@/lib/i18n-toast';

export function ClientsSubTabs() {
  const navigate = useNavigate();

  return (
    <SplitBar defaultValue="active" className="w-full">
      <SplitBarList>
        <SplitBarTrigger value="active">{t('screens.business.active')}</SplitBarTrigger>
        <SplitBarTrigger value="prospects">{t('screens.business.prospects')}</SplitBarTrigger>
        <SplitBarTrigger value="history">{t('screens.business.history')}</SplitBarTrigger>
      </SplitBarList>

      <SplitBarContent value="active" className="space-y-4 mt-4">
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('screens.business.noActiveClients')}</h3>
          <p className="text-muted-foreground">
            Active clients with subscriptions or bookings will appear here.
          </p>
        </div>
      </SplitBarContent>

      <SplitBarContent value="prospects" className="space-y-4 mt-4">
        <div className="text-center py-12">
          <UserPlus className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('screens.business.noProspectsYet')}</h3>
          <p className="text-muted-foreground mb-4">
            Leads from sharing campaigns and reseller links will appear here.
          </p>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/sharing")}>
            <Share2 className="w-4 h-4" />
            Promote via Sharing
          </Button>
        </div>
      </SplitBarContent>

      <SplitBarContent value="history" className="space-y-4 mt-4">
        <div className="text-center py-12">
          <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('screens.business.noPastClients')}</h3>
          <p className="text-muted-foreground">
            Clients who had past sessions but no active plan will appear here.
          </p>
        </div>
      </SplitBarContent>
    </SplitBar>
  );
}
