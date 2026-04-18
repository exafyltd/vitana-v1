/**
 * VTID-02000: Product image with category-aware placeholder fallback.
 * Replaces the unrelated chat-UI mock image that was being used when a product
 * has no images[] populated from the backend.
 */

import { Leaf, Pill, Droplet, Sparkles, Flower2, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  category?: string | null;
  subcategory?: string | null;
  className?: string;
  sizeClass?: string;
}

function pickFallback(category?: string | null, subcategory?: string | null) {
  const key = (subcategory || category || "").toLowerCase();

  if (/herb|adaptogen|botanical/.test(key)) return { Icon: Leaf, from: "from-emerald-100", to: "to-teal-50", tint: "text-emerald-600" };
  if (/oil|omega|tincture|liquid|drop/.test(key)) return { Icon: Droplet, from: "from-amber-100", to: "to-orange-50", tint: "text-amber-600" };
  if (/beauty|skin|collagen/.test(key)) return { Icon: Flower2, from: "from-rose-100", to: "to-pink-50", tint: "text-rose-600" };
  if (/vitamin|mineral|multivitamin/.test(key)) return { Icon: Sparkles, from: "from-sky-100", to: "to-blue-50", tint: "text-sky-600" };
  if (/stack|blend|bundle/.test(key)) return { Icon: Package, from: "from-violet-100", to: "to-purple-50", tint: "text-violet-600" };
  return { Icon: Pill, from: "from-indigo-100", to: "to-slate-50", tint: "text-indigo-600" };
}

export function ProductImage({
  src,
  alt,
  category,
  subcategory,
  className,
  sizeClass = "w-full h-48",
}: ProductImageProps) {
  const hasImage = !!src && !/lovable-uploads\/7cca32ae-be17-4ab2-bc65-98257922207a/.test(src);
  const { Icon, from, to, tint } = pickFallback(category, subcategory);

  if (hasImage) {
    return (
      <img
        src={src as string}
        alt={alt}
        loading="lazy"
        className={cn("object-cover", sizeClass, className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "flex items-center justify-center bg-gradient-to-br",
        from,
        to,
        sizeClass,
        className
      )}
    >
      <Icon className={cn("w-10 h-10", tint)} strokeWidth={1.5} />
    </div>
  );
}
