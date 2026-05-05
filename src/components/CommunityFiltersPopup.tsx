import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { t } from '@/lib/i18n-toast';

interface CommunityFiltersPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommunityFiltersPopup({ open, onOpenChange }: CommunityFiltersPopupProps) {
  // Filter state
  const [selectedSections, setSelectedSections] = useState<string[]>(["live-sessions", "activity-feed", "recommendations"]);
  const [selectedPillars, setSelectedPillars] = useState<string[]>(["nutrition", "exercise", "mental"]);
  const [activityRadius, setActivityRadius] = useState([10]);
  const [contentType, setContentType] = useState("all");
  const [timeframe, setTimeframe] = useState("today");
  const [communitySettings, setCommunitySettings] = useState({
    showLiveOnly: false,
    prioritizeNearby: true,
    hideCompleted: false,
    showPremiumOnly: false
  });

  // Available sections to show/hide
  const availableSections = [
    { id: "live-sessions", label: "Live Sessions", description: "Active live rooms and workshops" },
    { id: "activity-feed", label: "Activity Feed", description: "Recent community updates" },
    { id: "recommendations", label: "Recommendations", description: "Suggested groups and events" },
    { id: "trending", label: "Trending", description: "Popular topics and discussions" },
    { id: "leaderboards", label: "Rankings", description: "Community leaderboards" },
    { id: "quick-access", label: "Quick Access", description: "Category navigation cards" }
  ];

  // Health pillars
  const availablePillars = [
    { id: "nutrition", label: "Nutrition" },
    { id: "exercise", label: "Exercise" },
    { id: "mental", label: "Mental Health" },
    { id: "sleep", label: "Sleep" },
    { id: "hydration", label: "Hydration" },
    { id: "social", label: "Social Wellness" }
  ];

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handlePillarToggle = (pillarId: string) => {
    setSelectedPillars(prev => 
      prev.includes(pillarId) 
        ? prev.filter(id => id !== pillarId)
        : [...prev, pillarId]
    );
  };

  const handleApplyFilters = () => {
    console.log("Applying community filters:", {
      sections: selectedSections,
      pillars: selectedPillars,
      radius: activityRadius[0],
      contentType,
      timeframe,
      settings: communitySettings
    });
    onOpenChange(false);
  };

  const handleResetFilters = () => {
    setSelectedSections(["live-sessions", "activity-feed", "recommendations"]);
    setSelectedPillars(["nutrition", "exercise", "mental"]);
    setActivityRadius([10]);
    setContentType("all");
    setTimeframe("today");
    setCommunitySettings({
      showLiveOnly: false,
      prioritizeNearby: true,
      hideCompleted: false,
      showPremiumOnly: false
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('screens.common.communityFilters')}</DialogTitle>
          <DialogDescription>
            {t('screens.common.customizeYourCommunityOverviewShowContent')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Content Sections */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">{t('screens.common.showSections')}</h4>
            <div className="grid grid-cols-2 gap-3">
              {availableSections.map((section) => (
                <div key={section.id} className="space-y-2">
                  <Badge
                    variant={selectedSections.includes(section.id) ? "default" : "outline"}
                    className="cursor-pointer w-full justify-start py-2 px-3"
                    onClick={() => handleSectionToggle(section.id)}
                  >
                    {section.label}
                  </Badge>
                  <p className="text-xs text-muted-foreground px-3">{section.description}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Health Pillars */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">{t('screens.common.focusAreas')}</h4>
            <div className="flex flex-wrap gap-2">
              {availablePillars.map((pillar) => (
                <Badge
                  key={pillar.id}
                  variant={selectedPillars.includes(pillar.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handlePillarToggle(pillar.id)}
                >
                  {pillar.label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Activity Radius */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">{t('screens.common.activityRadius')}</h4>
            <div className="px-3">
              <Slider
                value={activityRadius}
                onValueChange={setActivityRadius}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-1">
                <span>{t('screens.common.text1Mile')}</span>
                <span className="font-medium">{activityRadius[0]} miles</span>
                <span>{t('screens.common.text50Miles')}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Content Type and Timeframe */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('screens.common.contentType')}</h4>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('screens.common.allContent')}</SelectItem>
                  <SelectItem value="events">{t('screens.common.eventsOnly')}</SelectItem>
                  <SelectItem value="groups">{t('screens.common.groupsOnly')}</SelectItem>
                  <SelectItem value="live">{t('screens.common.liveSessions')}</SelectItem>
                  <SelectItem value="educational">{t('screens.common.educational')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('screens.common.timeframe')}</h4>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="now">{t('screens.common.rightNow')}</SelectItem>
                  <SelectItem value="today">{t('screens.common.today')}</SelectItem>
                  <SelectItem value="week">{t('screens.common.thisWeek')}</SelectItem>
                  <SelectItem value="month">{t('screens.common.thisMonth')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">{t('screens.common.advancedSettings')}</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-live"
                  checked={communitySettings.showLiveOnly}
                  onCheckedChange={(checked) => 
                    setCommunitySettings(prev => ({ ...prev, showLiveOnly: checked as boolean }))
                  }
                />
                <label htmlFor="show-live" className="text-sm">
                  {t('screens.common.showLiveContentOnly')}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="prioritize-nearby"
                  checked={communitySettings.prioritizeNearby}
                  onCheckedChange={(checked) => 
                    setCommunitySettings(prev => ({ ...prev, prioritizeNearby: checked as boolean }))
                  }
                />
                <label htmlFor="prioritize-nearby" className="text-sm">
                  {t('screens.common.prioritizeNearbyActivities')}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hide-completed"
                  checked={communitySettings.hideCompleted}
                  onCheckedChange={(checked) => 
                    setCommunitySettings(prev => ({ ...prev, hideCompleted: checked as boolean }))
                  }
                />
                <label htmlFor="hide-completed" className="text-sm">
                  {t('screens.common.hideCompletedEvents')}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="premium-only"
                  checked={communitySettings.showPremiumOnly}
                  onCheckedChange={(checked) => 
                    setCommunitySettings(prev => ({ ...prev, showPremiumOnly: checked as boolean }))
                  }
                />
                <label htmlFor="premium-only" className="text-sm">
                  {t('screens.common.showPremiumContentOnly')}
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={handleResetFilters}>
            {t('screens.common.reset')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('screens.common.cancel')}
            </Button>
            <Button onClick={handleApplyFilters}>
              {t('screens.common.applyFilters')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}