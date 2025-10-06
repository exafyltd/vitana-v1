import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Pause, Play, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ScheduledPost {
  id: string;
  title: string;
  scheduledFor: Date;
  channels: string[];
  status: "scheduled" | "paused";
}

const MOCK_POSTS: ScheduledPost[] = [
  {
    id: "1",
    title: "Wellness Workshop this Saturday",
    scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    channels: ["messenger", "email", "linkedin"],
    status: "scheduled",
  },
  {
    id: "2",
    title: "New Meditation Group Forming",
    scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    channels: ["messenger", "instagram"],
    status: "scheduled",
  },
];

export function NextScheduledPosts() {
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
        {MOCK_POSTS.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No scheduled posts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {MOCK_POSTS.map((post) => (
              <div
                key={post.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{post.title}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          {post.status === "scheduled" ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Resume
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Cancel</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {post.scheduledFor.toLocaleDateString()} at{" "}
                    {post.scheduledFor.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {post.channels.map((channel) => (
                      <Badge key={channel} variant="secondary" className="text-xs">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
