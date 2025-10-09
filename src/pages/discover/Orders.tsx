import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { discoverNavigation } from "@/config/navigation";
import { Package, Clock, CheckCircle, XCircle, Truck, Calendar, MapPin, Star, Phone, MessageSquare, RotateCcw, Plane, Plus, RefreshCw } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNavigate } from "react-router-dom";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { MasterActionPopup } from "@/components/MasterActionPopup";

export default function Orders() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [masterActionOpen, setMasterActionOpen] = useState(false);

  const latestActions = getLatestActions(2);

  const activeOrders = [
    {
      id: "ORD-2024-001",
      title: "Deep Tissue Massage",
      provider: "Zen Wellness Spa",
      providerImage: "/lovable-uploads/tae-min-avatar.jpg",
      date: "Today, 4:00 PM",
      location: "123 Wellness Ave, Miami FL",
      price: "$120",
      status: "confirmed",
      rating: 4.9,
      type: "service",
      orderDate: "Dec 28, 2024",
      notes: "Please arrive 15 minutes early for intake"
    },
    {
      id: "ORD-2024-002", 
      title: "Adaptogenic Stress Relief Blend",
      provider: "Vitana Supplements",
      providerImage: "/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png",
      trackingNumber: "VT123456789",
      estimatedDelivery: "Dec 30, 2024",
      price: "$49",
      status: "shipped",
      type: "product",
      orderDate: "Dec 26, 2024",
      shippingAddress: "456 Health St, Austin TX 78701"
    },
    {
      id: "ORD-2024-003",
      title: "Sleep Optimization Consultation",
      provider: "Dr. Michael Roberts",
      providerImage: "/lovable-uploads/dr-roberts-avatar.jpg", 
      date: "Dec 31, 2024 at 2:00 PM",
      location: "Virtual (Zoom link provided)",
      price: "$180",
      status: "confirmed",
      rating: 4.8,
      type: "service",
      orderDate: "Dec 27, 2024",
      notes: "Bring your sleep tracking data from the last 30 days"
    }
  ];

  const completedOrders = [
    {
      id: "ORD-2024-004",
      title: "Cold Plunge Therapy Session", 
      provider: "Recovery Lab",
      providerImage: "/lovable-uploads/james-davis-avatar.jpg",
      completedDate: "Dec 25, 2024",
      price: "$75",
      status: "completed",
      rating: 5.0,
      myRating: 5,
      type: "service",
      orderDate: "Dec 23, 2024"
    },
    {
      id: "ORD-2024-005",
      title: "Infrared Therapy Mat",
      provider: "Wellness Tech Co", 
      providerImage: "/lovable-uploads/murphy-avatar.jpg",
      deliveredDate: "Dec 22, 2024",
      price: "$399",
      status: "delivered",
      rating: 4.8,
      myRating: 4,
      type: "product",
      orderDate: "Dec 18, 2024"
    },
    {
      id: "ORD-2024-006",
      title: "Nutrition Reset Consultation",
      provider: "Luna Wellness Collective",
      providerImage: "/lovable-uploads/lisa-chen-avatar.jpg",
      completedDate: "Dec 20, 2024", 
      price: "$149",
      status: "completed",
      rating: 4.9,
      myRating: 5,
      type: "service",
      orderDate: "Dec 15, 2024"
    }
  ];

  const renderOrderCard = (order: any, isActive = true) => (
    <Card key={order.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm border-white/20">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start gap-4">
          <img 
            src={order.providerImage} 
            alt={order.provider}
            className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                  {order.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">{order.provider}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge 
                  className={`text-xs ${
                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'shipped' ? 'bg-orange-100 text-orange-700' :
                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}
                >
                  {order.status === 'confirmed' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {order.status === 'shipped' && <Truck className="h-3 w-3 mr-1" />}
                  {order.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {order.status === 'delivered' && <Package className="h-3 w-3 mr-1" />}
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
                <span className="text-sm md:text-base font-bold text-foreground">{order.price}</span>
              </div>
            </div>

            {/* Service-specific info */}
            {order.type === 'service' && isActive && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{order.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{order.location}</span>
                </div>
                {order.notes && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-700">{order.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Product-specific info */}
            {order.type === 'product' && isActive && (
              <div className="space-y-2 mb-4">
                {order.trackingNumber && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Tracking: {order.trackingNumber}</span>
                  </div>
                )}
                {order.estimatedDelivery && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Estimated delivery: {order.estimatedDelivery}</span>
                  </div>
                )}
                {order.shippingAddress && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{order.shippingAddress}</span>
                  </div>
                )}
              </div>
            )}

            {/* Completed order info */}
            {!isActive && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {order.type === 'service' ? `Completed: ${order.completedDate}` : `Delivered: ${order.deliveredDate}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-muted-foreground">Provider rating: {order.rating}</span>
                  {order.myRating && (
                    <span className="text-sm text-muted-foreground">• Your rating: {order.myRating}/5 ⭐</span>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-4">
              {isActive ? (
                <>
                  {order.type === 'service' && (
                    <>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Phone className="h-3 w-3 mr-1" />
                        Contact Provider
                      </Button>
                      <Button size="sm" variant="outline">
                        <XCircle className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </>
                  )}
                  {order.type === 'product' && (
                    <>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Truck className="h-3 w-3 mr-1" />
                        Track Package
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Support
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" className="flex-1">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reorder
                  </Button>
                  <Button size="sm" variant="outline">
                    <Star className="h-3 w-3 mr-1" />
                    Review
                  </Button>
                  {order.type === 'service' && (
                    <Button size="sm" variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      Book Again
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-muted">
              <span className="text-xs text-muted-foreground">Order ID: {order.id}</span>
              <span className="text-xs text-muted-foreground">Ordered: {order.orderDate}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <SEO title="Orders | Discover" description="Track your wellness service bookings and product orders" canonical={window.location.href} />
      <SubNavigation items={discoverNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Your Orders"
            description="Track your wellness service bookings and product orders"
            emoji="📦"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search your orders…"
            />
            <UniversalCalendarButton />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setMasterActionOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Action
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </UtilityActionButton>

          {/* Orders Content */}
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Active Orders ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Order History ({completedOrders.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="space-y-4">
              {activeOrders.length > 0 ? (
                <div className="grid gap-4">
                  {activeOrders.map((order) => renderOrderCard(order, true))}
                </div>
              ) : (
                <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Active Orders</h3>
                    <p className="text-muted-foreground mb-4">You don't have any active orders at the moment.</p>
                    <Button onClick={() => navigate('/discover')}>
                      Browse Services & Products
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              {completedOrders.length > 0 ? (
                <div className="grid gap-4">
                  {completedOrders.map((order) => renderOrderCard(order, false))}
                </div>
              ) : (
                <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Order History</h3>
                    <p className="text-muted-foreground mb-4">Your completed orders will appear here.</p>
                    <Button onClick={() => navigate('/discover')}>
                      Start Shopping
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
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