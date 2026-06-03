import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUniversalCart } from "@/hooks/useUniversalCart";

interface CartBadgeProps {
  onClick: () => void;
}

export function CartBadge({ onClick }: CartBadgeProps) {
  // Phase 0: counts come from the one canonical cart (0 when roleBlocked).
  const { cartCount } = useUniversalCart();

  if (cartCount === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50">
      <Button
        size="icon"
        onClick={onClick}
        className="relative h-12 w-12 rounded-full bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
      >
        <ShoppingCart className="h-5 w-5 text-primary" />
        <Badge 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary text-primary-foreground border-2 border-background"
        >
          {cartCount > 9 ? '9+' : cartCount}
        </Badge>
      </Button>
    </div>
  );
}
