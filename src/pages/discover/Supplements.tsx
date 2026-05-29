import { useState, useMemo } from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { discoverNavigation } from "@/config/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useMarketplaceSearch, type MarketplaceSearchParams, type MarketplaceProduct } from "@/hooks/useMarketplace";
import { HiddenByLimitationsFooter } from "@/components/discover/HiddenByLimitationsFooter";
import { AffiliateDisclosure } from "@/components/discover/AffiliateDisclosure";
import { ProductImage } from "@/components/discover/ProductImage";
import { ProductDetailsDrawer } from "@/components/discover/ProductDetailsDrawer";
import { useProductSelection, ProductSelectionProvider } from "@/context/ProductSelectionContext";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Star, Search, Filter, Plane, Plus, RefreshCw, Brain, Sparkles } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNavigate } from "react-router-dom";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { DiscoverShopActionPopup } from "@/components/discover/DiscoverShopActionPopup";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { t } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';

interface Supplement {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  category: string;
  price: number;
  dosage: string | null;
  serving_size: string | null;
  servings_per_container: number | null;
  benefits: string[] | null;
  image_url: string | null;
  rating: number | null;
  review_count: number | null;
  in_stock: boolean | null;
}

export default function Supplements() {
  return (
    <ProductSelectionProvider>
      <SupplementsInner />
    </ProductSelectionProvider>
  );
}

function SupplementsInner() {
  const navigate = useNavigate();
  const { pendingCount } = useAutopilot();
  const { getBookmarksByType } = useBookmarks();
  const { selectProduct } = useProductSelection();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");

  const searchParams = useMemo<MarketplaceSearchParams>(() => {
    const sortMap: Record<string, MarketplaceSearchParams["sort"]> = {
      popular: "relevance",
      rating: "rating",
      "price-low": "price_asc",
      "price-high": "price_desc",
    };
    return {
      category: "supplements",
      q: searchQuery || undefined,
      subcategory:
        selectedCategory !== "all" ? selectedCategory.toLowerCase() : undefined,
      sort: sortMap[sortBy] ?? "relevance",
      limit: 48,
    };
  }, [searchQuery, selectedCategory, sortBy]);

  const { data: searchData, isLoading: loading } = useMarketplaceSearch(searchParams);

  const productsById = useMemo(() => {
    const m = new Map<string, MarketplaceProduct>();
    (searchData?.items ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [searchData]);

  const supplements: Supplement[] = useMemo(
    () =>
      (searchData?.items ?? []).map((p) => {
        const goals = Array.isArray(p.health_goals) ? p.health_goals : [];
        return {
          id: p.id,
          name: p.title,
          brand: p.brand,
          description: p.description,
          category: p.subcategory ?? p.category ?? "supplements",
          price: p.price_cents != null ? p.price_cents / 100 : 0,
          dosage: null,
          serving_size: null,
          servings_per_container: null,
          benefits: goals.length > 0 ? goals : null,
          image_url: Array.isArray(p.images) ? p.images[0] ?? null : null,
          rating: p.rating,
          review_count: p.review_count,
          in_stock: p.availability === "in_stock",
        };
      }),
    [searchData]
  );

  const categories = [
    "All",
    "Multivitamins",
    "Vitamins",
    "Minerals",
    "Omega-3",
    "Adaptogens",
    "Nootropics",
    "Longevity",
    "Sleep",
    "Performance",
    "Beauty",
    "Gut Health",
    "Herbs",
    "Heart Health"
  ];


  return (
    <AppLayout>
      <SEO 
        title={t('screens.discover.supplementsDiscover')} 
        description="Premium longevity supplements and wellness products" 
        canonical={window.location.href} 
      />
      <SubNavigation items={discoverNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6 pb-32">
          <StandardHeader
            title={t('screens.discover.supplements')}
            description="Premium longevity supplements curated for your wellness journey"
            emoji="💊"
          />

          <UtilityActionButton
            trailingElement={
              <Button 
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => window.location.reload()}
                title={t('screens.discover.refreshPage')}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            }
          >
            <ExpandableSearchButton 
              placeholder={t('screens.discover.searchSupplements')}
            />
            <UniversalCalendarButton />
            <Button 
              size="sm"
              onClick={() => setMasterActionOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('screens.discover.action')}
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="browse">{t('screens.discover.browseAll')}</SplitBarTrigger>
              <SplitBarTrigger value="picks">{t('screens.discover.topPicks')}</SplitBarTrigger>
              <SplitBarTrigger value="stack">{t('screens.discover.myStack')}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="browse" className="space-y-6">
              {/* Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">{t('screens.discover.filterSearch')}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('screens.discover.searchSupplements2')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={t('screens.discover.category')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat.toLowerCase()}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder={t('screens.discover.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">{t('screens.discover.mostPopular')}</SelectItem>
                  <SelectItem value="rating">{t('screens.discover.highestRated')}</SelectItem>
                  <SelectItem value="price-low">{t('screens.discover.priceLowHigh')}</SelectItem>
                  <SelectItem value="price-high">{t('screens.discover.priceHighLow')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('screens.discover.loadingSupplements')}</p>
            </div>
          ) : supplements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('screens.discover.noSupplementsFoundMatchingYourCriteria')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {supplements.map((supplement) => (
                <Card
                  key={supplement.id}
                  onClick={() => {
                    const p = productsById.get(supplement.id);
                    if (p) selectProduct(p);
                  }}
                  className="relative group hover:shadow-lg transition-all duration-300 flex flex-col bg-white/80 backdrop-blur-sm border-white/20 cursor-pointer">
                  <BookmarkButton
                    item={{
                      item_type: 'supplement',
                      item_id: supplement.id,
                      item_name: supplement.name,
                      item_image_url: supplement.image_url || undefined,
                      item_metadata: {
                        brand: supplement.brand,
                        category: supplement.category,
                        price: supplement.price,
                        benefits: supplement.benefits,
                        rating: supplement.rating,
                      },
                    }}
                  />
                  <div className="relative">
                    <ProductImage
                      src={supplement.image_url}
                      alt={supplement.name}
                      category={supplement.category}
                      className="rounded-t-lg"
                      sizeClass="w-full h-48"
                    />
                    {!supplement.in_stock && (
                      <Badge className="absolute top-2 right-2 bg-red-500">{t('screens.discover.outStock')}</Badge>
                    )}
                  </div>
                  
                  <CardContent className="flex-1 flex flex-col p-4">
                    <div className="mb-2">
                      <Badge variant="secondary" className="text-xs mb-2">{supplement.category}</Badge>
                      <h3 className="font-semibold text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {supplement.name}
                      </h3>
                      {supplement.brand && (
                        <p className="text-xs text-muted-foreground mb-2">{supplement.brand}</p>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1">
                      {supplement.description}
                    </p>
                    
                    {supplement.benefits && supplement.benefits.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {supplement.benefits.slice(0, 2).map((benefit, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {benefit}
                            </Badge>
                          ))}
                          {supplement.benefits.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{supplement.benefits.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{supplement.rating?.toFixed(1) || '0.0'}</span>
                      <span className="text-xs text-muted-foreground">({supplement.review_count || 0})</span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <span className="text-lg font-bold text-foreground">${supplement.price?.toFixed(2)}</span>
                      <AddToCartButton
                        item={{
                          item_type: 'product',
                          item_id: supplement.id,
                          item_name: supplement.name,
                          item_price: supplement.price,
                          item_image_url: supplement.image_url || undefined,
                          item_metadata: {
                            brand: supplement.brand,
                            category: supplement.category,
                            dosage: supplement.dosage,
                            external_product_id: (supplement as any).external_product_id,
                            external_source: (supplement as any).external_source,
                          },
                        }}
                        size="sm"
                        className="flex-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <HiddenByLimitationsFooter breakdown={searchData?.hidden_breakdown} />
          <AffiliateDisclosure className="mt-3" />
            </SplitBarContent>

            <SplitBarContent value="picks" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-6 w-6 text-purple-500" />
                    <h2 className="text-2xl font-semibold">{t('screens.discover.aipoweredTopPicks')}</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">{t('screens.discover.personalizedSupplementRecommendationsBasedYourHeal')}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {supplements.slice(0, 6).map((supplement, index) => (
                      <Card
                        key={supplement.id}
                        onClick={() => {
                          const p = productsById.get(supplement.id);
                          if (p) selectProduct(p);
                        }}
                        className="group hover:shadow-lg transition-all duration-300 border-purple-200 cursor-pointer">
                        <div className="relative">
                          <ProductImage
                            src={supplement.image_url}
                            alt={supplement.name}
                            category={supplement.category}
                            className="rounded-t-lg"
                            sizeClass="w-full h-32"
                          />
                          <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1">
                            <span className="text-xs font-bold text-purple-600">{95 - index * 3}%</span>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <Badge variant="secondary" className="text-xs mb-2">{supplement.category}</Badge>
                          <h3 className="font-semibold text-sm mb-1 line-clamp-2">{supplement.name}</h3>
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{supplement.description}</p>
                          <div className="bg-purple-50 p-2 rounded-lg mb-3">
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-purple-500" />
                              <span className="text-xs text-purple-700">{t('screens.discover.greatForYourHealthGoals')}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-primary">${supplement.price}</span>
                            <AddToCartButton
                              item={{
                                item_type: 'product',
                                item_id: supplement.id,
                                item_name: supplement.name,
                                item_price: supplement.price,
                                item_image_url: supplement.image_url,
                                item_metadata: {
                                  brand: supplement.brand,
                                  category: supplement.category,
                                },
                              }}
                              size="sm"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="stack" className="space-y-6">
              {(() => {
                const bookmarkedSupplements = getBookmarksByType('supplement');
                const bookmarkedSupplementsList = supplements.filter(supp => 
                  bookmarkedSupplements.some(b => b.item_id === supp.id)
                );

                if (bookmarkedSupplementsList.length === 0) {
                  return (
                    <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                      <CardContent className="p-12 text-center">
                        <div className="text-6xl mb-4">💛</div>
                        <h3 className="text-xl font-semibold mb-2">{t('screens.discover.noSavedSupplementsYet')}</h3>
                        <p className="text-muted-foreground">
                          {t('screens.discover.saveYourFavoriteSupplementsTrackYour')}
                        </p>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {bookmarkedSupplementsList.map((supplement) => (
                      <Card key={supplement.id} className="relative group hover:shadow-lg transition-all duration-300 flex flex-col bg-white/80 backdrop-blur-sm border-white/20">
                        <BookmarkButton
                          item={{
                            item_type: 'supplement',
                            item_id: supplement.id,
                            item_name: supplement.name,
                            item_image_url: supplement.image_url || undefined,
                            item_metadata: {
                              brand: supplement.brand,
                              category: supplement.category,
                              price: supplement.price,
                              benefits: supplement.benefits,
                              rating: supplement.rating,
                            },
                          }}
                        />
                        <div className="relative">
                          <ProductImage
                            src={supplement.image_url}
                            alt={supplement.name}
                            category={supplement.category}
                            className="rounded-t-lg"
                            sizeClass="w-full h-48"
                          />
                          {!supplement.in_stock && (
                            <Badge className="absolute top-2 right-2 bg-red-500">{t('screens.discover.outStock')}</Badge>
                          )}
                        </div>
                        
                        <CardContent className="flex-1 flex flex-col p-4">
                          <div className="mb-2">
                            <Badge variant="secondary" className="text-xs mb-2">{supplement.category}</Badge>
                            <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                              {supplement.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{supplement.brand}</p>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{supplement.description}</p>
                          
                          {supplement.benefits && supplement.benefits.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {supplement.benefits.slice(0, 3).map((benefit, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {benefit}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 mb-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(supplement.rating || 0)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "fill-gray-200 text-gray-200"
                                }`}
                              />
                            ))}
                            <span className="text-sm text-muted-foreground ml-1">
                              {supplement.rating} ({fmtNumber(supplement.review_count)})
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-xl font-bold text-primary">${supplement.price}</span>
                            <AddToCartButton
                              item={{
                                item_type: 'product',
                                item_id: supplement.id,
                                item_name: supplement.name,
                                item_price: supplement.price,
                                item_image_url: supplement.image_url,
                                item_metadata: {
                                  brand: supplement.brand,
                                  category: supplement.category,
                                },
                              }}
                              size="sm"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <AutopilotPopup 
        open={autopilotOpen}
        onOpenChange={setAutopilotOpen}
      />
      <DiscoverShopActionPopup
        open={masterActionOpen}
        onOpenChange={setMasterActionOpen}
      />
      <ProductDetailsDrawer />
    </AppLayout>
  );
}
