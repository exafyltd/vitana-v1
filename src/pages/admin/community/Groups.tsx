import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminGuard } from "@/routes/guards/AdminGuard";
import { adminCommunityNavigation } from "@/config/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Flag, Eye, Users, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { notifyError, t } from '@/lib/i18n-toast';

interface CommunityGroup {
  id: string;
  name: string;
  description: string | null;
  category: string;
  member_count: number;
  max_members?: number | null;
  is_public?: boolean;
  avatar_url?: string | null;
  cover_url?: string | null;
  chat_thread_id?: string | null;
  created_by: string;
  status: string;
  moderation_notes: string | null;
  moderated_at: string | null;
  moderated_by?: string | null;
  created_at: string;
  updated_at?: string;
  image_url?: string | null;
  tags?: string[] | null;
  settings?: any;
}

const GroupsModeration = () => {
  const { translate } = useTranslation();
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchGroups();
    
    // Realtime subscription
    const channel = supabase
      .channel('admin-groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_community_groups' }, () => {
        fetchGroups();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('global_community_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups((data || []) as CommunityGroup[]);
    } catch (error) {
      console.error('Error fetching groups:', error);
      notifyError('toasts.admin.failedLoadGroups');
    } finally {
      setLoading(false);
    }
  };

  const moderateGroup = async (groupId: string, status: 'approved' | 'rejected' | 'flagged', notes?: string) => {
    try {
      const { error } = await supabase
        .from('global_community_groups')
        .update({
          status,
          moderation_notes: notes,
          moderated_at: new Date().toISOString()
        })
        .eq('id', groupId);

      if (error) throw error;
      toast.success(`Group ${status}`);
      fetchGroups();
    } catch (error) {
      console.error('Error moderating group:', error);
      notifyError('toasts.admin.failedModerateGroup');
    }
  };

  const filteredGroups = groups.filter(group => {
    if (activeTab === 'all') return true;
    return group.status === activeTab;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, labelKey: "adminTabs.groups.pending", color: "text-yellow-600" },
      approved: { variant: "default" as const, labelKey: "adminTabs.groups.approved", color: "text-green-600" },
      rejected: { variant: "destructive" as const, labelKey: "adminTabs.groups.rejected", color: "text-red-600" },
      flagged: { variant: "outline" as const, labelKey: "adminTabs.groups.flagged", color: "text-orange-600" }
    };
    const config = variants[status as keyof typeof variants] || variants.approved;
    return <Badge variant={config.variant} className={config.color}>{translate(config.labelKey, status)}</Badge>;
  };

  return (
    <AdminGuard>
      <AppLayout>
        <SEO title={t('screens.admin.groupsModerationAdmin')} description="Review and moderate community groups" />
        
        <SubNavigation items={adminCommunityNavigation} />
        
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-6">
            <AdminHeader
              title={t('screens.admin.groupsModeration')}
              description="Review, approve, or reject community groups"
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">{translate('adminTabs.groups.all', 'All Groups')}</TabsTrigger>
                <TabsTrigger value="pending">{translate('adminTabs.groups.pending', 'Pending')}</TabsTrigger>
                <TabsTrigger value="approved">{translate('adminTabs.groups.approved', 'Approved')}</TabsTrigger>
                <TabsTrigger value="flagged">{translate('adminTabs.groups.flagged', 'Flagged')}</TabsTrigger>
                <TabsTrigger value="rejected">{translate('adminTabs.groups.rejected', 'Rejected')}</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                <Card>
                  {loading ? (
                    <div className="p-12 text-center text-muted-foreground">{translate('loading.groups', 'Loading groups...')}</div>
                  ) : filteredGroups.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">{translate('empty.noGroupsFound', 'No groups found')}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{translate('tableHeaders.groupName', 'Group Name')}</TableHead>
                          <TableHead>{translate('tableHeaders.category', 'Category')}</TableHead>
                          <TableHead>{translate('tableHeaders.members', 'Members')}</TableHead>
                          <TableHead>{translate('tableHeaders.privacy', 'Privacy')}</TableHead>
                          <TableHead>{translate('tableHeaders.status', 'Status')}</TableHead>
                          <TableHead>{translate('tableHeaders.actions', 'Actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredGroups.map((group) => (
                          <TableRow key={group.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{group.name}</p>
                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                  {group.description}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{group.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{group.member_count}{group.max_members ? `/${group.max_members}` : ''}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {!group.is_public && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Lock className="h-4 w-4" />
                                  <span className="text-sm">{translate('privacy.private', 'Private')}</span>
                                </div>
                              )}
                              {group.is_public && <span className="text-sm text-muted-foreground">{translate('privacy.public', 'Public')}</span>}
                            </TableCell>
                            <TableCell>{getStatusBadge(group.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {group.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => moderateGroup(group.id, 'approved')}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => moderateGroup(group.id, 'rejected', 'Does not meet guidelines')}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {group.status === 'approved' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => moderateGroup(group.id, 'flagged', 'Flagged for review')}
                                  >
                                    <Flag className="h-4 w-4 mr-1" />
                                    Flag
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AppLayout>
    </AdminGuard>
  );
};

export default GroupsModeration;