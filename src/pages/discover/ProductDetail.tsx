import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Heart, Share2, ShoppingCart, Brain } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { UniversalShareButton } from "@/components/sharing/UniversalShareButton";

export default function ProductDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  
  // Get product data from route state or use defaults
  const product = location.state || {
    id: id || '1',
    title: "Product Not Found",
    description: "This product could not be loaded",
    price: "$0",
    match: 0,
    reason: "N/A",
    provider: "Unknown",
    image: "/placeholder.svg",
    badge: "Unknown"
  };

  const priceValue = parseFloat(product.price.replace('$', ''));

  return (
    <AppLayout>
      <SEO 
        title={`${product.title} | VITANA Marketplace`}
        description={product.description}
        canonical={window.location.href}
      />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Discover
          </Button>

          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Product Image */}
                <div className="relative">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-96 object-cover rounded-lg"
                  />
                  <Badge className="absolute top-4 left-4 bg-purple-500 text-white">
                    {product.badge}
                  </Badge>
                  {product.match && (
                    <div className="absolute top-4 right-4 bg-white/90 rounded-full px-3 py-2">
                      <span className="text-sm font-bold text-purple-600">{product.match}% Match</span>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
                    <p className="text-muted-foreground">by {product.provider}</p>
                  </div>

                  {product.reason && (
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-purple-500" />
                          <div>
                            <p className="text-sm font-semibold text-purple-900">Why we recommend this</p>
                            <p className="text-sm text-purple-700">{product.reason}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground">{product.description}</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Key Benefits</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>✓ Personalized for your health goals</li>
                      <li>✓ Backed by scientific research</li>
                      <li>✓ Expert-recommended formula</li>
                      <li>✓ Premium quality ingredients</li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground ml-2">(4.8/5.0 from 234 reviews)</span>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-3xl font-bold mb-4">{product.price}</p>
                    
                    <div className="flex gap-3">
                      <AddToCartButton
                        item={{
                          item_type: 'wellness_service',
                          item_id: product.id.toString(),
                          item_name: product.title,
                          item_price: priceValue,
                          item_image_url: product.image,
                          item_metadata: { provider: product.provider, match: product.match }
                        }}
                        className="flex-1"
                        size="lg"
                      />
                      <Button variant="outline" size="lg">
                        <Heart className="h-5 w-5" />
                      </Button>
                      <UniversalShareButton
                        content={{
                          type: "service",
                          id: product.id.toString(),
                          title: product.title,
                          description: product.description,
                          image_url: product.image,
                          url: window.location.href
                        }}
                        variant="outline"
                        size="lg"
                        showLabel={false}
                      />
                    </div>

                    <p className="text-xs text-center text-muted-foreground mt-4">
                      🚚 Free shipping on all orders • 💯 30-day satisfaction guarantee
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">What's Included</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="font-semibold">Expert Consultation</p>
                  <p className="text-sm text-muted-foreground">Initial assessment call</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="font-semibold">Custom Plan</p>
                  <p className="text-sm text-muted-foreground">Tailored to your needs</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="font-semibold">Ongoing Support</p>
                  <p className="text-sm text-muted-foreground">24/7 access to resources</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
