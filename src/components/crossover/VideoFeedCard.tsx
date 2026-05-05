import { Play, Heart, Share2, MessageCircle, Eye, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { t } from '@/lib/i18n-toast';

export function VideoFeedCard() {
  return (
    <Card className="h-full relative overflow-hidden border-2 border-red-400/50 hover:border-red-400 transition-all group">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-red-500/10 -z-10" />
      
      {/* Video icon watermark */}
      <Video className="absolute top-2 right-2 w-8 h-8 text-red-400/20" />
      
      <div className="absolute top-2 left-2 z-10">
        <Badge className="bg-red-500 text-white text-xs">{t('screens.crossover.video')}</Badge>
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-lg bg-red-400/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
            <Video className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground leading-tight">{t('screens.crossover.morningYogaFlow')}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('screens.crossover.wellnessStudio')}</p>
          </div>
        </div>
        
        <div className="relative group cursor-pointer">
          <div className="relative aspect-[9/16] rounded-lg overflow-hidden mb-3 bg-red-400/10">
            <div className="absolute bottom-2 right-2">
              <Badge variant="secondary" className="text-xs bg-black/60 text-white">
                5:42
              </Badge>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/30">
              <Button size="sm" className="rounded-full w-12 h-12 bg-white/90 hover:bg-white shadow-lg text-red-500">
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
              <Button size="sm" variant="ghost" className="h-8 px-2 flex-1 hover:bg-red-50 text-red-500">
                <Heart className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 flex-1 hover:bg-red-50 text-red-500">
                <MessageCircle className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 flex-1 hover:bg-red-50 text-red-500">
                <Share2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}