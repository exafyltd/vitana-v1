import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus, Trophy } from "lucide-react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { communityNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

export default function Challenges() {
  const [activeTab, setActiveTab] = useState("active");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const isMobile = useIsMobile();
  const { pendingCount } = useAutopilot();
  const { translate } = useTranslation();

  return (
    <AppLayout>
      <SEO title={t('screens.community.challengesCommunity')} description="Participate in wellness challenges" canonical={window.location.href} />
      {!isMobile && <SubNavigation items={communityNavigation} />}
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title={t('screens.community.challengeYourselfAchieveGreatness')}
            description="Join community wellness challenges and compete with others to achieve your goals."
            emoji="🏆"
          />
          
          {/* Utility Action Button - Unified Mobile Pattern */}
          <UtilityActionButton className="min-w-0">
            <div className="flex items-center gap-2.5 min-w-max">
              <ExpandableSearchButton 
                placeholder={translate('challenges.searchPlaceholder', 'Search challenges...')} 
                onSearch={(query) => console.log('Search Challenges:', query)}
              />
              <UniversalCalendarButton />
              
              {/* Join - PRIMARY ACTION */}
              <Button 
                size="sm"
                className="h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                {!isMobile && <span>{t('screens.community.join')}</span>}
              </Button>
              
              {/* Vitana Index chip (mobile only) */}
              {isMobile && <VitanaIndexChip />}
              
              {/* Autopilot chip (mobile only) */}
              {isMobile && (
                <AutopilotChip 
                  pendingCount={pendingCount} 
                  onClick={() => setAutopilotOpen(true)} 
                />
              )}
            </div>
          </UtilityActionButton>

          {/* Split Navigation */}
          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="active">{t('screens.community.active')}</SplitBarTrigger>
              <SplitBarTrigger value="upcoming">{t('screens.community.upcoming')}</SplitBarTrigger>
              <SplitBarTrigger value="completed">{t('screens.community.completed')}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="active">
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t('screens.community.noActiveChallenges')}</h3>
                <p className="text-muted-foreground">{t('screens.community.joinChallengeStartYourWellnessJourney')}</p>
              </div>
            </SplitBarContent>

            <SplitBarContent value="upcoming">
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t('screens.community.upcomingChallenges')}</h3>
                <p className="text-muted-foreground">{t('screens.community.newChallengesWillAppearHereSoon')}</p>
              </div>
            </SplitBarContent>

            <SplitBarContent value="completed">
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t('screens.community.noCompletedChallenges')}</h3>
                <p className="text-muted-foreground">{t('screens.community.completeChallengesSeeYourAchievementsHere')}</p>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      
      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </AppLayout>
  );
}