import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GiftVoucherButtonProps {
  onClick: () => void;
}

export const GiftVoucherButton = ({ onClick }: GiftVoucherButtonProps) => {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={onClick}
      className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 shrink-0"
    >
      <Gift className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">Gift Voucher</span>
    </Button>
  );
};
