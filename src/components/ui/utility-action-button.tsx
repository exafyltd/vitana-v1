import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { GiftVoucherButton } from "@/components/voucher/GiftVoucherButton";
import { MaxinaVoucherModal } from "@/components/voucher/MaxinaVoucherModal";

interface UtilityActionButtonProps {
  children: React.ReactNode;
  className?: string;
  hideGiftVoucher?: boolean;
}

/**
 * Standardized utility action button container for consistent positioning
 * across community pages. Positions buttons on the left edge, aligned
 * with the header and navigation elements.
 * 
 * Automatically includes the Gift Voucher button at the end of every utility bar.
 */
export function UtilityActionButton({ 
  children, 
  className,
  hideGiftVoucher = false 
}: UtilityActionButtonProps) {
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);

  return (
    <>
      <div className={cn("pt-4 pb-5", className)}>
        <div className="flex gap-2.5 items-center overflow-x-auto scrollbar-hide snap-x snap-mandatory">
          {children}
          
          {/* Global Gift Voucher button - appears on all utility bars */}
          {!hideGiftVoucher && (
            <GiftVoucherButton onClick={() => setVoucherModalOpen(true)} />
          )}
        </div>
      </div>
      
      {/* Voucher Modal */}
      {!hideGiftVoucher && (
        <MaxinaVoucherModal 
          open={voucherModalOpen} 
          onOpenChange={setVoucherModalOpen} 
        />
      )}
    </>
  );
}