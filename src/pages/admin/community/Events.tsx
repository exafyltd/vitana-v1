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
import { CheckCircle, XCircle, Flag, Eye, Calendar, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyError, t } from '@/lib/i18n-toast';

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  participant_count: number;
  max_participants: number | null;
  created_by: string;
  status?: string;
  moderation_notes?: string | null;
  moderated_at?: string | null;
  created_at: string;
}

const EventsModeration = () => {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    fetchEvents();
    
    // Realtime subscription
    const channel = supabase
      .channel('admin-events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_community_events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('global_community_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      notifyError('toasts.admin.failedLoadEvents');
    } finally {
      setLoading(false);
    }
  };

  const moderateEvent = async (eventId: string, status: 'approved' | 'rejected' | 'flagged', notes?: string) => {
    try {
      const { error } = await supabase
        .from('global_community_events')
        .update({
          status,
          moderation_notes: notes,
          moderated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;
      toast.success(`Event ${status}`);
      fetchEvents();
    } catch (error) {
      console.error('Error moderating event:', error);
      notifyError('toasts.admin.failedModerateEvent');
    }
  };

  const filteredEvents = events.filter(event => {
    const eventStatus = event.status || 'approved';
    if (activeTab === 'all') return true;
    return eventStatus === activeTab;
  });

  const getStatusBadge = (status?: string) => {
    const actualStatus = status || 'approved';
    const variants = {
      pending: { variant: "secondary" as const, label: "Pending", color: "text-yellow-600" },
      approved: { variant: "default" as const, label: "Approved", color: "text-green-600" },
      rejected: { variant: "destructive" as const, label: "Rejected", color: "text-red-600" },
      flagged: { variant: "outline" as const, label: "Flagged", color: "text-orange-600" }
    };
    const config = variants[actualStatus as keyof typeof variants] || variants.approved;
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
  };

  return (
    <AdminGuard>
      <AppLayout>
        <SEO title={t('screens.admin.eventsModerationAdmin')} description="Review and moderate community events" />
        
        <SubNavigation items={adminCommunityNavigation} />
        
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-6">
            <AdminHeader
              title={t('screens.admin.eventsModeration')}
              description="Review, approve, or reject community events and meetups"
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="flagged">Flagged</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                <Card>
                  {loading ? (
                    <div className="p-12 text-center text-muted-foreground">{t('screens.admin.loadingEvents')}</div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="p-12 text-center">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">{t('screens.admin.noEventsFound')}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Participants</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEvents.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{event.title}</p>
                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                  {event.description}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{event.event_type}</Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(event.start_time).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{event.participant_count}{event.max_participants ? `/${event.max_participants}` : ''}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(event.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {(!event.status || event.status === 'pending') && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => moderateEvent(event.id, 'approved')}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => moderateEvent(event.id, 'rejected', 'Does not meet community guidelines')}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {event.status === 'approved' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => moderateEvent(event.id, 'flagged', 'Flagged for review')}
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

export default EventsModeration;