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
import { Eye, ThumbsUp, CheckCircle, XCircle, Flag, Trash2, Star, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError, t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
export default function Videos() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: videos, refetch } = useQuery({
    queryKey: ['admin-videos', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('media_uploads')
        .select('*, video_metadata(*)')
        .eq('media_type', 'video')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        // A DB failure here previously rendered as "no videos to review" —
        // indistinguishable from a genuinely empty moderation queue —
        // hiding real pending videos with nothing in the console.
        console.error('[AdminVideos] Failed to load moderation queue:', error);
      }

      // Fetch uploader profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(v => v.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('[AdminVideos] Failed to load uploader profiles:', profilesError);
        }

        return data.map(video => ({
          ...video,
          uploader: profiles?.find(p => p.user_id === video.user_id)
        }));
      }

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
      notifyError('toasts.admin.error', 'toasts.admin.failedUpdateStatus');
    } else {
      notify('toasts.admin.success');
      refetch();
    }
  };

  const deleteVideo = async (id: string) => {
    const { error } = await supabase
      .from('media_uploads')
      .delete()
      .eq('id', id);

    if (error) {
      notifyError('toasts.admin.error', 'toasts.admin.failedDeleteVideo');
    } else {
      notify('toasts.admin.success', 'toasts.admin.videoDeleted');
      refetch();
    }
  };

  const filteredVideos = videos?.filter(video => 
    searchQuery === '' || 
    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (video as any).uploader?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.videosMediaManagement')} 
        description="Manage video content"
        canonical={window.location.href}
      />
      <SubNavigation items={adminMediaNavigation} />
      
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('screens.admin.videoManagement')}</h1>
          <p className="text-muted-foreground">{t('screens.admin.reviewModerateVideoUploads')}</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder={t('screens.admin.searchVideos')} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('screens.admin.filterByStatus2')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('screens.admin.allStatus')}</SelectItem>
                  <SelectItem value="pending">{t('screens.admin.pending')}</SelectItem>
                  <SelectItem value="approved">{t('screens.admin.approved')}</SelectItem>
                  <SelectItem value="rejected">{t('screens.admin.rejected')}</SelectItem>
                  <SelectItem value="flagged">{t('screens.admin.flagged')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Videos Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('screens.admin.video')}</TableHead>
                  <TableHead>{t('screens.admin.uploader')}</TableHead>
                  <TableHead>{t('screens.admin.duration')}</TableHead>
                  <TableHead>{t('screens.admin.views')}</TableHead>
                  <TableHead>{t('screens.admin.likes')}</TableHead>
                  <TableHead>{t('screens.admin.status')}</TableHead>
                  <TableHead>{t('screens.admin.date')}</TableHead>
                  <TableHead className="text-right">{t('screens.admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVideos?.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-10 bg-muted rounded overflow-hidden">
                          {video.thumbnail_url && (
                            <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{video.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">{video.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{(video as any).uploader?.display_name || 'Unknown'}</TableCell>
                    <TableCell>{video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {video.views_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {video.likes_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        video.status === 'approved' ? 'default' :
                        video.status === 'pending' ? 'secondary' :
                        video.status === 'flagged' ? 'destructive' : 'outline'
                      }>
                        {video.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(new Date(video.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {video.status !== 'approved' && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(video.id, 'approved')}>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        {video.status !== 'rejected' && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(video.id, 'rejected')}>
                            <XCircle className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                        {video.status !== 'flagged' && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(video.id, 'flagged')}>
                            <Flag className="w-4 h-4 text-yellow-600" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteVideo(video.id)}>
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