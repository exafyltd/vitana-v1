import { useState, useEffect } from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { discoverNavigation } from "@/config/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Star, Search, Filter, Plane, Plus, RefreshCw } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNavigate } from "react-router-dom";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { MasterActionPopup } from "@/components/MasterActionPopup";

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
  const navigate = useNavigate();
  const { pendingCount } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");

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

  useEffect(() => {
    fetchSupplements();
  }, []);

  const fetchSupplements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplements')
        .select('*')
        .eq('is_active', true)
        .eq('in_stock', true);

      if (error) throw error;
      setSupplements(data || []);
    } catch (error) {
      console.error('Error fetching supplements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSupplements = supplements
    .filter(supp => {
      const matchesSearch = searchQuery === "" || 
        supp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supp.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supp.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || 
        supp.category.toLowerCase() === selectedCategory.toLowerCase();
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price-high") return (b.price || 0) - (a.price || 0);
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      // default: popular (by review count)
      return (b.review_count || 0) - (a.review_count || 0);
    });

  return (
    <AppLayout>
      <SEO 
        title="Supplements | Discover" 
        description="Premium longevity supplements and wellness products" 
        canonical={window.location.href} 
      />
      <SubNavigation items={discoverNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Supplements"
            description="Premium longevity supplements curated for your wellness journey"
            emoji="💊"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search supplements…"
            />
            <UniversalCalendarButton />
            <Button 
              size="sm"
              onClick={() => setMasterActionOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Action
            </Button>
            <Button 
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => window.location.reload()}
              title="Refresh page"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </UtilityActionButton>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Filter & Search</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search supplements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
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
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading supplements...</p>
            </div>
          ) : filteredSupplements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No supplements found matching your criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredSupplements.map((supplement) => (
                <Card key={supplement.id} className="group hover:shadow-lg transition-all duration-300 flex flex-col bg-white/80 backdrop-blur-sm border-white/20">
                  <div className="relative">
                    <img 
                      src={supplement.image_url || '/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png'} 
                      alt={supplement.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    {!supplement.in_stock && (
                      <Badge className="absolute top-2 right-2 bg-red-500">Out of Stock</Badge>
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
        </div>
      </div>

      <AutopilotPopup 
        open={autopilotOpen}
        onOpenChange={setAutopilotOpen}
      />
      <MasterActionPopup 
        open={masterActionOpen}
        onOpenChange={setMasterActionOpen}
      />
    </AppLayout>
  );
}
