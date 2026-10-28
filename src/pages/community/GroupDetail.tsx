import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { communityNavigation } from "@/config/navigation";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGroupMembership } from "@/hooks/useGroupMembership";
import { generateGroupImage } from "@/lib/groupCardTransformers";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/hooks/useTranslation";
import { Panel, PanelContent } from '@/components/layout/spotlight/Panel';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Globe, Lock, ArrowLeft, Calendar } from "lucide-react";
import { useState } from "react";
import { GroupFeed } from "@/components/community/GroupFeed";
import { GroupMembersDialog } from "@/components/community/GroupMembersDialog";

import { fmtNumber } from '@/lib/locale-format';
// VTID-05110: desktop Spotlight (flag `desktop_spotlight`; off → unchanged render).
import { ArchetypeSkeleton, ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { GroupDetailRail, GroupDetailStage } from "@/components/community/spotlight/GroupDetailSpotlight";
import { SpotlightEmptyCard } from "@/components/community/spotlight/SocialStates";
import { t } from "@/lib/i18n-toast";
export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // VTID-05110: never true on phones (< 1024 px), so mobile is unaffected.
  const spotlight = useSpotlightEnabled();
  const { translate } = useTranslation();
  const { isMember, joinGroup, leaveGroup, isJoining, isLeaving, checkingMembership } = useGroupMembership(id);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);

  const { data: group, isLoading } = useQuery({
    queryKey: ['group-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('global_community_groups')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch members preview
  const { data: members = [] } = useQuery({
    queryKey: ['group-members-preview', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('global_community_group_members')
        .select('user_id, role, joined_at')
        .eq('group_id', id)
        .order('joined_at', { ascending: true })
        .limit(12);
      if (error) return [];
      return data || [];
    },
    enabled: !!id,
  });

  if (spotlight) {
    const frame = {
      subNav: { items: communityNavigation },
      header: { title: t('spotlightSocial.groupDetail.title'), description: t('spotlightSocial.groupDetail.description'), emoji: '👥' },
      utility: {
        children: (
          <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            {t('spotlightSocial.common.back')}
          </Button>
        ),
      },
    };
    return (
      <AppLayout>
        {group && (
          <SEO title={group.name} description={group.description || t('spotlightSocial.groupDetail.description')} canonical={window.location.href} />
        )}
        <ScreenFrame
          archetype="detail"
          {...frame}
          rail={group ? <GroupDetailRail memberCount={group.member_count} onShowMembers={() => setMembersDialogOpen(true)} /> : undefined}
        >
          {isLoading ? (
            <ArchetypeSkeleton archetype="detail" />
          ) : !group ? (
            <SpotlightEmptyCard
              spec={{ Icon: Users, titleKey: 'spotlightSocial.groupDetail.notFoundTitle', descriptionKey: 'spotlightSocial.groupDetail.notFoundDesc', actionKey: 'spotlightSocial.groupDetail.browse', onAction: () => navigate('/comm/groups') }}
            />
          ) : (
            <GroupDetailStage
              group={group}
              membership={{ isMember, checking: checkingMembership, isJoining, isLeaving, join: joinGroup, leave: leaveGroup }}
              feed={<GroupFeed groupId={group.id} isMember={isMember} />}
            />
          )}
        </ScreenFrame>
        {group && (
          <GroupMembersDialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen} groupId={group.id} memberCount={group.member_count} />
        )}
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        {!isMobile && <SubNavigation items={communityNavigation} />}
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      </AppLayout>
    );
  }

  if (!group) {
    return (
      <AppLayout>
        {!isMobile && <SubNavigation items={communityNavigation} />}
        <div className="p-6 max-w-4xl mx-auto text-center py-20">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">{translate('groupDetail.notFound', 'Group not found')}</h2>
          <p className="text-muted-foreground mb-4">{translate('groupDetail.notFoundDesc', "This group may have been removed or doesn't exist.")}</p>
          <Button onClick={() => navigate('/comm/groups')}>{translate('groupDetail.browseGroups', 'Browse Groups')}</Button>
        </div>
      </AppLayout>
    );
  }

  const coverImage = group.cover_url || generateGroupImage(group.id);

  return (
    <AppLayout>
      <SEO title={`${group.name} | Community`} description={group.description || 'Community group'} canonical={window.location.href} />
      {!isMobile && <SubNavigation items={communityNavigation} />}
      
      <div className="max-w-4xl mx-auto">
        {/* Cover Image */}
        <div className="relative h-48 md:h-64 overflow-hidden">
          <img src={coverImage} alt={group.name} className="w-full h-full object-cover" />
          {/* design-allow-next-line: on-media scrim, theme-independent */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute top-4 start-4 text-primary-foreground hover:bg-card/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 me-1" /> {translate('groupDetail.back', 'Back')}
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {fmtNumber(group.member_count)} {translate('groupDetail.members', 'Members')}
                </span>
                <Badge variant="outline" className="gap-1">
                  {group.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {group.is_public ? translate('groupDetail.public', 'Public') : translate('groupDetail.private', 'Private')}
                </Badge>
                {group.category && (
                  <Badge variant="secondary" className="capitalize">{group.category}</Badge>
                )}
              </div>
            </div>
            
            {!checkingMembership && (
              isMember ? (
                <Button variant="outline" onClick={leaveGroup} disabled={isLeaving}>
                  {isLeaving ? translate('groupDetail.leaving', 'Leaving...') : translate('groupDetail.leaveGroup', 'Leave Group')}
                </Button>
              ) : (
                <Button onClick={joinGroup} disabled={isJoining}>
                  {isJoining ? translate('groupDetail.joining', 'Joining...') : translate('groupDetail.joinGroup', 'Join Group')}
                </Button>
              )
            )}
          </div>

          {/* Description */}
          {group.description && (
            <Panel>
              <PanelContent className="pt-6">
                <p className="text-muted-foreground leading-relaxed">{group.description}</p>
              </PanelContent>
            </Panel>
          )}

          {/* Members Preview — clickable to open full list */}
          <Panel
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setMembersDialogOpen(true)}
          >
            <PanelContent className="pt-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" />
                {translate('groupDetail.members', 'Members')} ({group.member_count})
              </h3>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <Avatar key={m.user_id} className="h-10 w-10">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {m.role === 'admin' ? '👑' : '👤'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {group.member_count > members.length && (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
                    +{group.member_count - members.length}
                  </div>
                )}
              </div>
            </PanelContent>
          </Panel>

          {/* Group Feed */}
          <GroupFeed groupId={group.id} isMember={isMember} />
        </div>
      </div>

      {/* Members List Dialog */}
      <GroupMembersDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        groupId={group.id}
        memberCount={group.member_count}
      />
    </AppLayout>
  );
}
