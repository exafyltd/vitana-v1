import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { adminMediaNavigation } from "@/config/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Eye, ThumbsUp, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

export default function Analytics() {
  const { data: stats } = useQuery({
    queryKey: ['media-analytics'],
    queryFn: async () => {
      const { data: media } = await supabase
        .from('media_uploads')
        .select('*')
        .eq('status', 'approved');

      const totalViews = media?.reduce((sum, m) => sum + m.views_count, 0) || 0;
      const totalLikes = media?.reduce((sum, m) => sum + m.likes_count, 0) || 0;
      const totalPlays = media?.reduce((sum, m) => sum + m.plays_count, 0) || 0;

      // Top performing content
      const topVideos = media
        ?.filter(m => m.media_type === 'video')
        .sort((a, b) => b.views_count - a.views_count)
        .slice(0, 5) || [];

      const topPodcasts = media
        ?.filter(m => m.media_type === 'podcast')
        .sort((a, b) => b.plays_count - a.plays_count)
        .slice(0, 5) || [];

      const topMusic = media
        ?.filter(m => m.media_type === 'music')
        .sort((a, b) => b.plays_count - a.plays_count)
        .slice(0, 5) || [];

      return {
        totalViews,
        totalLikes,
        totalPlays,
        topVideos,
        topPodcasts,
        topMusic
      };
    }
  });

  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.analyticsMediaManagement')} 
        description="Media performance analytics"
        canonical={window.location.href}
      />
      <SubNavigation items={adminMediaNavigation} />
      
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('screens.admin.mediaAnalytics')}</h1>
          <p className="text-muted-foreground">{t('screens.admin.performanceMetricsInsights')}</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('screens.admin.totalViews')}</CardTitle>
              <Eye className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalViews.toLocaleString() || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('screens.admin.totalLikes')}</CardTitle>
              <ThumbsUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalLikes.toLocaleString() || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('screens.admin.totalPlays')}</CardTitle>
              <Play className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPlays.toLocaleString() || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t('screens.admin.topVideos')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.topVideos.map((video, index) => (
                  <div key={video.id} className="flex items-center gap-3 p-2 border rounded">
                    <div className="font-semibold text-muted-foreground">{index + 1}</div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{video.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {video.views_count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t('screens.admin.topPodcasts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.topPodcasts.map((podcast, index) => (
                  <div key={podcast.id} className="flex items-center gap-3 p-2 border rounded">
                    <div className="font-semibold text-muted-foreground">{index + 1}</div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{podcast.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          {podcast.plays_count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t('screens.admin.topMusic')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.topMusic.map((track, index) => (
                  <div key={track.id} className="flex items-center gap-3 p-2 border rounded">
                    <div className="font-semibold text-muted-foreground">{index + 1}</div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{track.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          {track.plays_count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}