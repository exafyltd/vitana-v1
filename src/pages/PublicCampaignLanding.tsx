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
  status: string;
  start_date: string | null;
  end_date: string | null;
  target_channels: any;
  metadata: any;
  created_at: string;
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
        // Fetch campaign data directly - campaigns table should have RLS configured for public access
        const { data, error: fetchError } = await supabase
          .from("campaigns")
          .select("*")
          .eq("id", id)
          .eq("status", "active") // Only show active campaigns publicly
          .single();

        if (fetchError) {
          console.error("Error fetching campaign:", fetchError);
          setError("Campaign not found");
          setLoading(false);
          return;
        }

        if (!data) {
          setError("Campaign not found");
          setLoading(false);
          return;
        }

        setCampaign(data as PublicCampaignData);
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
  const coverImage = campaign.metadata?.coverImage || campaign.metadata?.image_url || null;

  return (
    <>
      <SEO
        title={campaign.name}
        description={shortDescription}
        image={coverImage}
        url={publicCampaignUrl}
        type="website"
      />
      
      <div className="min-h-screen bg-background">
        {/* Hero Section with Cover Image */}
        {coverImage && (
          <div className="relative w-full h-64 md:h-96 overflow-hidden">
            <img
              src={coverImage}
              alt={campaign.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        )}

        {/* Content Section */}
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <div className="space-y-6">
            {/* Campaign Title */}
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {campaign.name}
              </h1>
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium capitalize">
                {campaign.status}
              </div>
            </div>

            {/* Campaign Details */}
            <div className="grid gap-4 md:grid-cols-2">
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
              <div className="prose prose-sm max-w-none">
                <p className="text-foreground/80 leading-relaxed">{campaign.description}</p>
              </div>
            )}

            {/* CTA Button */}
            <div className="pt-4">
              <Button
                size="lg"
                onClick={handleJoinClick}
                className="w-full md:w-auto px-8"
              >
                {user ? "View Campaign in VITANA" : "Join in VITANA"}
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
