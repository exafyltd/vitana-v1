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
import { useState, useEffect } from "react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNavigate } from "react-router-dom";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { DiscoverOrderActionPopup } from "@/components/discover/DiscoverOrderActionPopup";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  const [cjOrders, setCjOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const latestActions = getLatestActions(2);

  useEffect(() => {
    if (user) {
      fetchCjOrders();
    }
  }, [user]);

  const fetchCjOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cj_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCjOrders(data || []);
    } catch (error) {
      console.error('Error fetching CJ orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cj-track-shipment', {
        body: { orderId },
      });

      if (error) throw error;
      
      // Refresh orders to show updated tracking info
      await fetchCjOrders();
    } catch (error) {
      console.error('Error tracking order:', error);
    }
  };

  // Transform CJ orders to display format
  const activeOrders = cjOrders
    .filter(order => !['delivered', 'cancelled'].includes(order.status))
    .map(order => ({
      id: order.id,
      title: order.order_items[0]?.item_name || 'CJ Product',
      provider: 'CJDropshipping',
      providerImage: order.order_items[0]?.item_image_url || '/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png',
      trackingNumber: order.tracking_number,
      estimatedDelivery: 'Processing',
      price: `$${order.total_amount}`,
      status: order.status,
      type: 'product',
      orderDate: new Date(order.created_at).toLocaleDateString(),
      shippingAddress: `${order.shipping_address?.city}, ${order.shipping_address?.state}`,
      cjOrderId: order.cj_order_id,
    }));

  const completedOrders = cjOrders
    .filter(order => ['delivered', 'cancelled'].includes(order.status))
    .map(order => ({
      id: order.id,
      title: order.order_items[0]?.item_name || 'CJ Product',
      provider: 'CJDropshipping',
      providerImage: order.order_items[0]?.item_image_url || '/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png',
      deliveredDate: order.delivered_at ? new Date(order.delivered_at).toLocaleDateString() : 'N/A',
      price: `$${order.total_amount}`,
      status: order.status,
      rating: 4.8,
      myRating: null,
      type: 'product',
      orderDate: new Date(order.created_at).toLocaleDateString(),
    }));

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
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleTrackOrder(order.id)}
                      >
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
      <DiscoverOrderActionPopup 
        open={masterActionOpen}
        onOpenChange={setMasterActionOpen}
      />
    </AppLayout>
  );
}