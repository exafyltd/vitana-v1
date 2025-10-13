import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Pause, Play, MoreVertical, Loader2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";

export function NextScheduledPosts() {
  const { scheduledPosts, isLoading, pauseScheduled, resumeScheduled, cancelScheduled } = useScheduledPosts();
  
  const handlePause = (id: string) => {
    pauseScheduled.mutate(id);
  };
  
  const handleResume = (id: string) => {
    resumeScheduled.mutate(id);
  };
  
  const handleCancel = (id: string) => {
    cancelScheduled.mutate(id);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Automation Queue
        </CardTitle>
        <p className="text-sm text-muted-foreground">Next scheduled posts</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !scheduledPosts || scheduledPosts.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No scheduled posts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledPosts.map((scheduled: any) => {
              const post = scheduled.distribution_posts;
              const scheduledDate = new Date(scheduled.scheduled_for);
              const isPaused = scheduled.status === "paused";
              
              return (
                <div
                  key={scheduled.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{post?.title || "Untitled Post"}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => isPaused ? handleResume(scheduled.id) : handlePause(scheduled.id)}>
                            {isPaused ? (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                              </>
                            ) : (
                              <>
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCancel(scheduled.id)} className="text-red-600">
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {scheduledDate.toLocaleDateString()} at{" "}
                      {scheduledDate.toLocaleTimeString('en-GB', {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false
                      })}
                      {isPaused && (
                        <Badge variant="outline" className="ml-2">
                          Paused
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {scheduled.channels?.map((channel: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
