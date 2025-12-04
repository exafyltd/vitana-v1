import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Clock, CalendarDays, Sparkles } from "lucide-react";
import { format } from "date-fns";
import SEO from "@/components/SEO";
import { useAuth } from "@/context/AuthProvider";

interface PublicEventData {
  id: string;
  title: string;
  description: string;
  event_type: string;
  location: string;
  start_time: string;
  end_time: string | null;
  max_participants: number | null;
  participant_count: number;
  image_url: string | null;
  organizer_name: string;
  organizer_avatar: string | null;
  metadata?: Record<string, any> | null;
}

// Helper to get tenant-specific login route
const getTenantLoginRoute = (tenantSlug: string | null): string => {
  const tenantRoutes: Record<string, string> = {
    maxina: '/maxina',
    alkalma: '/alkalma',
    earthlinks: '/earthlinks',
  };
  return tenantSlug && tenantRoutes[tenantSlug] ? tenantRoutes[tenantSlug] : '/maxina';
};

export default function PublicEventLanding() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<PublicEventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicEvent = async () => {
      if (!id) {
        setError("Event ID is missing");
        setLoading(false);
        return;
      }

      try {
        // Fetch event data via public RPC function (bypasses RLS)
        const { data, error: fetchError } = await supabase
          .rpc("get_public_event_details", { event_id: id });

        if (fetchError) {
          console.error("Error fetching event:", fetchError);
          setError("Event not found");
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setError("Event not found");
          setLoading(false);
          return;
        }

        // RPC returns an array, take the first item
        setEvent(data[0] as PublicEventData);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicEvent();
  }, [id]);

  // Get tenant from event metadata for proper login routing
  const tenantSlug = event?.metadata?.tenant_slug || 
                     event?.metadata?.tenantSlug || 
                     localStorage.getItem('tenant_slug') || 
                     null;

  const handleJoinClick = () => {
    if (!id) return;

    if (user) {
      // User is logged in, go directly to event page
      const params = new URLSearchParams(searchParams);
      navigate(`/comm/events-meetups?event=${id}${params.toString() ? '&' + params.toString() : ''}`);
    } else {
      // User not logged in, redirect to tenant-specific login with return URL
      const returnUrl = `/comm/events-meetups?event=${id}${searchParams.toString() ? '&' + searchParams.toString() : ''}`;
      const loginRoute = getTenantLoginRoute(tenantSlug);
      navigate(`${loginRoute}?redirectTo=${encodeURIComponent(returnUrl)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Event Not Found</h1>
          <p className="text-muted-foreground">{error || "The event you're looking for doesn't exist."}</p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  const publicEventUrl = `${window.location.origin}/pub/events/${event.id}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const eventDate = event.start_time ? format(new Date(event.start_time), "EEEE, MMMM d, yyyy") : "";
  const eventTime = event.start_time ? format(new Date(event.start_time), "h:mm a") : "";
  const shortDescription = event.description?.slice(0, 160) || `Join us for ${event.title}`;

  return (
    <>
      <SEO
        title={event.title}
        description={shortDescription}
        image={event.image_url}
        url={publicEventUrl}
        type="event"
      />
      
      <div className="min-h-screen bg-background flex flex-col">
        {/* Hero Section - Compact banner */}
        {event.image_url ? (
          <div className="relative w-full h-[300px] md:h-[380px] overflow-hidden">
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background from-30% via-background/80 via-60% to-transparent" />
          </div>
        ) : (
          <div className="relative w-full h-[200px] md:h-[260px] overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
        )}

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="max-w-4xl mx-auto px-4 py-2 md:py-3 -mt-36 md:-mt-48 relative z-10">
            <div className="space-y-1.5 md:space-y-2">
              {/* Event Title */}
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {event.title}
                </h1>
                <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {event.event_type}
                </div>
              </div>

              {/* Event Details - Vertical stacked layout */}
              <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                {event.start_time && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date & Time</p>
                      <p className="text-sm font-medium text-foreground">
                        {eventDate} at {eventTime}
                      </p>
                    </div>
                  </div>
                )}

                {event.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium text-foreground">{event.location}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Attending</p>
                    <p className="text-sm font-medium text-foreground">
                      {event.participant_count} {event.max_participants ? `/ ${event.max_participants}` : ''} people
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Hosted by</p>
                    <p className="text-sm font-medium text-foreground">{event.organizer_name}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div className="max-w-3xl">
                  <p className="text-base text-foreground/80 leading-normal">{event.description}</p>
                </div>
              )}

              {/* Dual CTA Panel */}
              <div className="mt-3 md:mt-4">
                <div className="rounded-2xl border border-white/60 bg-white/70 dark:bg-white/10 dark:border-white/20 backdrop-blur-sm shadow-md px-6 md:px-8 py-5">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 md:gap-8">
                    
                    {/* Left: Primary Event CTA */}
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        <span>Join this event</span>
                      </div>
                      <Button
                        size="default"
                        onClick={handleJoinClick}
                        className="w-full md:w-auto px-6"
                      >
                        {user ? "View Event Details" : "Reserve My Spot"}
                      </Button>
                    </div>
                    
                    {/* Divider */}
                    <div className="hidden md:block w-px h-14 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
                    <div className="flex items-center justify-center gap-3 md:hidden">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-700" />
                      <span className="text-xs text-muted-foreground font-medium">or</span>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-700" />
                    </div>
                    
                    {/* Right: Community CTA */}
                    <div className="flex-1 flex flex-col items-start md:items-end gap-2">
                      <div className="flex items-start gap-1.5 max-w-[280px] md:max-w-xs text-left md:text-right">
                        <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-medium tracking-wide text-muted-foreground leading-relaxed">
                          Discover more events and longevity communities.
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => {
                          if (user) {
                            navigate('/comm/events-meetups');
                          } else {
                            const returnUrl = '/comm/events-meetups';
                            const loginRoute = getTenantLoginRoute(tenantSlug);
                            navigate(`${loginRoute}?redirectTo=${encodeURIComponent(returnUrl)}`);
                          }
                        }}
                        className="w-full md:w-auto border-primary/40 text-primary bg-transparent hover:bg-primary/5 rounded-full px-5"
                      >
                        {user ? "Explore VITANA" : "Join in VITANA"}
                      </Button>
                      {!user && (
                        <p className="text-[11px] text-muted-foreground/70 text-left md:text-right max-w-xs">
                          You'll sign in or create an account in the next step.
                        </p>
                      )}
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border mt-auto">
          <div className="max-w-4xl mx-auto px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              Powered by <span className="font-semibold text-foreground">VITANA</span> - Your longevity community
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
