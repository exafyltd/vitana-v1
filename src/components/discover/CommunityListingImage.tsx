/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE: listing image with a generic placeholder
 * fallback. Deliberately simpler than ProductImage.tsx (that one's category
 * icon guesses are tuned to the health/supplement affiliate catalog, not to
 * classifieds categories like electronics/furniture/services).
 */

import { Package, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListingKind } from "@/hooks/useCommunityMarketplace";

interface CommunityListingImageProps {
  src?: string | null;
  alt: string;
  listingKind: ListingKind;
  className?: string;
  sizeClass?: string;
}

export function CommunityListingImage({
  src,
  alt,
  listingKind,
  className,
  sizeClass = "w-full h-48",
}: CommunityListingImageProps) {
  if (src) {
    return (
      <div className={cn("bg-white dark:bg-neutral-50", sizeClass, className)}>
        <img src={src} alt={alt} loading="lazy" className="w-full h-full object-cover" />
      </div>
    );
  }

  const Icon = listingKind === "service" ? Wrench : Package;
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900",
        sizeClass,
        className
      )}
    >
      <Icon className="w-10 h-10 text-slate-400" strokeWidth={1.5} />
    </div>
  );
}
