import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export function ImageWithFallback({ src, alt, className = "", onClick }: ImageWithFallbackProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setRetryKey(0);
  }, [src]);

  const imageSrc = useMemo(() => {
    if (!src) return "";
    if (retryKey === 0) return src;
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}retry=${retryKey}`;
  }, [src, retryKey]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setRetryKey((prev) => prev + 1);
  };

  if (hasError || !imageSrc) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-muted text-muted-foreground ${className}`}
        onClick={onClick}
      >
        <RefreshCw className="h-6 w-6 mb-2" />
        <p className="text-xs text-center px-2">{t('screens.diary.imageUnavailable')}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRetry();
          }}
          className="text-xs text-primary hover:underline mt-1"
        >
          {t('screens.diary.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} onClick={onClick}>
      {isLoading && <Skeleton className="absolute inset-0 h-full w-full" />}
      <img
        src={imageSrc}
        alt={alt}
        loading="lazy"
        className={`h-full w-full object-cover transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
