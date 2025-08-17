import { Play, Heart, Share2, MessageCircle, Eye, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function VideoFeedCard() {
  return (
    <Card className="h-full bg-gradient-to-br from-pink-100 to-pink-200 border-pink-200/50 group cursor-pointer relative overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="secondary" className="bg-pink-200/80 text-pink-700 text-xs">Video</Badge>
      </div>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-[#FFF4F2] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
            <Video className="w-8 h-8 text-pink-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate text-pink-800">Morning Yoga Flow</h3>
            <p className="text-xs text-pink-600 truncate">Wellness Studio</p>
          </div>
        </div>
        
        <div className="relative group cursor-pointer">
          <div className="relative aspect-[9/16] bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg overflow-hidden mb-3">
            <div className="absolute bottom-2 right-2">
              <Badge variant="secondary" className="text-xs bg-pink-200/80 text-pink-700">
                5:42
              </Badge>
            </div>
            <div className="absolute inset-0 bg-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button size="lg" className="rounded-full w-16 h-16 bg-white/90 hover:bg-white text-pink-600 shadow-lg">
                <Play className="w-8 h-8" />
              </Button>
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-3 mb-2 text-xs text-pink-600">
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
              <Button size="sm" variant="ghost" className="h-8 px-2 flex-1 hover:bg-pink-200 text-pink-600">
                <Heart className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 flex-1 hover:bg-pink-200 text-pink-600">
                <MessageCircle className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 flex-1 hover:bg-pink-200 text-pink-600">
                <Share2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}