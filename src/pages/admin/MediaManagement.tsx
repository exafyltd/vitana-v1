import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { adminMediaNavigation } from "@/config/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Music, Podcast, TrendingUp, Clock, AlertTriangle, CheckCircle, HardDrive } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { t } from '@/lib/i18n-toast';

export default function MediaManagement() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['media-stats'],
    queryFn: async () => {
      const { data: allMedia } = await supabase
        .from('media_uploads')
        .select('media_type, status, file_size', { count: 'exact' });

      const { data: recentUploads } = await supabase
        .from('media_uploads')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const totalByType = {
        video: allMedia?.filter(m => m.media_type === 'video').length || 0,
        podcast: allMedia?.filter(m => m.media_type === 'podcast').length || 0,
        music: allMedia?.filter(m => m.media_type === 'music').length || 0,
      };

      const pending = allMedia?.filter(m => m.status === 'pending').length || 0;
      const flagged = allMedia?.filter(m => m.status === 'flagged').length || 0;
      const approved = allMedia?.filter(m => m.status === 'approved').length || 0;

      const totalStorage = allMedia?.reduce((sum, m) => sum + (m.file_size || 0), 0) || 0;

      return {
        totalByType,
        pending,
        flagged,
        approved,
        recent24h: recentUploads?.length || 0,
        totalStorage: (totalStorage / (1024 * 1024 * 1024)).toFixed(2) // Convert to GB
      };
    }
  });

  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.mediaManagementAdmin')} 
        description="Manage platform media content"
        canonical={window.location.href}
      />
      <SubNavigation items={adminMediaNavigation} />
      
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('screens.admin.mediaManagement')}</h1>
          <p className="text-muted-foreground">
            Manage and moderate all platform media content
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Videos</CardTitle>
              <Video className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalByType.video || 0}</div>
              <p className="text-xs text-muted-foreground">{t('screens.admin.totalUploaded')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Podcasts</CardTitle>
              <Podcast className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalByType.podcast || 0}</div>
              <p className="text-xs text-muted-foreground">{t('screens.admin.totalUploaded')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Music</CardTitle>
              <Music className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalByType.music || 0}</div>
              <p className="text-xs text-muted-foreground">{t('screens.admin.totalUploaded')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('screens.admin.storageUsed')}</CardTitle>
              <HardDrive className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalStorage || 0} GB</div>
              <p className="text-xs text-muted-foreground">{t('screens.admin.totalStorage')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Moderation Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/media/videos?status=pending')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('screens.admin.pendingModeration')}</CardTitle>
              <Clock className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">{t('screens.admin.awaitingReview')}</p>
              <Button size="sm" className="w-full mt-3" variant="outline">
                Review Now
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/media/videos?status=flagged')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('screens.admin.flaggedContent')}</CardTitle>
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.flagged || 0}</div>
              <p className="text-xs text-muted-foreground">{t('screens.admin.needsAttention')}</p>
              <Button size="sm" className="w-full mt-3" variant="destructive">
                Review Flags
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.approved || 0}</div>
              <p className="text-xs text-muted-foreground">{t('screens.admin.livePlatform')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Uploads (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{stats?.recent24h || 0}</div>
            <p className="text-sm text-muted-foreground">
              New media items uploaded in the last 24 hours
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button onClick={() => navigate('/admin/media/videos')} variant="outline" className="h-20">
            <div className="text-center">
              <Video className="w-6 h-6 mx-auto mb-2" />
              <span>{t('screens.admin.manageVideos')}</span>
            </div>
          </Button>
          <Button onClick={() => navigate('/admin/media/podcasts')} variant="outline" className="h-20">
            <div className="text-center">
              <Podcast className="w-6 h-6 mx-auto mb-2" />
              <span>{t('screens.admin.managePodcasts')}</span>
            </div>
          </Button>
          <Button onClick={() => navigate('/admin/media/music')} variant="outline" className="h-20">
            <div className="text-center">
              <Music className="w-6 h-6 mx-auto mb-2" />
              <span>{t('screens.admin.manageMusic')}</span>
            </div>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}