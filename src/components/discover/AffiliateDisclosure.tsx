/**
 * VTID-02000: Affiliate / partner disclosure component.
 *
 * Required on every surface where we recommend products for commission
 * (FTC 16 CFR Part 255 in the US, EU Unfair Commercial Practices Directive,
 * UK ASA CAP Code all require "clear and conspicuous" disclosure). Showing
 * it once per page near the product listings meets the "conspicuous"
 * standard without being intrusive.
 */

import { Info } from "lucide-react";

interface Props {
  compact?: boolean;
  className?: string;
}

export function AffiliateDisclosure({ compact = false, className = "" }: Props) {
  if (compact) {
    return (
      <p className={`text-[10px] text-muted-foreground leading-relaxed ${className}`}>
        Vitana may earn a commission from purchases made via these links. Our recommendations
        are personalized; partner status does not change how we rank products.
      </p>
    );
  }
  return (
    <div className={`flex gap-2 items-start text-xs text-muted-foreground border-t pt-3 ${className}`}>
      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        Vitana may earn a commission from purchases made via product links on this page. Our
        recommendations are personalized to your goals and limitations — partner status does
        not change how we rank products. Prices and availability come from the merchant and
        can change without notice.
      </p>
    </div>
  );
}
