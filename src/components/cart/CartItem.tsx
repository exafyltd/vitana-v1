import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartItem as CartItemType } from "@/hooks/useCart";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <div className="flex gap-3 p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/20">
      {item.item_image_url && (
        <img 
          src={item.item_image_url} 
          alt={item.item_name}
          className="w-16 h-16 object-cover rounded-md"
        />
      )}
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{item.item_name}</h4>
        <p className="text-xs text-muted-foreground capitalize">{item.item_type.replace('_', ' ')}</p>
        <p className="text-sm font-semibold mt-1">${item.item_price.toFixed(2)}</p>
      </div>

      <div className="flex flex-col items-end justify-between">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRemove(item.id)}
          className="h-6 w-6 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3 w-3" />
        </Button>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="h-6 w-6"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
          <Button
            size="icon"
            variant="outline"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="h-6 w-6"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
