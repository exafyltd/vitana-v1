import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDisplayAvatarUrl } from "@/lib/autoAvatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface GroupMember {
  user_id: string;
  role: string;
  joined_at: string;
  display_name: string | null;
  avatar_url: string | null;
  handle: string | null;
}

interface GroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  memberCount: number;
}

export function GroupMembersDialog({ open, onOpenChange, groupId, memberCount }: GroupMembersDialogProps) {
  const navigate = useNavigate();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!groupId || !open) return;
    setLoading(true);
    try {
      const { data: memberRows, error } = await supabase
        .from('global_community_group_members')
        .select('user_id, role, joined_at')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true })
        .limit(200);

      if (error) throw error;
      if (!memberRows?.length) { setMembers([]); return; }

      const userIds = memberRows.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('global_community_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) {
        // Read/display path only — a failure here renders every member with
        // a blank name/avatar (indistinguishable from a genuinely empty
        // profile), so we log loudly and degrade rather than failing the
        // whole member list.
        console.error('Error fetching member profiles:', profilesError);
      }

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      
      setMembers(memberRows.map(m => ({
        ...m,
        display_name: profileMap.get(m.user_id)?.display_name || null,
        avatar_url: profileMap.get(m.user_id)?.avatar_url || null,
        handle: null,
      })));
    } catch (err) {
      console.error('Error fetching group members:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId, open]);

  useEffect(() => {
    if (open) fetchMembers();
  }, [open, fetchMembers]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl px-0">
        <SheetHeader className="px-4 pb-3 border-b border-border">
          <SheetTitle className="text-center">{t('screens.community.membersMembercount', { memberCount })}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(70vh-80px)]">
          <div className="px-4 py-2">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">{t('screens.community.noMembersYet')}</p>
            ) : (
              <div className="space-y-1">
                {members.map(m => (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/profile/${m.handle || m.user_id}`);
                    }}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getDisplayAvatarUrl(m)} />
                      <AvatarFallback className="text-xs bg-muted">
                        {getInitials(m.display_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">
                          {m.display_name || "Unknown User"}
                        </p>
                        {m.role === 'admin' && (
                          <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      {m.handle && (
                        <p className="text-xs text-muted-foreground truncate">@{m.handle}</p>
                      )}
                    </div>

                    {m.role === 'admin' && (
                      <Badge variant="secondary" className="text-[10px] h-5">{t('screens.community.admin')}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
