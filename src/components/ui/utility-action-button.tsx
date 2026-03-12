import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { GiftVoucherButton } from "@/components/voucher/GiftVoucherButton";
import { MaxinaVoucherModal } from "@/components/voucher/MaxinaVoucherModal";
import { isIAPRestricted } from "@/lib/appilix";

interface UtilityActionButtonProps {
  children: React.ReactNode;
  className?: string;
  hideGiftVoucher?: boolean;
  trailingElement?: React.ReactNode;
  afterGiftVoucherChildren?: React.ReactNode;
}

/**
 * Standardized utility action button container for consistent positioning
 * across community pages. Positions buttons on the left edge, aligned
 * with the header and navigation elements.
 * 
 * Automatically includes the Gift Voucher button after children.
 * Use afterGiftVoucherChildren for elements that should appear after Gift Voucher.
 */
export function UtilityActionButton({ 
  children, 
  className,
  hideGiftVoucher = false,
  trailingElement,
  afterGiftVoucherChildren
}: UtilityActionButtonProps) {
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const shouldHideVoucher = hideGiftVoucher || isIAPRestricted();

  return (
    <>
      <div className={cn("pt-4 pb-5", className)}>
        {/* Outer wrapper allows badge overflow while inner container scrolls */}
        <div className="overflow-visible">
          <div className="flex gap-2.5 items-center overflow-x-auto scrollbar-hide snap-x snap-mandatory py-2 -my-2">
            {children}
            
            {/* Global Gift Voucher button - appears after main action buttons */}
            {!hideGiftVoucher && (
              <GiftVoucherButton onClick={() => setVoucherModalOpen(true)} />
            )}
            
            {/* Elements that appear after Gift Voucher (e.g., Vitana Index, Autopilot on mobile) */}
            {afterGiftVoucherChildren}
            
            {/* Trailing element (e.g., refresh button) - always last */}
            {trailingElement}
          </div>
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