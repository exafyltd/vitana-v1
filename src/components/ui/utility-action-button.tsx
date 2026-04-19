import React, { useState } from "react";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GiftVoucherButton } from "@/components/voucher/GiftVoucherButton";
import { MaxinaVoucherModal } from "@/components/voucher/MaxinaVoucherModal";
import { isIAPRestricted } from "@/lib/appilix";
import { useLifeCompassPopup } from "@/context/LifeCompassPopupContext";

interface UtilityActionButtonProps {
  children: React.ReactNode;
  className?: string;
  hideGiftVoucher?: boolean;
  hideLifeCompass?: boolean;
  trailingElement?: React.ReactNode;
  afterGiftVoucherChildren?: React.ReactNode;
  compact?: boolean;
}

/**
 * Standardized utility action button container for consistent positioning
 * across community pages. Positions buttons on the left edge, aligned
 * with the header and navigation elements.
 *
 * Renders in this order: children → Life Compass → Gift Voucher →
 * afterGiftVoucherChildren → trailingElement.
 *
 * Life Compass and Gift Voucher are global on every screen — a user can set
 * their active goal (the one the AI frames recommendations around) from
 * anywhere in the app.
 */
export function UtilityActionButton({
  children,
  className,
  hideGiftVoucher = false,
  hideLifeCompass = false,
  trailingElement,
  afterGiftVoucherChildren,
  compact = false,
}: UtilityActionButtonProps) {
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const shouldHideVoucher = hideGiftVoucher || isIAPRestricted();
  const { openPopup: openLifeCompass } = useLifeCompassPopup();

  return (
    <>
      <div className={cn(compact ? "pt-2 pb-2" : "pt-4 pb-5", className)}>
        {/* Outer wrapper allows badge overflow while inner container scrolls */}
        <div className="overflow-visible">
          <div className="flex gap-2.5 items-center overflow-x-auto scrollbar-hide snap-x snap-mandatory py-2 -my-2">
            {children}

            {/* Global Life Compass button — appears on every screen, right after
                the page's action buttons and before Gift Voucher. */}
            {!hideLifeCompass && (
              <Button
                size="sm"
                variant="outline"
                onClick={openLifeCompass}
                className="shrink-0"
              >
                <Target className="w-4 h-4 mr-2" />
                Life Compass
              </Button>
            )}

            {/* Global Gift Voucher button - appears after Life Compass */}
            {!shouldHideVoucher && (
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
      {!shouldHideVoucher && (
        <MaxinaVoucherModal
          open={voucherModalOpen}
          onOpenChange={setVoucherModalOpen}
        />
      )}
    </>
  );
}
