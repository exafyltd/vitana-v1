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
import { DiscoverShopActionPopup } from "@/components/discover/DiscoverShopActionPopup";

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

  // Mock supplement data for presentation
  const mockSupplements: Supplement[] = [
    {
      id: '1',
      name: 'Premium Omega-3 Triple Strength',
      brand: 'Nordic Naturals',
      description: 'High-potency EPA+DHA omega-3 supplement for heart, brain, and immune health',
      category: 'Omega-3',
      price: 42.99,
      dosage: '1000mg',
      serving_size: '2 softgels',
      servings_per_container: 60,
      benefits: ['Heart Health', 'Brain Function', 'Anti-inflammatory'],
      image_url: 'https://images.unsplash.com/photo-1499125562588-29fb8a56b5d5?w=400',
      rating: 4.8,
      review_count: 1247,
      in_stock: true,
    },
    {
      id: '2',
      name: 'Complete Multivitamin Complex',
      brand: 'Life Extension',
      description: 'Comprehensive daily multivitamin with 40+ essential nutrients for optimal health',
      category: 'Multivitamins',
      price: 28.50,
      dosage: 'Varies',
      serving_size: '2 capsules',
      servings_per_container: 60,
      benefits: ['Energy Support', 'Immune Boost', 'Overall Wellness'],
      image_url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400',
      rating: 4.6,
      review_count: 892,
      in_stock: true,
    },
    {
      id: '3',
      name: 'Ashwagandha Root Extract',
      brand: 'Gaia Herbs',
      description: 'Premium adaptogen for stress relief, energy, and cognitive function support',
      category: 'Adaptogens',
      price: 34.99,
      dosage: '600mg',
      serving_size: '1 capsule',
      servings_per_container: 90,
      benefits: ['Stress Relief', 'Energy', 'Focus'],
      image_url: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400',
      rating: 4.7,
      review_count: 654,
      in_stock: true,
    },
    {
      id: '4',
      name: 'Sleep Optimization Formula',
      brand: 'Thorne Research',
      description: 'Natural sleep support with melatonin, magnesium, and calming botanicals',
      category: 'Sleep',
      price: 31.99,
      dosage: '5mg melatonin',
      serving_size: '2 capsules',
      servings_per_container: 30,
      benefits: ['Better Sleep', 'Relaxation', 'Recovery'],
      image_url: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=400',
      rating: 4.5,
      review_count: 543,
      in_stock: true,
    },
    {
      id: '5',
      name: 'NAD+ Boosting Complex',
      brand: 'Tru Niagen',
      description: 'Advanced cellular energy and longevity support with nicotinamide riboside',
      category: 'Longevity',
      price: 64.99,
      dosage: '300mg NR',
      serving_size: '1 capsule',
      servings_per_container: 30,
      benefits: ['Cellular Energy', 'Anti-aging', 'NAD+ Support'],
      image_url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400',
      rating: 4.9,
      review_count: 2145,
      in_stock: true,
    },
    {
      id: '6',
      name: 'Probiotic 50 Billion CFU',
      brand: 'Garden of Life',
      description: 'High-potency probiotic blend for digestive and immune system support',
      category: 'Gut Health',
      price: 38.99,
      dosage: '50B CFU',
      serving_size: '1 capsule',
      servings_per_container: 30,
      benefits: ['Digestive Health', 'Immune Support', 'Gut Balance'],
      image_url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400',
      rating: 4.7,
      review_count: 876,
      in_stock: true,
    },
    {
      id: '7',
      name: 'Lion\'s Mane Mushroom Extract',
      brand: 'Host Defense',
      description: 'Cognitive enhancement and neuroprotection with organic lion\'s mane',
      category: 'Nootropics',
      price: 44.99,
      dosage: '1000mg',
      serving_size: '2 capsules',
      servings_per_container: 60,
      benefits: ['Brain Health', 'Memory', 'Focus'],
      image_url: 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=400',
      rating: 4.8,
      review_count: 721,
      in_stock: true,
    },
    {
      id: '8',
      name: 'CoQ10 Ubiquinol 200mg',
      brand: 'Jarrow Formulas',
      description: 'Active form CoQ10 for heart health, energy production, and antioxidant support',
      category: 'Heart Health',
      price: 49.99,
      dosage: '200mg',
      serving_size: '1 softgel',
      servings_per_container: 60,
      benefits: ['Heart Health', 'Energy', 'Antioxidant'],
      image_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400',
      rating: 4.6,
      review_count: 432,
      in_stock: true,
    },
    {
      id: '9',
      name: 'Magnesium Glycinate 400mg',
      brand: 'Pure Encapsulations',
      description: 'Highly absorbable magnesium for muscle relaxation, sleep, and stress relief',
      category: 'Minerals',
      price: 24.99,
      dosage: '400mg',
      serving_size: '2 capsules',
      servings_per_container: 90,
      benefits: ['Muscle Recovery', 'Sleep Quality', 'Stress Relief'],
      image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
      rating: 4.9,
      review_count: 1543,
      in_stock: true,
    },
    {
      id: '10',
      name: 'Collagen Peptides Beauty Blend',
      brand: 'Vital Proteins',
      description: 'Type I & III collagen for skin, hair, nails, and joint health',
      category: 'Beauty',
      price: 43.99,
      dosage: '20g',
      serving_size: '2 scoops',
      servings_per_container: 28,
      benefits: ['Skin Health', 'Hair Growth', 'Joint Support'],
      image_url: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400',
      rating: 4.7,
      review_count: 2987,
      in_stock: true,
    },
    {
      id: '11',
      name: 'Vitamin D3 + K2 Complex',
      brand: 'Sports Research',
      description: 'Synergistic vitamin D3 and K2 for bone health and calcium absorption',
      category: 'Vitamins',
      price: 19.99,
      dosage: '5000 IU D3',
      serving_size: '1 softgel',
      servings_per_container: 60,
      benefits: ['Bone Health', 'Immune Support', 'Calcium Absorption'],
      image_url: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=400',
      rating: 4.8,
      review_count: 1234,
      in_stock: true,
    },
    {
      id: '12',
      name: 'Turmeric Curcumin with BioPerine',
      brand: 'NOW Foods',
      description: 'Potent anti-inflammatory support with enhanced absorption',
      category: 'Herbs',
      price: 27.99,
      dosage: '500mg',
      serving_size: '2 capsules',
      servings_per_container: 120,
      benefits: ['Anti-inflammatory', 'Joint Health', 'Antioxidant'],
      image_url: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400',
      rating: 4.6,
      review_count: 876,
      in_stock: true,
    },
    {
      id: '13',
      name: 'Pre-Workout Performance Stack',
      brand: 'Optimum Nutrition',
      description: 'Complete pre-workout formula with caffeine, beta-alanine, and citrulline',
      category: 'Performance',
      price: 39.99,
      dosage: 'Varies',
      serving_size: '1 scoop',
      servings_per_container: 30,
      benefits: ['Energy', 'Endurance', 'Focus'],
      image_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
      rating: 4.5,
      review_count: 1876,
      in_stock: true,
    },
    {
      id: '14',
      name: 'Resveratrol Longevity Formula',
      brand: 'Life Extension',
      description: 'Trans-resveratrol for cellular health and longevity pathways activation',
      category: 'Longevity',
      price: 54.99,
      dosage: '250mg',
      serving_size: '1 capsule',
      servings_per_container: 60,
      benefits: ['Anti-aging', 'Cellular Health', 'Longevity'],
      image_url: 'https://images.unsplash.com/photo-1596363505729-4190a9506133?w=400',
      rating: 4.7,
      review_count: 543,
      in_stock: true,
    },
    {
      id: '15',
      name: 'B-Complex with Methylfolate',
      brand: 'Thorne Research',
      description: 'Active B vitamins for energy, mood, and methylation support',
      category: 'Vitamins',
      price: 33.99,
      dosage: 'Varies',
      serving_size: '1 capsule',
      servings_per_container: 60,
      benefits: ['Energy', 'Mood Support', 'Methylation'],
      image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
      rating: 4.8,
      review_count: 765,
      in_stock: true,
    },
  ];

  useEffect(() => {
    fetchSupplements();
  }, [searchQuery, selectedCategory]);

  const fetchSupplements = async () => {
    try {
      setLoading(true);
      
      // Simulate loading for realistic presentation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Load mock data instead of API call
      setSupplements(mockSupplements);
    } catch (error) {
      console.error('Error loading supplements:', error);
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
        <div className="max-w-7xl mx-auto space-y-6 pb-32">
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
    </AppLayout>
  );
}
