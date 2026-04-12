import { ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, CartItem } from "@/hooks/useCart";
import { useAuth } from "@/context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  item: {
    item_type: CartItem['item_type'];
    item_id: string;
    item_name: string;
    item_price: number;
    item_image_url?: string;
    item_metadata?: Record<string, any>;
  };
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function AddToCartButton({ 
  item, 
  variant = "default", 
  size = "sm",
  className,
  showLabel = true 
}: AddToCartButtonProps) {
  const { addToCart, cartItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [justAdded, setJustAdded] = useState(false);

  const isInCart = cartItems.some(
    (cartItem) => cartItem.item_id === item.item_id && cartItem.item_type === item.item_type
  );

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your cart",
        variant: "destructive",
      });
      navigate('/');
      return;
    }
    
    await addToCart(item);
    
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <Button
      onClick={handleClick}
      variant={isInCart ? "outline" : variant}
      size={size}
      className={cn(
        "transition-all duration-300",
        isInCart && "border-primary text-primary",
        className
      )}
    >
      {justAdded ? (
        <Check className="h-4 w-4" />
      ) : (
        <ShoppingCart className="h-4 w-4" />
      )}
      {showLabel && size !== "icon" && (
        <span className="ml-2">
          {isInCart ? "In Cart" : "Add to Cart"}
        </span>
      )}
    </Button>
  );
}
