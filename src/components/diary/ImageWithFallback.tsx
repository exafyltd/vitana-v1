import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export function ImageWithFallback({ src, alt, className = "", onClick }: ImageWithFallbackProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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
  };

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-muted text-muted-foreground ${className}`}
        onClick={onClick}
      >
        <RefreshCw className="h-6 w-6 mb-2" />
        <p className="text-xs text-center px-2">Image unavailable</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRetry();
          }}
          className="text-xs text-primary hover:underline mt-1"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {isLoading && <Skeleton className={className} />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`${className} ${isLoading ? "hidden" : "block"} object-cover transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
      />
    </>
  );
}
