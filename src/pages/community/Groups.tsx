import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

function GroupCard({ group, onClick, actionSlot }: { 
  group: { id: string; name: string; description?: string | null; category?: string | null; cover_url?: string | null; member_count: number; is_public?: boolean };
  onClick: () => void;
  actionSlot?: React.ReactNode;
}) {
  const coverImage = group.cover_url || generateGroupImage(group.id);
  return (
    <Card 
      className="group relative overflow-hidden rounded-2xl border-0 h-56 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
        style={{ backgroundImage: `url(${coverImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
      <div className="relative h-full p-4 flex flex-col justify-between text-white">
        <div className="flex justify-end gap-2">
          {group.is_public !== undefined && (
            <Badge className="bg-white/20 backdrop-blur-md border-white/30 text-white text-xs">
              {group.is_public ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
              {group.is_public ? 'Public' : 'Private'}
            </Badge>
          )}
          {group.category && (
            <Badge className="bg-white/20 backdrop-blur-md border-white/30 text-white capitalize text-xs">
              {group.category}
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="font-bold text-lg drop-shadow-lg line-clamp-1">{group.name}</h3>
          <p className="text-sm text-white/80 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />{t('screens.community.value0Members', { value0: group.member_count.toLocaleString() })}
          </p>
          {actionSlot && (
            <div onClick={(e) => e.stopPropagation()}>
              {actionSlot}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function JoinLeaveButton({ groupId }: { groupId: string }) {
  const { isMember, joinGroup, leaveGroup, isJoining, isLeaving, checkingMembership } = useGroupMembership(groupId);
  if (checkingMembership) return null;
  return isMember ? (
    <Button size="sm" variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30" onClick={leaveGroup} disabled={isLeaving}>
      {isLeaving ? 'Leaving...' : 'Leave'}
    </Button>
  ) : (
    <Button size="sm" className="bg-white/90 hover:bg-white text-gray-900" onClick={joinGroup} disabled={isJoining}>
      {isJoining ? 'Joining...' : 'Join'}
    </Button>
  );
}

export default function Groups() {
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("my-groups");
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

  return (
    <AppLayout>
      <SEO title={t('screens.community.groupsCommunity')} description="Join and manage community groups" canonical={window.location.href} />
      {!isMobile && <SubNavigation items={communityNavigation} />}
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
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
                    <Plus className="h-4 w-4 mr-2" />
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
