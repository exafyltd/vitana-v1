import { Play, Heart, Share2, MessageCircle, Eye, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function VideoFeedCard() {
  return (
    <Card className="h-full bg-violet-50 border-violet-200 group cursor-pointer relative overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="secondary" className="bg-violet-200 text-violet-700 text-xs">Video</Badge>
      </div>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: 'hsl(var(--pill-mental-accent) / 0.1)' }}>
            <Video className="w-5 h-5" style={{ color: 'hsl(var(--pill-mental-accent))' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground leading-tight">Morning Yoga Flow</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Wellness Studio</p>
          </div>
        </div>
        
        <div className="relative group cursor-pointer">
          <div className="relative aspect-[9/16] rounded-lg overflow-hidden mb-3" style={{ backgroundColor: 'hsl(var(--pill-mental-accent) / 0.1)' }}>
            <div className="absolute bottom-2 right-2">
              <Badge variant="secondary" className="text-xs bg-black/60 text-white">
                5:42
              </Badge>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
              <Button size="sm" className="rounded-full w-12 h-12 bg-white/90 hover:bg-white shadow-lg" style={{ color: 'hsl(var(--pill-mental-accent))' }}>
                <Play className="w-6 h-6" />
              </Button>
            </div>
          </div>
          
          <div>
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
              <Button size="sm" variant="ghost" className="h-8 px-2 flex-1 hover:bg-muted" style={{ color: 'hsl(var(--pill-mental-accent))' }}>
                <Heart className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 flex-1 hover:bg-muted" style={{ color: 'hsl(var(--pill-mental-accent))' }}>
                <MessageCircle className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 flex-1 hover:bg-muted" style={{ color: 'hsl(var(--pill-mental-accent))' }}>
                <Share2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}