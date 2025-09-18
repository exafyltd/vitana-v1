import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ConversationListSkeletonProps {
  count?: number;
}

export default function ConversationListSkeleton({ count = 5 }: ConversationListSkeletonProps) {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-start space-x-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full max-w-48" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}