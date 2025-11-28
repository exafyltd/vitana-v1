import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export function getAbsoluteImageUrl(url?: string): string {
  if (!url) {
    return 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&h=630&fit=crop';
  }

  // Already absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Relative URL - prepend origin
  if (url.startsWith('/')) {
    return `${window.location.origin}${url}`;
  }

  // Default fallback
  return 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&h=630&fit=crop';
}
