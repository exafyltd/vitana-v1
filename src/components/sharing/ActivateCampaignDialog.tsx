import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Rocket, Calendar, CheckCircle } from "lucide-react";
import { useCampaignDistribution } from "@/hooks/useCampaignDistribution";
import { toast } from "sonner";

interface ActivateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: "instant" | "scheduled") => void;
  isLoading: boolean;
  postsCount: number;
  draftCount: number;
  campaignId: string;
  campaignData?: {
    channels?: string[];
    audienceData?: any;
    messageContent?: any;
  };
}

export function ActivateCampaignDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  postsCount,
  draftCount,
  campaignId,
  campaignData,
}: ActivateCampaignDialogProps) {
  const [mode, setMode] = useState<"instant" | "scheduled">("instant");
  const { startDistribution, isDistributing } = useCampaignDistribution();
  const [progress, setProgress] = useState({ sent: 0, total: 0 });

  const handleActivate = () => {
    if (mode === "instant" && campaignData) {
      // Start instant distribution
      const channels = campaignData.channels || [];
      const audienceData = campaignData.audienceData || { vitanaContacts: true };
      const messageContent = campaignData.messageContent || { body: "Campaign message" };

      startDistribution({
        campaignId,
        channels,
        audienceData,
        messageContent,
      });

      // Simulate progress updates (replace with real-time data)
      const totalRecipients = draftCount;
      let sent = 0;
      const interval = setInterval(() => {
        sent += Math.floor(Math.random() * 5) + 1;
        if (sent >= totalRecipients) {
          sent = totalRecipients;
          clearInterval(interval);
          setTimeout(() => {
            onConfirm(mode);
            onOpenChange(false);
          }, 1000);
        }
        setProgress({ sent, total: totalRecipients });
      }, 500);
    } else {
      // Scheduled mode
      onConfirm(mode);
    }
  };

  useEffect(() => {
    if (!open) {
      setProgress({ sent: 0, total: 0 });
    }
  }, [open]);

  const isProcessing = isLoading || isDistributing;
  const showProgress = progress.total > 0 && progress.sent > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Activate Campaign</DialogTitle>
          <DialogDescription>
            Choose how you want to activate this campaign and distribute all posts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Posts</span>
              <span className="font-semibold">{postsCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Draft Posts</span>
              <span className="font-semibold text-yellow-600">{draftCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ready to Publish</span>
              <span className="font-semibold text-green-600">{draftCount}</span>
            </div>
          </div>

          <RadioGroup value={mode} onValueChange={(v) => setMode(v as "instant" | "scheduled")}>
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="instant" id="instant" />
              <Label htmlFor="instant" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4" />
                  <span className="font-medium">Blast All Now</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Publish all draft posts immediately across all selected channels
                </p>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="scheduled" id="scheduled" />
              <Label htmlFor="scheduled" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Smart Schedule</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Distribute posts over time for optimal engagement (coming soon)
                </p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Progress Indicator */}
        {showProgress && (
          <div className="py-3 px-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Distribution Progress</span>
              <span className="text-sm font-semibold">
                {progress.sent} / {progress.total}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all duration-300"
                style={{ width: `${(progress.sent / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handleActivate} 
            disabled={isProcessing || mode === "scheduled"}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {showProgress ? 'Distributing...' : 'Activating...'}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Activate Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
