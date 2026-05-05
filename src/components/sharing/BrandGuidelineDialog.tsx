import React from "react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { notify, t } from '@/lib/i18n-toast';

interface BrandGuidelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrandGuidelineDialog({ open, onOpenChange }: BrandGuidelineDialogProps) {
  const [channel, setChannel] = React.useState("");
  const [imageSpecs, setImageSpecs] = React.useState("");
  const [bestTimes, setBestTimes] = React.useState("");
  const [guidelines, setGuidelines] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    notify('toasts.sharing.brandGuidelineCreated');
    setChannel("");
    setImageSpecs("");
    setBestTimes("");
    setGuidelines("");
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[500px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('screens.sharing.createBrandGuideline')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Define channel-specific rules and best practices
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogBody>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="channel">Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger id="channel">
                    <SelectValue placeholder={t('screens.sharing.selectChannel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="twitter">{t('screens.sharing.twitterx')}</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="imageSpecs">{t('screens.sharing.imageSpecifications')}</Label>
                <Input
                  id="imageSpecs"
                  placeholder={t('screens.sharing.eG1080x1080pxJpgpng')}
                  value={imageSpecs}
                  onChange={(e) => setImageSpecs(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bestTimes">{t('screens.sharing.bestPostingTimes')}</Label>
                <Input
                  id="bestTimes"
                  placeholder={t('screens.sharing.eGTuethu911amEst')}
                  value={bestTimes}
                  onChange={(e) => setBestTimes(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="guidelines">{t('screens.sharing.guidelinesNotes')}</Label>
                <Textarea
                  id="guidelines"
                  placeholder={t('screens.sharing.addHashtagRulesToneVoiceCharacter')}
                  value={guidelines}
                  onChange={(e) => setGuidelines(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{t('screens.sharing.saveGuideline')}</Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
