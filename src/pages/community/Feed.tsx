import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { communityNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Plus, MessageSquare, Users, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { CreateContentPopup } from "@/components/CreateContentPopup";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { t } from '@/lib/i18n-toast';

export default withScreenId(function Feed() {
  const [createContentOpen, setCreateContentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("following");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const isMobile = useIsMobile();
  const { pendingCount } = useAutopilot();

  return (
    <AppLayout>
      <SEO title={t('screens.community.feedCommunity')} description="Stay updated with your community feed" canonical={window.location.href} />
      {!isMobile && <SubNavigation items={communityNavigation} />}
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <StandardHeader
          title={t('screens.community.communityFeed')}
          description="Stay updated with posts, updates, and activities from your community."
          emoji="📱"
        />

        {/* Utility Action Button - Unified Mobile Pattern */}
        <UtilityActionButton className="min-w-0">
          <div className="flex items-center gap-2.5 min-w-max">
            <ExpandableSearchButton 
              placeholder={t('screens.community.searchFeed')}
              onSearch={(query) => console.log('Search Feed:', query)}
            />
            <UniversalCalendarButton />
            
            {/* Create - PRIMARY ACTION */}
            <Button 
              size="sm" 
              onClick={() => setCreateContentOpen(true)}
              className="h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              {!isMobile && <span>Content</span>}
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

        {/* VTID-DANCE-D4/D7: discovery primers — Members directory + Open Asks */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <Link
            to="/comm/members"
            className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 transition-colors flex items-center gap-3"
          >
            <Users className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('screens.community.browseMembers')}</div>
              <div className="text-xs text-muted-foreground truncate">{t('screens.community.seeWhoSCommunity')}</div>
            </div>
          </Link>
          <Link
            to="/comm/open-asks"
            className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 transition-colors flex items-center gap-3"
          >
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('screens.community.openAsks')}</div>
              <div className="text-xs text-muted-foreground truncate">{t('screens.community.helpSomeoneCommunity')}</div>
            </div>
          </Link>
        </div>

        {/* Split Navigation */}
        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="following">{t('screens.community.following')}</SplitBarTrigger>
            <SplitBarTrigger value="recommended">{t('screens.community.recommended')}</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="following">
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('screens.community.noPostsYet')}</h3>
              <p className="text-muted-foreground">{t('screens.community.followSomeGroupsPeopleSeeTheir')}</p>
            </div>
          </SplitBarContent>

          <SplitBarContent value="recommended">
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('screens.community.recommendedContent')}</h3>
              <p className="text-muted-foreground">{t('screens.community.personalizedContentRecommendationsWillAppearHere')}</p>
            </div>
          </SplitBarContent>
        </SplitBar>
      </div>

      {/* Create Content Popup */}
      <CreateContentPopup 
        isOpen={createContentOpen} 
        onClose={() => setCreateContentOpen(false)}
      />
      
      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </AppLayout>
  );
}, SCREEN_IDS.COMMUNITY_FEED);