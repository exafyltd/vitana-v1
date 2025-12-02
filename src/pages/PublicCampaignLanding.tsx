import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Target, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import SEO from "@/components/SEO";
import { useAuth } from "@/context/AuthProvider";

interface PublicCampaignData {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  target_channels: any;
  metadata: any;
  created_at: string;
  owner_id: string;
  owner_name: string;
  owner_avatar: string | null;
}

export default function PublicCampaignLanding() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<PublicCampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicCampaign = async () => {
      if (!id) {
        setError("Campaign ID is missing");
        setLoading(false);
        return;
      }

      try {
        // Use RPC function to bypass RLS for public campaign access
        const { data, error: fetchError } = await supabase.rpc("get_public_campaign_details", {
          campaign_id: id,
        });

        if (fetchError) {
          console.error("Error fetching campaign:", fetchError);
          setError("Campaign not found");
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setError("Campaign not found");
          setLoading(false);
          return;
        }

        setCampaign(data[0] as PublicCampaignData);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load campaign");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicCampaign();
  }, [id]);

  const handleJoinClick = () => {
    if (!id) return;

    if (user) {
      // User is logged in, go directly to campaign detail page
      const params = new URLSearchParams(searchParams);
      navigate(`/sharing/campaigns/${id}${params.toString() ? '?' + params.toString() : ''}`);
    } else {
      // User not logged in, redirect to auth with return URL
      const returnUrl = `/sharing/campaigns/${id}${searchParams.toString() ? '&' + searchParams.toString() : ''}`;
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

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Campaign Not Found</h1>
          <p className="text-muted-foreground">{error || "The campaign you're looking for doesn't exist."}</p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  const publicCampaignUrl = `${window.location.origin}/pub/campaigns/${campaign.id}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const startDate = campaign.start_date ? format(new Date(campaign.start_date), "MMMM d, yyyy") : "";
  const endDate = campaign.end_date ? format(new Date(campaign.end_date), "MMMM d, yyyy") : "";
  const shortDescription = campaign.description?.slice(0, 160) || `Check out ${campaign.name} on VITANA`;
  
  // Robust fallback chain matching event card pattern
  const heroImage = 
    campaign.cover_image_url ||
    (campaign as any).image_url ||
    campaign.metadata?.image_url ||
    campaign.metadata?.cover_image_url ||
    campaign.metadata?.event_image_url ||
    null;
  
  // Check if campaign is draft (hide status badge for draft on public view)
  const isDraft = campaign.status?.toLowerCase() === 'draft';
  const displayStatus = !isDraft ? campaign.status : null;

  return (
    <>
      <SEO
        title={campaign.name}
        description={shortDescription}
        image={heroImage || undefined}
        url={publicCampaignUrl}
        type="website"
      />
      
      <div className="min-h-screen bg-background flex flex-col">
        {/* Hero Section - Compact banner */}
        {heroImage ? (
          <div className="relative w-full h-48 md:h-[240px] max-h-[260px] overflow-hidden">
            <img
              src={heroImage}
              alt={campaign.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        ) : (
          <div className="relative w-full h-32 md:h-[160px] overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
        )}

        {/* Content Section */}
        <div className="flex-1 flex flex-col">
          <div className="max-w-4xl mx-auto px-4 py-4 md:py-6 -mt-6 md:-mt-8 relative z-10">
            <div className="space-y-3 md:space-y-4">
              {/* Campaign Title */}
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {campaign.name}
                </h1>
              {displayStatus && (
                <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium capitalize">
                  {displayStatus}
                </div>
              )}
            </div>

              {/* Campaign Details */}
              <div className="grid gap-2 md:gap-3 md:grid-cols-2">
              {campaign.start_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Campaign Period</p>
                    <p className="text-sm text-muted-foreground">
                      {startDate} {endDate && `- ${endDate}`}
                    </p>
                  </div>
                </div>
              )}

              {campaign.target_channels && Array.isArray(campaign.target_channels) && (
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Channels</p>
                    <p className="text-sm text-muted-foreground">
                      {campaign.target_channels.length} channel{campaign.target_channels.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Type</p>
                  <p className="text-sm text-muted-foreground">Marketing Campaign</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Community</p>
                  <p className="text-sm text-muted-foreground">VITANA</p>
                </div>
              </div>
            </div>

              {/* Description */}
              {campaign.description && (
                <div className="max-w-3xl">
                  <p className="text-base text-foreground/80 leading-normal">{campaign.description}</p>
                </div>
              )}

              {/* CTA Button */}
              <div className="pt-3 md:pt-4">
                <Button
                  size="default"
                  onClick={handleJoinClick}
                  className="w-full md:w-auto px-5 py-2.5 text-sm"
                >
                  {user ? "View Campaign in VITANA" : "Join in VITANA"}
                </Button>
                {!user && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    You'll be prompted to sign in or create an account
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border mt-auto">
          <div className="max-w-4xl mx-auto px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              Powered by <span className="font-semibold text-foreground">VITANA</span> - Your wellness community
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
