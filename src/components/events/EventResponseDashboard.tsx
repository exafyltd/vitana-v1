import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, X, Clock, Users, TrendingUp, Send } from "lucide-react";
import { Loader2 } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface EventResponseDashboardProps {
  eventId: string;
  className?: string;
}

interface Attendee {
  id: string;
  user_id: string;
  response: string;
  responded_at: string | null;
  display_name?: string;
  avatar_url?: string;
}

interface Analytics {
  channel: string;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  response_count: number;
}

export function EventResponseDashboard({ eventId, className }: EventResponseDashboardProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load attendees
      const { data: attendeesData, error: attendeesError } = await supabase
        .from("event_attendees")
        .select("*")
        .eq("event_id", eventId)
        .order("invited_at", { ascending: false });

      if (attendeesError) throw attendeesError;

      // Enrich with profile data
      const enrichedAttendees = await Promise.all(
        (attendeesData || []).map(async (attendee) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("user_id", attendee.user_id)
            .single();

          return {
            ...attendee,
            display_name: profile?.display_name,
            avatar_url: profile?.avatar_url,
          };
        })
      );

      // Load analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("invite_analytics")
        .select("*")
        .eq("event_id", eventId);

      if (analyticsError) throw analyticsError;

      setAttendees(enrichedAttendees);
      setAnalytics(analyticsData || []);
    } catch (error) {
      console.error("Error loading event data:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    accepted: attendees.filter((a) => a.response === "accepted").length,
    declined: attendees.filter((a) => a.response === "declined").length,
    maybe: attendees.filter((a) => a.response === "maybe").length,
    pending: attendees.filter((a) => a.response === "pending").length,
    total: attendees.length,
  };

  const totalSent = analytics.reduce((sum, a) => sum + a.sent_count, 0);
  const totalResponses = analytics.reduce((sum, a) => sum + a.response_count, 0);
  const responseRate = totalSent > 0 ? ((totalResponses / totalSent) * 100).toFixed(1) : "0";

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.accepted}</p>
                <p className="text-sm text-muted-foreground">{t('screens.events.accepted')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.maybe}</p>
                <p className="text-sm text-muted-foreground">{t('screens.events.maybe')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.declined}</p>
                <p className="text-sm text-muted-foreground">{t('screens.events.declined')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">{t('screens.events.pending')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics */}
      {analytics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t('screens.events.distributionAnalytics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.map((item) => (
                <div key={item.channel} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Send className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium capitalize">{item.channel}</p>
                      <p className="text-sm text-muted-foreground">{t('screens.events.sent_countSentResponse_countResponded', { sent_count: item.sent_count, response_count: item.response_count })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {item.sent_count > 0
                      ? `${((item.response_count / item.sent_count) * 100).toFixed(0)}%`
                      : "0%"}
                  </Badge>
                </div>
              ))}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{t('screens.events.overallResponseRate')}</p>
                  <Badge className="bg-green-600 text-white">{responseRate}%</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendee List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />{t('screens.events.attendeesTotal', { total: stats.total })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendees.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('screens.events.noInvitationsSentYetStartInviting')}
            </p>
          ) : (
            <div className="space-y-3">
              {attendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={attendee.avatar_url} />
                      <AvatarFallback>
                        {attendee.display_name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{attendee.display_name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">
                        {attendee.responded_at
                          ? `Responded ${new Date(attendee.responded_at).toLocaleDateString()}`
                          : "Not responded yet"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      attendee.response === "accepted"
                        ? "default"
                        : attendee.response === "declined"
                        ? "destructive"
                        : "secondary"
                    }
                    className={
                      attendee.response === "accepted"
                        ? "bg-green-600 text-white"
                        : attendee.response === "maybe"
                        ? "bg-yellow-600 text-white"
                        : ""
                    }
                  >
                    {attendee.response}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
