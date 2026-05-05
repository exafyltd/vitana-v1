import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Filter, Target, Users, Calendar, MapPin, Heart, Zap } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface MatchFiltersPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatchFiltersPopup({ open, onOpenChange }: MatchFiltersPopupProps) {
  const [ageRange, setAgeRange] = useState([25, 45]);
  const [distanceRange, setDistanceRange] = useState([10]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "Yoga", "Meditation", "Running"
  ]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([
    "Weight Loss", "Mental Wellness"
  ]);
  const [matchSettings, setMatchSettings] = useState({
    prioritizeCompatibility: true,
    showOnlineOnly: false,
    hideViewedProfiles: true,
    enableAutoIntro: false
  });

  const interests = [
    "Yoga", "Meditation", "Running", "Cycling", "Swimming", "Hiking", 
    "Nutrition", "Cooking", "Dancing", "Martial Arts", "Rock Climbing", "Tennis"
  ];

  const goals = [
    "Weight Loss", "Muscle Gain", "Mental Wellness", "Stress Relief", 
    "Better Sleep", "Increased Energy", "Social Connection", "Skill Learning"
  ];

  const handleInterestToggle = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleGoalToggle = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleApplyFilters = () => {
    // Apply filters logic here
    console.log("Applied filters:", {
      ageRange,
      distanceRange: distanceRange[0],
      selectedInterests,
      selectedGoals,
      matchSettings
    });
    onOpenChange(false);
  };

  const handleResetFilters = () => {
    setAgeRange([18, 65]);
    setDistanceRange([50]);
    setSelectedInterests([]);
    setSelectedGoals([]);
    setMatchSettings({
      prioritizeCompatibility: true,
      showOnlineOnly: false,
      hideViewedProfiles: false,
      enableAutoIntro: false
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {t('screens.common.matchFiltersSettings')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Age Range */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />{t('screens.common.ageRangeValue0Value1Years', { value0: ageRange[0], value1: ageRange[1] })}
            </Label>
            <Slider
              value={ageRange}
              onValueChange={setAgeRange}
              max={65}
              min={18}
              step={1}
              className="w-full"
            />
          </div>

          {/* Distance Range */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />{t('screens.common.distanceWithinValue0Miles', { value0: distanceRange[0] })}
            </Label>
            <Slider
              value={distanceRange}
              onValueChange={setDistanceRange}
              max={100}
              min={5}
              step={5}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Interests */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              {t('screens.common.interestsActivities')}
            </Label>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <Badge
                  key={interest}
                  variant={selectedInterests.includes(interest) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleInterestToggle(interest)}
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              {t('screens.common.wellnessGoals')}
            </Label>
            <div className="flex flex-wrap gap-2">
              {goals.map((goal) => (
                <Badge
                  key={goal}
                  variant={selectedGoals.includes(goal) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleGoalToggle(goal)}
                >
                  {goal}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Match Settings */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {t('screens.common.advancedMatchSettings')}
            </Label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="prioritizeCompatibility"
                  checked={matchSettings.prioritizeCompatibility}
                  onCheckedChange={(checked) => 
                    setMatchSettings(prev => ({ ...prev, prioritizeCompatibility: checked as boolean }))
                  }
                />
                <Label htmlFor="prioritizeCompatibility" className="text-sm">
                  {t('screens.common.prioritizeHighCompatibilityMatches')}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showOnlineOnly"
                  checked={matchSettings.showOnlineOnly}
                  onCheckedChange={(checked) => 
                    setMatchSettings(prev => ({ ...prev, showOnlineOnly: checked as boolean }))
                  }
                />
                <Label htmlFor="showOnlineOnly" className="text-sm">
                  {t('screens.common.showOnlyOnlineMembers')}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hideViewedProfiles"
                  checked={matchSettings.hideViewedProfiles}
                  onCheckedChange={(checked) => 
                    setMatchSettings(prev => ({ ...prev, hideViewedProfiles: checked as boolean }))
                  }
                />
                <Label htmlFor="hideViewedProfiles" className="text-sm">
                  {t('screens.common.hideAlreadyViewedProfiles')}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableAutoIntro"
                  checked={matchSettings.enableAutoIntro}
                  onCheckedChange={(checked) => 
                    setMatchSettings(prev => ({ ...prev, enableAutoIntro: checked as boolean }))
                  }
                />
                <Label htmlFor="enableAutoIntro" className="text-sm">
                  {t('screens.common.enableAipoweredAutoIntroductions')}
                </Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleApplyFilters} className="flex-1">
              {t('screens.common.applyFilters')}
            </Button>
            <Button variant="outline" onClick={handleResetFilters}>
              {t('screens.common.reset')}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t('screens.common.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}