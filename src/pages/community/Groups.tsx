import { useUrlTab } from "@/hooks/useUrlTab";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Panel } from '@/components/layout/spotlight/Panel';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, Globe, Lock } from "lucide-react";
import { CreateGroupPopup } from "@/components/CreateGroupPopup";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/context/AuthProvider";
import { useUserGroups } from "@/hooks/useUserGroups";
import { useGroupDirectory } from "@/hooks/useGroupDirectory";
import { useGroupMembership } from "@/hooks/useGroupMembership";
import { generateGroupImage } from "@/lib/groupCardTransformers";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { communityNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

import { fmtNumber } from '@/lib/locale-format';
// VTID-05110: desktop Spotlight (flag `desktop_spotlight`; off → unchanged render).
import { ScreenFrame } from '@/components/layout/spotlight';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';
import { GroupsSpotlightBody } from '@/components/community/spotlight/GroupsSpotlightBody';
function GroupCard({ group, onClick, actionSlot }: { 
  group: { id: string; name: string; description?: string | null; category?: string | null; cover_url?: string | null; member_count: number; is_public?: boolean };
  onClick: () => void;
  actionSlot?: React.ReactNode;
}) {
  const coverImage = group.cover_url || generateGroupImage(group.id);
  return (
    <Panel 
      className="group relative overflow-hidden rounded-2xl border-0 h-56 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
        style={{ backgroundImage: `url(${coverImage})` }}
      />
      {/* design-allow-next-line: on-media scrim, theme-independent */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
      <div className="relative h-full p-4 flex flex-col justify-between text-primary-foreground">
        <div className="flex justify-end gap-2">
          {group.is_public !== undefined && (
            <Badge className="bg-card/20 backdrop-blur-md border-border/30 text-primary-foreground text-xs">
              {group.is_public ? <Globe className="h-3 w-3 me-1" /> : <Lock className="h-3 w-3 me-1" />}
              {group.is_public ? 'Public' : 'Private'}
            </Badge>
          )}
          {group.category && (
            <Badge className="bg-card/20 backdrop-blur-md border-border/30 text-primary-foreground capitalize text-xs">
              {group.category}
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="font-bold text-lg drop-shadow-lg line-clamp-1">{group.name}</h3>
          <p className="text-sm text-primary-foreground/80 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />{t('screens.community.value0Members', { value0: fmtNumber(group.member_count) })}
          </p>
          {actionSlot && (
            <div onClick={(e) => e.stopPropagation()}>
              {actionSlot}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function JoinLeaveButton({ groupId }: { groupId: string }) {
  const { isMember, joinGroup, leaveGroup, isJoining, isLeaving, checkingMembership } = useGroupMembership(groupId);
  if (checkingMembership) return null;
  return isMember ? (
    <Button size="sm" variant="outline" className="bg-card/20 border-border/30 text-primary-foreground hover:bg-card/30" onClick={leaveGroup} disabled={isLeaving}>
      {isLeaving ? 'Leaving...' : 'Leave'}
    </Button>
  ) : (
    <Button size="sm" className="bg-card/90 hover:bg-card text-foreground" onClick={joinGroup} disabled={isJoining}>
      {isJoining ? 'Joining...' : 'Join'}
    </Button>
  );
}

export default function Groups() {
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [activeTab, setActiveTab] = useUrlTab("tab", "my-groups");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const { pendingCount } = useAutopilot();
  const { translate } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: myGroups = [], isLoading: loadingMyGroups } = useUserGroups(user?.id);
  const { data: allGroups = [], isLoading: loadingDirectory } = useGroupDirectory(searchQuery);

  // Filter out groups user already joined for "Recommended" tab
  const myGroupIds = new Set(myGroups.map(g => g.id));
  const recommendedGroups = allGroups.filter(g => !myGroupIds.has(g.id));
  // VTID-05110: never true on phones (< 1024 px), so mobile is unaffected.
  const spotlight = useSpotlightEnabled();

  if (spotlight) {
    const mine = activeTab !== 'recommended';
    return (
      <AppLayout>
        <SEO title={t('screens.community.groupsCommunity')} description={t('spotlightSocial.groups.description')} canonical={window.location.href} />
        <ScreenFrame
          archetype="collection"
          subNav={{ items: communityNavigation }}
          header={{ title: t('spotlightSocial.groups.title'), description: t('spotlightSocial.groups.description'), emoji: '👥' }}
          utility={{
            children: (
              <div className="flex min-w-max items-center gap-2.5">
                <ExpandableSearchButton
                  placeholder={t('spotlightSocial.groups.search')}
                  onSearch={(query) => setSearchQuery(query)}
                />
                <UniversalCalendarButton />
                <Button size="sm" className="shrink-0 gap-1.5 rounded-full" onClick={() => setCreateGroupOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t('spotlightSocial.groups.create')}
                </Button>
              </div>
            ),
          }}
          tabs={{
            value: mine ? 'my-groups' : 'recommended',
            onValueChange: setActiveTab,
            ariaLabel: t('spotlightSocial.groups.tabsLabel'),
            items: [
              { value: 'my-groups', label: t('spotlightSocial.groups.tabs.mine') },
              { value: 'recommended', label: t('spotlightSocial.groups.tabs.discover') },
            ],
          }}
        >
          {mine ? (
            <GroupsSpotlightBody
              groups={myGroups}
              loading={loadingMyGroups}
              empty={{ Icon: Users, titleKey: 'spotlightSocial.groups.emptyMineTitle', descriptionKey: 'spotlightSocial.groups.emptyMineDesc', actionKey: 'spotlightSocial.groups.discoverAction', onAction: () => setActiveTab('recommended') }}
            />
          ) : (
            <GroupsSpotlightBody
              groups={recommendedGroups}
              loading={loadingDirectory}
              withJoin
              empty={{ Icon: Users, titleKey: 'spotlightSocial.groups.emptyDiscoverTitle', descriptionKey: 'spotlightSocial.groups.emptyDiscoverDesc', actionKey: 'spotlightSocial.groups.createAction', onAction: () => setCreateGroupOpen(true) }}
            />
          )}
        </ScreenFrame>
        <CreateGroupPopup isOpen={createGroupOpen} onClose={() => setCreateGroupOpen(false)} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO title={t('screens.community.groupsCommunity')} description="Join and manage community groups" canonical={window.location.href} />
      {!isMobile && <SubNavigation items={communityNavigation} />}
      <div className="p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title={t('screens.community.findYourWellnessTribe')}
            description="Join groups with shared interests or create your own community groups."
            emoji="👥"
          />

          <UtilityActionButton className="min-w-0">
            <div className="flex items-center gap-2.5 min-w-max">
              <ExpandableSearchButton 
                placeholder={translate('groups.searchPlaceholder', 'Search groups...')} 
                onSearch={(query) => setSearchQuery(query)}
              />
              <UniversalCalendarButton />
              <Button 
                onClick={() => setCreateGroupOpen(true)}
                size="sm"
                className="h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                {!isMobile && <span>{translate('buttons.create', 'Create')}</span>}
              </Button>
              {isMobile && <VitanaIndexChip />}
              {isMobile && (
                <AutopilotChip 
                  pendingCount={pendingCount} 
                  onClick={() => setAutopilotOpen(true)} 
                />
              )}
            </div>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="my-groups">{t('screens.community.myGroups2')}</SplitBarTrigger>
              <SplitBarTrigger value="recommended">{t('screens.community.discover')}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="my-groups">
              {loadingMyGroups ? (
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-56 rounded-2xl" />
                  ))}
                </div>
              ) : myGroups.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">{t('screens.community.noGroupsYet')}</h3>
                  <p className="text-muted-foreground mb-4">{t('screens.community.joinYourFirstGroupGetStarted')}</p>
                  <Button onClick={() => setActiveTab("recommended")}>{t('screens.community.discoverGroups')}</Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {myGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onClick={() => navigate(`/comm/groups/${group.id}`)}
                    />
                  ))}
                </div>
              )}
            </SplitBarContent>

            <SplitBarContent value="recommended">
              {loadingDirectory ? (
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-56 rounded-2xl" />
                  ))}
                </div>
              ) : recommendedGroups.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">{t('screens.community.noGroupsDiscover')}</h3>
                  <p className="text-muted-foreground mb-4">{t('screens.community.firstStartCommunity')}</p>
                  <Button onClick={() => setCreateGroupOpen(true)}>
                    <Plus className="h-4 w-4 me-2" />
                    {t('screens.community.createGroup')}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {recommendedGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onClick={() => navigate(`/comm/groups/${group.id}`)}
                      actionSlot={<JoinLeaveButton groupId={group.id} />}
                    />
                  ))}
                </div>
              )}
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <CreateGroupPopup 
        isOpen={createGroupOpen} 
        onClose={() => setCreateGroupOpen(false)}
      />
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </AppLayout>
  );
}
