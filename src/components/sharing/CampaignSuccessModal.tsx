import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Info, LayoutGrid, Plus, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface CampaignSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: {
    name: string;
    channels: string[];
    template: string;
    firstPostDate: Date;
  };
}

export function CampaignSuccessModal({ 
  open, 
  onOpenChange, 
  campaign 
}: CampaignSuccessModalProps) {
  const navigate = useNavigate();
  
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
            <h2 className="text-2xl font-bold mb-2">Campaign Created! 🎉</h2>
            <p className="text-sm text-muted-foreground">
              Your campaign is ready to go
            </p>
          </div>

          {/* Campaign Summary Card */}
          <Card className="border-2 text-left">
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Campaign Name</p>
                <p className="font-semibold">{campaign.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Channels</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {campaign.channels.map(ch => (
                    <Badge key={ch} variant="secondary" className="text-xs">
                      {ch}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Template</p>
                <p className="text-sm font-medium">{campaign.template}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">First Scheduled Post</p>
                <p className="text-sm font-medium">
                  {format(campaign.firstPostDate, "PPP 'at' p")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reassurance */}
          <div className="flex items-start gap-2 p-3 bg-[hsl(var(--pill-hydration-tint))] rounded-lg text-left border border-[hsl(var(--pill-hydration-accent))]/20">
            <Info className="w-4 h-4 text-[hsl(var(--pill-hydration-accent))] shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              Campaign created as draft. You can review all posts before publishing.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                navigate('/sharing/campaigns');
                onOpenChange(false);
              }}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              View Dashboard
            </Button>
            <Button
              onClick={() => {
                navigate('/sharing/content');
                onOpenChange(false);
              }}
              className="bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Content
            </Button>
          </div>

          <Button
            variant="link"
            onClick={() => {
              // Enable Autopilot optimization
              onOpenChange(false);
            }}
            className="w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Let Autopilot Optimize
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
