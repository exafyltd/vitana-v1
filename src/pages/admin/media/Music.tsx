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
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError, t } from '@/lib/i18n-toast';

export default function Music() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: music, refetch } = useQuery({
    queryKey: ['admin-music', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('media_uploads')
        .select('*, music_metadata(*)')
        .eq('media_type', 'music')
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
      notifyError('toasts.admin.error', 'toasts.admin.failedUpdateStatus');
    } else {
      notify('toasts.admin.success');
      refetch();
    }
  };

  const deleteMusic = async (id: string) => {
    const { error } = await supabase
      .from('media_uploads')
      .delete()
      .eq('id', id);

    if (error) {
      notifyError('toasts.admin.error', 'toasts.admin.failedDeleteMusic');
    } else {
      notify('toasts.admin.success', 'toasts.admin.musicDeleted');
      refetch();
    }
  };

  const filteredMusic = music?.filter(track => 
    searchQuery === '' || 
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.music_metadata?.[0]?.artist_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.musicMediaManagement')} 
        description="Manage music content"
        canonical={window.location.href}
      />
      <SubNavigation items={adminMediaNavigation} />
      
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('screens.admin.musicManagement')}</h1>
          <p className="text-muted-foreground">{t('screens.admin.reviewModerateMusicUploads')}</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder={t('screens.admin.searchMusic')} 
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Music Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Mood</TableHead>
                  <TableHead>Plays</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMusic?.map((track) => (
                  <TableRow key={track.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{track.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{track.music_metadata?.[0]?.artist_name || 'Unknown'}</TableCell>
                    <TableCell>
                      {track.music_metadata?.[0]?.genre && (
                        <Badge variant="outline">{track.music_metadata[0].genre}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {track.music_metadata?.[0]?.mood && (
                        <Badge variant="outline">{track.music_metadata[0].mood}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Play className="w-4 h-4" />
                        {track.plays_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        track.status === 'approved' ? 'default' :
                        track.status === 'pending' ? 'secondary' :
                        track.status === 'flagged' ? 'destructive' : 'outline'
                      }>
                        {track.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(track.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {track.status !== 'approved' && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(track.id, 'approved')}>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        {track.status !== 'rejected' && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(track.id, 'rejected')}>
                            <XCircle className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                        {track.status !== 'flagged' && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(track.id, 'flagged')}>
                            <Flag className="w-4 h-4 text-yellow-600" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteMusic(track.id)}>
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