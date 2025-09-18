import { Skeleton } from "@/components/ui/skeleton";

interface MessageSkeletonProps {
  isOwnMessage?: boolean;
  showAvatar?: boolean;
  count?: number;
}

export default function MessageSkeleton({ 
  isOwnMessage = false, 
  showAvatar = true, 
  count = 1 
}: MessageSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`flex gap-3 mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          {!isOwnMessage && showAvatar && (
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          )}
          <div className={`space-y-2 ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
            {!isOwnMessage && showAvatar && (
              <Skeleton className="h-4 w-20" />
            )}
            <Skeleton className={`h-12 rounded-2xl ${isOwnMessage ? 'bg-primary/20' : 'bg-muted'} ${
              index % 2 === 0 ? 'w-48' : 'w-32'
            }`} />
          </div>
          {isOwnMessage && showAvatar && (
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          )}
        </div>
      ))}
    </>
  );
}