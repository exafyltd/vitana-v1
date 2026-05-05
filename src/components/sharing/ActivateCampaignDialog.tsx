import { useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Loader2, Rocket, Calendar as CalendarIcon, CheckCircle, Clock } from "lucide-react";
import { format, addDays, setHours, setMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface ActivateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: "instant" | "scheduled", scheduledFor?: Date) => void;
  isLoading: boolean;
  postsCount: number;
  draftCount: number;
  campaignId: string;
  campaignData?: {
    channels?: string[];
    audienceData?: any;
    messageContent?: any;
  };
  targetChannels?: Record<string, boolean> | null;
}

export function ActivateCampaignDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  postsCount,
  draftCount,
  targetChannels,
}: ActivateCampaignDialogProps) {
  // Count selected channels
  const selectedChannelNames = targetChannels 
    ? Object.entries(targetChannels)
        .filter(([_, selected]) => selected)
        .map(([channel]) => channel.charAt(0).toUpperCase() + channel.slice(1))
    : [];
  const channelCount = selectedChannelNames.length;
  const [mode, setMode] = useState<"instant" | "scheduled">("instant");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [scheduledTime, setScheduledTime] = useState("09:00");

  const handleActivate = () => {
    if (mode === "scheduled" && scheduledDate) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const fullDate = setMinutes(setHours(scheduledDate, hours), minutes);
      onConfirm(mode, fullDate);
    } else {
      onConfirm(mode);
    }
  };

  const isScheduleValid = mode === "instant" || (mode === "scheduled" && scheduledDate);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('screens.sharing.activateCampaign')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {postsCount > 0 
              ? "Choose how you want to activate this campaign and distribute all posts."
              : "Choose how you want to activate and distribute this campaign."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <div className="space-y-4">
            <div className="grid gap-4 p-4 bg-muted/50 rounded-lg">
              {postsCount > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('screens.sharing.totalPosts')}</span>
                    <span className="font-semibold">{postsCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('screens.sharing.draftPosts')}</span>
                    <span className="font-semibold text-yellow-600">{draftCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('screens.sharing.readyPublish')}</span>
                    <span className="font-semibold text-green-600">{draftCount}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('screens.sharing.selectedChannels')}</span>
                    <span className="font-semibold">{channelCount}</span>
                  </div>
                  {selectedChannelNames.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {selectedChannelNames.join(', ')}
                    </div>
                  )}
                </>
              )}
            </div>

            <RadioGroup value={mode} onValueChange={(v) => setMode(v as "instant" | "scheduled")}>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="instant" id="instant" />
                <Label htmlFor="instant" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4" />
                    <span className="font-medium">{t('screens.sharing.activateNow')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {postsCount > 0 
                      ? "Publish all draft posts immediately across all selected channels"
                      : "Activate campaign immediately across all selected channels"}
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="scheduled" id="scheduled" />
                <Label htmlFor="scheduled" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">{t('screens.sharing.scheduleForLater')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('screens.sharing.pickSpecificDateTimeActivateCampaign')}
                  </p>
                </Label>
              </div>
            </RadioGroup>

            {/* Date/Time Picker - shown when "scheduled" is selected */}
            {mode === "scheduled" && (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <Label className="text-sm font-medium">{t('screens.sharing.scheduleDateTime')}</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !scheduledDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-[120px]"
                  />
                </div>
                {scheduledDate && (
                  <p className="text-xs text-muted-foreground">
                    Campaign will activate on {format(scheduledDate, "MMMM d, yyyy")} at {scheduledTime}
                  </p>
                )}
              </div>
            )}
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('screens.sharing.cancel')}
          </Button>
          <Button 
            onClick={handleActivate} 
            disabled={isLoading || !isScheduleValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === "scheduled" ? "Scheduling..." : "Activating..."}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {mode === "scheduled" ? "Schedule Campaign" : "Activate Campaign"}
              </>
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
