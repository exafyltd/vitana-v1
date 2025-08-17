import { Play, Heart, Share2, MessageCircle, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function VideoFeedCard() {
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="relative group cursor-pointer">
          <div className="relative aspect-[9/16] bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg overflow-hidden mb-3">
            <div className="absolute inset-0 flex items-center justify-center">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="text-lg">YF</AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute bottom-2 right-2">
              <Badge variant="secondary" className="text-xs">
                5:42
              </Badge>
            </div>
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button size="sm" className="rounded-full w-12 h-12">
                <Play className="w-6 h-6" />
              </Button>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-sm mb-1">Morning Yoga Flow</h3>
            <p className="text-xs text-muted-foreground mb-2">Wellness Studio</p>
            <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                2.1k
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                234
              </span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-8 px-2 flex-1">
                <Heart className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 flex-1">
                <MessageCircle className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 flex-1">
                <Share2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}