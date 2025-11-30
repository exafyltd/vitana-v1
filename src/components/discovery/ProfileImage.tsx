import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from 'lucide-react';

interface ProfileImageProps {
  src?: string;
  alt: string;
  className?: string;
  priority?: 'high' | 'normal';
  objectPosition?: string;
}

export function ProfileImage({ 
  src, 
  alt, 
  className,
  priority = 'normal',
  objectPosition = '50% 35%',
}: ProfileImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  if (!src) {
    // No src provided - show fallback immediately
    return (
      <div className={cn(
        "flex items-center justify-center bg-accent/20",
        className
      )}>
        <User className="w-1/3 h-1/3 text-accent/40" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Loading skeleton */}
      {status === 'loading' && (
        <Skeleton className="absolute inset-0 animate-pulse" />
      )}
      
      {/* Error fallback */}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-accent/20">
          <User className="w-1/3 h-1/3 text-accent/40" />
        </div>
      )}
      
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        loading={priority === 'high' ? 'eager' : 'lazy'}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        )}
        style={{ objectPosition }}
      />
    </div>
  );
}
