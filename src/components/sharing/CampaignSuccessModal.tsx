import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Info, LayoutGrid, Plus, Sparkles, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ShareCampaignModal } from "./ShareCampaignModal";
import { useState } from "react";
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface CampaignSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: {
    id: string;
    name: string;
    channels: string[];
    template: string;
    firstPostDate: Date;
    description?: string;
    coverImage?: string;
  };
  smartSchedulingEnabled?: boolean;
}

export function CampaignSuccessModal({ 
  open, 
  onOpenChange, 
  campaign,
  smartSchedulingEnabled = true
}: CampaignSuccessModalProps) {
  const navigate = useNavigate();
  const [showShareModal, setShowShareModal] = useState(false);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="text-center space-y-6 py-4">
          {/* Celebration Animation */}
          <div className="relative">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] rounded-full flex items-center justify-center animate-in zoom-in duration-500">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <div className="absolute inset-0 animate-ping opacity-30">
              <div className="w-24 h-24 mx-auto bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] rounded-full" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-2">{t('screens.sharing.campaignCreated')}</h2>
            <p className="text-sm text-muted-foreground">
              {smartSchedulingEnabled 
                ? "Now share it with your community"
                : "Your posts are saved as drafts. Schedule them individually below."}
            </p>
          </div>

          {/* Campaign Summary Card */}
          <Card className="border-2 text-left">
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('screens.sharing.campaignName2')}</p>
                <p className="font-semibold">{campaign.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('screens.sharing.channels')}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {campaign.channels.map(ch => (
                    <Badge key={ch} variant="secondary" className="text-xs">
                      {ch}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('screens.sharing.template')}</p>
                <p className="text-sm font-medium">{campaign.template}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('screens.sharing.firstScheduledPost')}</p>
                <p className="text-sm font-medium">
                  {formatDate(campaign.firstPostDate, "PPP 'at' p")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reassurance */}
          <div className="flex items-start gap-2 p-3 bg-[hsl(var(--pill-hydration-tint))] rounded-lg text-left border border-[hsl(var(--pill-hydration-accent))]/20">
            <Info className="w-4 h-4 text-[hsl(var(--pill-hydration-accent))] shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              {t('screens.sharing.campaignCreatedAsDraftYouCan')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {smartSchedulingEnabled ? (
              <>
                <Button
                  onClick={() => {
                    setShowShareModal(true);
                  }}
                  className="w-full bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] hover:opacity-90"
                  size="lg"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {t('screens.sharing.shareWithMyContacts')}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    navigate(`/sharing/campaigns/${campaign.id}`);
                    onOpenChange(false);
                  }}
                  className="w-full"
                >{t('screens.sharing.manageChannelsScheduling')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    navigate(`/sharing/campaigns/${campaign.id}`);
                    onOpenChange(false);
                  }}
                  className="w-full bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] hover:opacity-90"
                  size="lg"
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  {t('screens.sharing.managePosts')}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setShowShareModal(true);
                  }}
                  className="w-full"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {t('screens.sharing.shareWithMyContacts')}
                </Button>
              </>
            )}

            <Button
              variant="link"
              onClick={() => {
                navigate('/sharing/campaigns');
                onOpenChange(false);
              }}
              className="w-full text-sm"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              {t('screens.sharing.viewDashboard')}
            </Button>
          </div>
        </div>
      </DialogContent>

      <ShareCampaignModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        campaignId={campaign.id}
        campaignName={campaign.name}
        campaignDescription={campaign.description}
        campaignImage={campaign.coverImage}
      />
    </Dialog>
  );
}
