import React, { useState, useEffect, useRef, useCallback } from 'react';
import VitanaIndexValue from "@/components/health/VitanaIndexValue";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart,
  Sparkles,
  Grid3X3,
  Share2,
  TestTube2,
  Stethoscope,
  Pill,
  Plane,
  MapPin,
  Brain,
  TrendingUp,
  Users,
  Award,
  DollarSign,
  Plus,
  RefreshCw
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import SEO from '@/components/SEO';
import SubNavigation from '@/components/SubNavigation';
import StandardHeader from '@/components/StandardHeader';
import { UtilityActionButton } from '@/components/ui/utility-action-button';
import { ExpandableSearchButton } from '@/components/ui/expandable-search-button';
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import { DiscoverMasterActionPopup } from '@/components/discover/DiscoverMasterActionPopup';
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from '@/components/ui/split-bar';
import { AutopilotPopup } from '@/components/AutopilotPopup';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutopilot } from '@/hooks/use-autopilot';
import { cn } from '@/lib/utils';
import { MobileDiscoverView } from '@/components/discover/MobileDiscoverView';
import { MobileModePill } from '@/components/ui/MobileModePill';
import { useMarketplaceFeed, formatPrice, getRedirectUrl, type MarketplaceProduct } from '@/hooks/useMarketplace';
import { MarketplaceProductCard } from '@/components/discover/MarketplaceProductCard';
import { ScopeSelector } from '@/components/discover/ScopeSelector';
import { HiddenByLimitationsFooter } from '@/components/discover/HiddenByLimitationsFooter';
import { AffiliateDisclosure } from '@/components/discover/AffiliateDisclosure';
import { ProductDetailsDrawer } from '@/components/discover/ProductDetailsDrawer';
import { ProductSelectionProvider, useProductSelection } from '@/context/ProductSelectionContext';

import { discoverNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { UniversalShareButton } from '@/components/sharing/UniversalShareButton';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/hooks/use-toast';
import { notifyError, t } from '@/lib/i18n-toast';
import { useAuth } from '@/context/AuthProvider';
import { loginRouteWithRedirect } from '@/lib/guest-auth';
import { Gift } from 'lucide-react';

// VTID-NAV-DISCOVER-TABS: the Discover mode pills (shared by mobile pill +
// desktop split-bar). Vitana deep-links to a pill via /discover?tab=<value>
// (e.g. ?tab=categories); the gateway navigation catalog routes
// "Discover <Pill>" here. Returns null for absent/invalid so an unrelated
// searchParams change (e.g. the ?m= match cleanup) never resets the pill.
const VALID_DISCOVER_TABS = new Set<string>(['suggested', 'categories', 'share']);
function resolveDiscoverTab(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  return VALID_DISCOVER_TABS.has(v) ? v : null;
}

function DiscoverInner() {
  const { selectProduct } = useProductSelection();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { logActivity } = useActivityLogger();
  const { pendingCount } = useAutopilot();
  const { translate } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(() => resolveDiscoverTab(searchParams.get('tab')) ?? 'suggested');
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(null);

  // VTID-NAV-DISCOVER-TABS: honor ?tab= deep-links (e.g. Vitana navigates to
  // /discover?tab=categories). Only acts on an explicit valid value, so the
  // ?m= cleanup below never clobbers the active pill.
  useEffect(() => {
    const tab = resolveDiscoverTab(searchParams.get('tab'));
    if (tab) setActiveTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Handle ?m= deep link for match highlights
  useEffect(() => {
    const matchId = searchParams.get('m');
    if (!matchId) return;

    // Clear the param from URL immediately
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('m');
    setSearchParams(nextParams, { replace: true });

    // Try to find and scroll to the match element
    const tryScroll = (attempts = 0) => {
      const el = document.querySelector(`[data-match-id="${matchId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMatchId(matchId);
        // Remove highlight after 3 seconds
        setTimeout(() => setHighlightedMatchId(null), 3000);
        return;
      }
      // Retry a few times to allow for lazy-loaded content
      if (attempts < 5) {
        setTimeout(() => tryScroll(attempts + 1), 400);
      } else {
        notifyError('toasts.discover.matchNotFound', 'toasts.discover.thisMatchNoLongerAvailable');
      }
    };

    // Delay slightly to let page render
    setTimeout(() => tryScroll(), 300);
  }, [searchParams, setSearchParams, toast]);

  // Log discover page view
  useEffect(() => {
    logActivity({
      activityType: 'discover.view',
      activityData: { page: 'overview' },
      dedupeKey: `discover-view-${Date.now()}`,
    });
  }, []);

  // VTID-02000: Real marketplace feed (replaces hardcoded mock data)
  const [scope, setScope] = useState<string>("friendly");
  const { data: feedData, isLoading: feedLoading } = useMarketplaceFeed({ limit: 12 });

  // Signed-out visitors browse a public storefront. The backend serves the
  // guest starter feed (feed_context.guest === true); fall back to !user so the
  // CTA shows even before the feed resolves.
  const isGuest = !user || feedData?.feed_context?.guest === true;
  const goToSignIn = () => navigate(loginRouteWithRedirect());

  // Map marketplace products to the legacy AIRecommendation shape so
  // MobileDiscoverView doesn't need changes yet.
  const aiRecommendations = (feedData?.items ?? []).map((p: MarketplaceProduct, idx: number) => ({
    id: idx + 1,
    title: p.title,
    description: p.description ?? "",
    price: formatPrice(p.price_cents, p.currency),
    match: Math.round((p.match_score ?? p.rank_score ?? 0.7) * 100),
    reason: p.match_reasons?.[0]?.text ?? p.rank_reasons?.[0] ?? "",
    provider: p.brand ?? "Vitana Shop",
    image: p.images?.[0] ?? "/lovable-uploads/tae-min-avatar.jpg",
    badge: (p.match_score ?? p.rank_score ?? 0) > 0.8 ? t('discover.matchPerfect') : (p.match_score ?? p.rank_score ?? 0) > 0.5 ? t('discover.matchGreat') : t('discover.matchGood'),
    // Keep the real product data for the new card component
    _product: p,
  }));

  const browseCategories = [
    {
      id: 'supplements',
      title: 'Supplements',
      icon: Pill,
      description: 'Premium vitamins, minerals, and longevity compounds',
      count: 247,
      path: '/discover/supplements'
    },
    {
      id: 'wellness',
      title: 'Wellness Services',
      icon: Heart,
      description: 'Therapies, treatments, and wellness experiences',
      count: 156,
      path: '/discover/wellness-services'
    },
    {
      id: 'lab_tests',
      title: 'Lab Tests',
      icon: TestTube2,
      description: 'Biomarker analysis and health diagnostics',
      count: 89,
      path: '/health/services-hub'
    },
    {
      id: 'doctors',
      title: 'Doctors & Coaches',
      icon: Stethoscope,
      description: 'Expert professionals for personalized care',
      count: 67,
      path: '/discover/doctors-coaches'
    },
    {
      id: 'devices',
      title: 'Devices',
      icon: Plane,
      description: 'Wearables and health tracking devices',
      count: 34,
      path: '/discover/supplements'
    },
    {
      id: 'experiences',
      title: 'Experiences',
      icon: MapPin,
      description: 'Wellness retreats and immersive programs',
      count: 23,
      path: '/discover/wellness-services'
    }
  ];

  const shareAndEarnItems = [
    {
      id: 1,
      title: 'Longevity Essentials Bundle',
      description: 'Curated supplement pack for healthy aging',
      price: '$299',
      commission: '$45',
      image: '/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png',
      shares: 234,
      earnings: '$1,234'
    },
    {
      id: 2,
      title: 'Wellness Weekend Retreat',
      description: 'All-inclusive health optimization experience',
      price: '$1,299',
      commission: '$195',
      image: '/lovable-uploads/emma-wilson-avatar.jpg',
      shares: 67,
      earnings: '$567'
    },
    {
      id: 3,
      title: 'Premium Lab Test Package',
      description: 'Comprehensive biomarker analysis',
      price: '$499',
      commission: '$75',
      image: '/lovable-uploads/dr-roberts-avatar.jpg',
      shares: 123,
      earnings: '$892'
    }
  ];

  return (
    <AppLayout>
      <SEO 
        title={t('screens.discover.discoverMarketplaceVitana')} 
        description="AI-powered longevity marketplace with personalized recommendations, wellness services, supplements, and community shopping"
        canonical={window.location.href} 
      />
      {/* Hide SubNavigation on mobile - guided discovery experience */}
      {!isMobile && <SubNavigation items={discoverNavigation} />}
      
      <div className={cn(
        "p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen",
        isMobile && "px-4 pb-32"
      )}>
        <div className={cn("max-w-7xl mx-auto", isMobile ? "space-y-3" : "space-y-6")}>
            <StandardHeader
              title={isMobile ? translate('discover.mobileTitle') : translate('discover.title')}
              description={isMobile ? translate('discover.mobileDescription') : translate('discover.description')}
              emoji="🔍"
            />

          {/* Guest CTA — signed-out visitors can browse but must sign in to buy
              and earn rewards. */}
          {isGuest && (
            <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-purple-500/5 to-pink-500/10">
              <CardContent className={cn(
                "flex items-center gap-3 p-4",
                isMobile ? "flex-col text-center" : "flex-row"
              )}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="bg-primary/15 rounded-full p-2 shrink-0">
                    <Gift className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">
                      {translate('discover.guest.bannerTitle')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {translate('discover.guest.bannerSubtitle')}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={goToSignIn}
                  className={cn("shrink-0", isMobile && "w-full")}
                >
                  {translate('discover.guest.bannerCta')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Utility Action Buttons - Mobile optimized pill rail */}
          <UtilityActionButton
            compact={isMobile}
            className="min-w-0"
            afterGiftVoucherChildren={isMobile ? (
              <>
                {/* Vitana Index - pill style on mobile */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/health')}
                  className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 shrink-0"
                >
                  <span className="text-xs opacity-60">🧬</span>
                  <span className="text-sm font-medium text-primary"><VitanaIndexValue /></span>
                </Button>
                
                {/* Autopilot - pill style with label on mobile */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setAutopilotOpen(true)}
                  className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 relative shrink-0"
                >
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{translate('actionBar.autopilot', 'Autopilot')}</span>
                  {pendingCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full p-0 flex items-center justify-center text-[10px] animate-pulse"
                    >
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
              </>
            ) : undefined}
            trailingElement={!isMobile ? (
              <Button 
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => window.location.reload()}
                title={t('screens.discover.refreshPage')}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            ) : undefined}
          >
            <div className="flex items-center gap-2 min-w-max">
              <ExpandableSearchButton
                placeholder={isMobile ? "Search..." : "Search marketplace products, services, and experiences…"}
              />
              {isMobile && (
                <MobileModePill
                  modes={[
                    { value: "suggested", label: "AI Picks", icon: "💡" },
                    { value: "categories", label: "Categories", icon: "📂" },
                    { value: "share", label: "Share & Earn", icon: "💰" },
                  ]}
                  activeMode={activeTab}
                  onModeChange={setActiveTab}
                />
              )}
              <UniversalCalendarButton />
              {!isMobile && (
                <Button
                  size="sm"
                  onClick={() => setMasterActionOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span className="ml-2">{t('screens.discover.action')}</span>
                </Button>
              )}
            </div>
          </UtilityActionButton>

          {/* Mobile: Tab-driven content via MobileModePill */}
          {isMobile ? (
            <MobileDiscoverView aiRecommendations={aiRecommendations} activeTab={activeTab} />
          ) : (
            /* Desktop: Full Split Bar Navigation */
            <SplitBar value={activeTab} onValueChange={setActiveTab}>
              <SplitBarList>
                <SplitBarTrigger value="suggested">
                  {t('screens.discover.suggestedForYou')}
                </SplitBarTrigger>
                <SplitBarTrigger value="categories">
                  {t('screens.discover.categories')}
                </SplitBarTrigger>
                <SplitBarTrigger value="share">
                  {t('screens.discover.shareEarn')}
                </SplitBarTrigger>
              </SplitBarList>

            {/* Tab 1: Suggested for You */}
            <SplitBarContent value="suggested" className="space-y-6">
              <Card className="bg-white/80 dark:bg-card/80 backdrop-blur-sm border-white/20 dark:border-border/20">
                <CardContent className={cn("p-6", isMobile && "p-4")}>
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-6 w-6 text-purple-500" />
                    <h2 className={cn("font-semibold", isMobile ? "text-lg" : "text-2xl")}>
                      {isMobile ? "AI Picks" : "AI-Powered Recommendations"}
                    </h2>
                  </div>
                  {!isMobile && (
                    <p className="text-muted-foreground mb-6">{t('screens.discover.basedYourVitanaIndexBiomarkersSleep')}
                    </p>
                  )}
                  
                  {/* VTID-02000: Scope selector */}
                  <div className="flex items-center justify-between mb-4">
                    <ScopeSelector value={scope} onChange={setScope} />
                    {feedData?.feed_context?.rationale && (
                      <span className="text-xs text-muted-foreground hidden md:inline">
                        {feedData.feed_context.rationale}
                      </span>
                    )}
                  </div>

                  {feedLoading ? (
                    <div className="text-center py-12 text-muted-foreground">{t('screens.discover.loadingYourPersonalizedFeed')}</div>
                  ) : (
                  <div className={cn(
                    "grid gap-4",
                    isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                  )}>
                    {aiRecommendations.map((rec) => (
                      rec._product ? (
                        <MarketplaceProductCard
                          key={rec._product.id}
                          product={rec._product}
                          surface="feed"
                          showMatchReasons={!isMobile}
                          onClick={selectProduct}
                        />
                      ) : (
                      <Card
                        key={rec.id}
                        data-match-id={rec.id}
                        className={cn(
                          "group hover:shadow-lg transition-all duration-300 cursor-pointer border-purple-200 dark:border-purple-800",
                          highlightedMatchId === String(rec.id) && "ring-2 ring-primary animate-pulse"
                        )}
                      >
                        <div className="relative">
                          <img 
                            src={rec.image} 
                            alt={rec.title}
                            className={cn("w-full object-cover rounded-t-lg", isMobile ? "h-32" : "h-40")}
                          />
                          <Badge className="absolute top-2 left-2 bg-purple-500 text-white">
                            {rec.badge}
                          </Badge>
                          <div className="absolute top-2 right-2 bg-white/90 dark:bg-background/90 rounded-full px-2 py-1">
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{rec.match}%</span>
                          </div>
                        </div>
                        <CardContent className={cn("p-4", isMobile && "p-3")}>
                          <h3 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {rec.title}
                          </h3>
                          {!isMobile && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{rec.description}</p>
                          )}
                          <div className="bg-purple-50 dark:bg-purple-950/30 p-2 rounded-lg mb-3">
                            <div className="flex items-center gap-1">
                              <Brain className="h-3 w-3 text-purple-500" />
                              <span className="text-xs text-purple-700 dark:text-purple-300 line-clamp-1">{rec.reason}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-bold">{rec.price}</span>
                          </div>
                          <div className="flex gap-2">
                            <AddToCartButton
                              item={{
                                item_type: 'wellness_service',
                                item_id: rec.id.toString(),
                                item_name: rec.title,
                                item_price: parseFloat(rec.price.replace('$', '')),
                                item_image_url: rec.image,
                                item_metadata: { provider: rec.provider, match: rec.match }
                              }}
                              size="sm"
                              className="flex-1"
                            />
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => navigate(`/discover/product/${rec.id}`, { state: rec })}
                            >{t('screens.discover.view')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      )
                    ))}
                  </div>
                  )}
                  {/* VTID-02000: Transparency footer — hidden products count */}
                  <HiddenByLimitationsFooter breakdown={feedData?.hidden_breakdown} />
                  <AffiliateDisclosure className="mt-3" />
                </CardContent>
              </Card>
            </SplitBarContent>

            {/* Tab 2: Categories */}
            <SplitBarContent value="categories" className="space-y-6">
              <Card className="bg-white/80 dark:bg-card/80 backdrop-blur-sm border-white/20 dark:border-border/20">
                <CardContent className={cn("p-6", isMobile && "p-4")}>
                  <div className="flex items-center gap-2 mb-4">
                    <Grid3X3 className="h-6 w-6 text-blue-500" />
                    <h2 className={cn("font-semibold", isMobile ? "text-lg" : "text-2xl")}>
                      {isMobile ? "Categories" : "Browse by Category"}
                    </h2>
                  </div>
                  {!isMobile && (
                    <p className="text-muted-foreground mb-6">{t('screens.discover.exploreSupplementsWellnessServicesLabTests')}
                    </p>
                  )}
                  
                  <div className={cn(
                    "grid gap-4",
                    isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  )}>
                    {browseCategories.map((category) => (
                      <Card 
                        key={category.id}
                        className={cn(
                          "group hover:shadow-lg transition-all duration-300 cursor-pointer",
                          !isMobile && "hover:scale-105"
                        )}
                        onClick={() => navigate(category.path)}
                      >
                        <CardContent className={cn("p-6", isMobile && "p-4")}>
                          <div className="flex items-center justify-between mb-4">
                            <div className={cn("bg-primary/10 rounded-lg", isMobile ? "p-2" : "p-3")}>
                              <category.icon className={cn("text-primary", isMobile ? "h-5 w-5" : "h-6 w-6")} />
                            </div>
                            <Badge variant="outline" className={cn(isMobile && "text-xs")}>{category.count}</Badge>
                          </div>
                          <h3 className={cn(
                            "font-semibold mb-2 group-hover:text-primary transition-colors",
                            isMobile ? "text-sm" : "text-xl"
                          )}>
                            {category.title}
                          </h3>
                          {!isMobile && (
                            <p className="text-muted-foreground text-sm">
                              {category.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            {/* Tab 3: Share & Earn */}
            <SplitBarContent value="share" className="space-y-6">
              <Card className="bg-white/80 dark:bg-card/80 backdrop-blur-sm border-white/20 dark:border-border/20">
                <CardContent className={cn("p-6", isMobile && "p-4")}>
                  <div className="flex items-center gap-2 mb-4">
                    <Share2 className="h-6 w-6 text-green-500" />
                    <h2 className={cn("font-semibold", isMobile ? "text-lg" : "text-2xl")}>
                      {isMobile ? "Share & Earn" : "Share & Earn Commissions"}
                    </h2>
                  </div>
                  {!isMobile && (
                    <p className="text-muted-foreground mb-6">{t('screens.discover.curatedProductBundlesYouCanShare')}
                    </p>
                  )}

                  {/* Earnings Summary */}
                  <div className={cn(
                    "grid gap-4 mb-6",
                    isMobile ? "grid-cols-3" : "grid-cols-1 md:grid-cols-3"
                  )}>
                    <Card className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30">
                      <CardContent className={cn("p-4", isMobile && "p-3")}>
                        <div className={cn("flex items-center gap-2 mb-2", isMobile && "flex-col items-start gap-1")}>
                          <DollarSign className={cn("text-green-600", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                          <span className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                            {isMobile ? "Earned" : "Total Earnings"}
                          </span>
                        </div>
                        <p className={cn("font-bold text-green-600", isMobile ? "text-lg" : "text-2xl")}>$2,693</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                      <CardContent className={cn("p-4", isMobile && "p-3")}>
                        <div className={cn("flex items-center gap-2 mb-2", isMobile && "flex-col items-start gap-1")}>
                          <Users className={cn("text-purple-600", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                          <span className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                            {isMobile ? "Shares" : "Community Shares"}
                          </span>
                        </div>
                        <p className={cn("font-bold text-purple-600", isMobile ? "text-lg" : "text-2xl")}>424</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30">
                      <CardContent className={cn("p-4", isMobile && "p-3")}>
                        <div className={cn("flex items-center gap-2 mb-2", isMobile && "flex-col items-start gap-1")}>
                          <Award className={cn("text-orange-600", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                          <span className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                            {isMobile ? "Rank" : "Top Performer"}
                          </span>
                        </div>
                        <p className={cn("font-bold text-orange-600", isMobile ? "text-lg" : "text-2xl")}>{t('screens.discover.top5')}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Shareable Products */}
                  <div className={cn(
                    "grid gap-4",
                    isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3 gap-6"
                  )}>
                    {shareAndEarnItems.map((item) => (
                      <Card key={item.id} className="group hover:shadow-lg transition-all duration-300">
                        <div className="relative">
                          <img 
                            src={item.image} 
                            alt={item.title}
                            className={cn("w-full object-cover rounded-t-lg", isMobile ? "h-32" : "h-40")}
                          />
                          <Badge className="absolute top-2 left-2 bg-green-500 text-white">{t('screens.discover.earnCommission', { commission: item.commission })}</Badge>
                        </div>
                        <CardContent className={cn("p-4", isMobile && "p-3")}>
                          <h3 className={cn("font-semibold mb-2 group-hover:text-primary transition-colors", isMobile && "text-sm")}>
                            {item.title}
                          </h3>
                          {!isMobile && (
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mb-3">
                            <span className={cn("font-bold", isMobile ? "text-base" : "text-lg")}>{item.price}</span>
                            <div className="text-xs text-muted-foreground">
                              <Users className="h-3 w-3 inline mr-1" />{t('screens.discover.sharesShares', { shares: item.shares })}
                            </div>
                          </div>
                          <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded-lg mb-3">
                            <p className="text-xs text-green-700 dark:text-green-300">
                              {t('screens.discover.communityEarned')} <span className="font-bold">{item.earnings}</span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <UniversalShareButton
                              content={{
                                type: "service",
                                id: item.id.toString(),
                                title: item.title,
                                description: item.description,
                                image_url: item.image,
                                url: `${window.location.origin}/discover/product/${item.id}`
                              }}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            />
                            <AddToCartButton
                              item={{
                                item_type: 'product',
                                item_id: item.id.toString(),
                                item_name: item.title,
                                item_price: parseFloat(item.price.replace('$', '')),
                                item_image_url: item.image,
                                item_metadata: { commission: item.commission }
                              }}
                              size="sm"
                              className="flex-1"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
          )}
        </div>
      </div>
      
      <DiscoverMasterActionPopup 
        open={masterActionOpen}
        onOpenChange={setMasterActionOpen}
      />
      
      <AutopilotPopup
        open={autopilotOpen}
        onOpenChange={setAutopilotOpen}
      />
      <ProductDetailsDrawer />
    </AppLayout>
  );
}

export default withScreenId(function Discover() {
  return (
    <ProductSelectionProvider>
      <DiscoverInner />
    </ProductSelectionProvider>
  );
}, SCREEN_IDS.DISCOVER_OVERVIEW);
