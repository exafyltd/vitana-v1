import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { adminMediaNavigation } from "@/config/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, CheckCircle, XCircle, Flag, Trash2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';

export default function Podcasts() {
  const { toast } = useToast();
  const { translate } = useTranslation();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: podcasts, refetch } = useQuery({
    queryKey: ['admin-podcasts', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('media_uploads')
        .select('*, podcast_metadata(*)')
        .eq('media_type', 'podcast')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      return data || [];
    }
  });

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('media_uploads')
      .update({ 
        status: newStatus,
        moderated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast({ 
        title: translate('payment.error'), 
        description: translate('admin.media.updateFailed'), 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: translate('toasts.success.generic'), 
        description: translate('admin.media.podcastStatus').replace('{status}', newStatus) 
      });
      refetch();
    }
  };

  const deletePodcast = async (id: string) => {
    const { error } = await supabase
      .from('media_uploads')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ 
        title: translate('payment.error'), 
        description: translate('admin.media.deleteFailed'), 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: translate('toasts.success.generic'), 
        description: translate('admin.media.podcastDeleted') 
      });
      refetch();
    }
  };

  const filteredPodcasts = podcasts?.filter(podcast => 
    searchQuery === '' || 
    podcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    podcast.podcast_metadata?.[0]?.host_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.podcastsMediaManagement')} 
        description="Manage podcast content"
        canonical={window.location.href}
      />
      <SubNavigation items={adminMediaNavigation} />
      
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{translate('admin.media.podcastManagement')}</h1>
          <p className="text-muted-foreground">{translate('admin.media.podcastManagementDesc')}</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder={translate('admin.media.searchPodcasts')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={translate('admin.media.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{translate('admin.media.allStatus')}</SelectItem>
                  <SelectItem value="pending">{translate('admin.media.pending')}</SelectItem>
                  <SelectItem value="approved">{translate('admin.media.approved')}</SelectItem>
                  <SelectItem value="rejected">{translate('admin.media.rejected')}</SelectItem>
                  <SelectItem value="flagged">{translate('admin.media.flagged')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Podcasts Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Episode</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Plays</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPodcasts?.map((podcast) => (
                  <TableRow key={podcast.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{podcast.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">{podcast.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {podcast.podcast_metadata?.[0]?.host_name || 'Unknown Host'}
                    </TableCell>
                    <TableCell>
                      {podcast.podcast_metadata?.[0]?.episode_number
                        ? `Ep. ${podcast.podcast_metadata[0].episode_number}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{podcast.duration ? `${Math.floor(podcast.duration / 60)}:${(podcast.duration % 60).toString().padStart(2, '0')}` : 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Play className="w-4 h-4" />
                        {podcast.plays_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        podcast.status === 'approved' ? 'default' :
                        podcast.status === 'pending' ? 'secondary' :
                        podcast.status === 'flagged' ? 'destructive' : 'outline'
                      }>
                        {podcast.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(podcast.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {podcast.status !== 'approved' && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(podcast.id, 'approved')}>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        {podcast.status !== 'rejected' && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(podcast.id, 'rejected')}>
                            <XCircle className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                        {podcast.status !== 'flagged' && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(podcast.id, 'flagged')}>
                            <Flag className="w-4 h-4 text-yellow-600" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deletePodcast(podcast.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}