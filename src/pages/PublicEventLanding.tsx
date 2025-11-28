import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import SEO from "@/components/SEO";
import { useAuth } from "@/context/AuthProvider";

interface PublicEventData {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  location: string | null;
  virtual_link: string | null;
  start_time: string;
  end_time: string | null;
  max_participants: number | null;
  participant_count: number;
  image_url?: string;
}

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
        // Fetch event data without authentication requirement
        const { data, error: fetchError } = await supabase
          .from("global_community_events")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) {
          console.error("Error fetching event:", fetchError);
          setError("Event not found");
          setLoading(false);
          return;
        }

        setEvent(data);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicEvent();
  }, [id]);

  const handleJoinClick = () => {
    if (!id) return;

    if (user) {
      // User is logged in, go directly to event page
      const params = new URLSearchParams(searchParams);
      navigate(`/comm/events-meetups?event=${id}${params.toString() ? '&' + params.toString() : ''}`);
    } else {
      // User not logged in, redirect to auth with return URL
      const returnUrl = `/comm/events-meetups?event=${id}${searchParams.toString() ? '&' + searchParams.toString() : ''}`;
      navigate(`/auth?redirectTo=${encodeURIComponent(returnUrl)}`);
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
      
      <div className="min-h-screen bg-background">
        {/* Hero Section with Cover Image */}
        {event.image_url && (
          <div className="relative w-full h-64 md:h-96 overflow-hidden">
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        )}

        {/* Content Section */}
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <div className="space-y-6">
            {/* Event Title */}
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {event.title}
              </h1>
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {event.event_type}
              </div>
            </div>

            {/* Event Details */}
            <div className="grid gap-4 md:grid-cols-2">
              {event.start_time && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{eventDate}</p>
                    <p className="text-sm text-muted-foreground">{eventTime}</p>
                  </div>
                </div>
              )}

              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Location</p>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Participants</p>
                  <p className="text-sm text-muted-foreground">
                    {event.participant_count} {event.max_participants ? `/ ${event.max_participants}` : ''} attending
                  </p>
                </div>
              </div>

              {event.end_time && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Duration</p>
                    <p className="text-sm text-muted-foreground">
                      Until {format(new Date(event.end_time), "h:mm a")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="prose prose-sm max-w-none">
                <p className="text-foreground/80 leading-relaxed">{event.description}</p>
              </div>
            )}

            {/* CTA Button */}
            <div className="pt-4">
              <Button
                size="lg"
                onClick={handleJoinClick}
                className="w-full md:w-auto px-8"
              >
                {user ? "View Event in VITANA" : "Join in VITANA"}
              </Button>
              {!user && (
                <p className="text-xs text-muted-foreground mt-2">
                  You'll be prompted to sign in or create an account
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border mt-12">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Powered by <span className="font-semibold text-foreground">VITANA</span> - Your wellness community
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
