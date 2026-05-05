import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share, Star, X } from "lucide-react";
import { AutopilotSuggestions } from "../AutopilotSuggestions";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';

interface FeaturedPost {
  id: string;
  type: 'post' | 'media' | 'achievement';
  title: string;
  content: string;
  image?: string;
  stats: {
    likes: number;
    comments: number;
    shares: number;
  };
  featured: boolean;
}

export function ShowcaseForm() {
  const { translate } = useTranslation();
  const [featuredPosts, setFeaturedPosts] = useState<FeaturedPost[]>([
    {
      id: "1",
      type: "post",
      title: "Morning Routine Update",
      content: "Started incorporating meditation into my morning routine and the difference is amazing! 🧘‍♀️",
      stats: { likes: 24, comments: 8, shares: 3 },
      featured: true
    },
    {
      id: "2",
      type: "media",
      title: "Healthy Breakfast",
      content: "Today's nutritious start to the day",
      image: "/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png",
      stats: { likes: 45, comments: 12, shares: 7 },
      featured: false
    },
    {
      id: "3",
      type: "achievement",
      title: "30-Day Streak",
      content: "Completed 30 days of consistent workout routine! 💪",
      stats: { likes: 67, comments: 15, shares: 9 },
      featured: true
    }
  ]);

  const toggleFeatured = (postId: string) => {
    setFeaturedPosts(posts => posts.map(post => 
      post.id === postId ? { ...post, featured: !post.featured } : post
    ));
  };

  const featuredCount = featuredPosts.filter(post => post.featured).length;
  const maxFeatured = 5;

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'post': return <MessageCircle className="w-4 h-4" />;
      case 'media': return <Star className="w-4 h-4" />;
      case 'achievement': return <Star className="w-4 h-4 text-yellow-500" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">{translate('editProfile.showcaseTitle')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {translate('editProfile.autopilot.highlightsDesc')}
        </p>
      </div>

      <AutopilotSuggestions 
        type="showcase" 
        onSuggestionClick={(suggestion) => {
          toast.success(`Autopilot analyzing your content for ${suggestion}...`);
          // TODO: Implement actual AI content suggestions
        }} 
      />

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Label className="text-base font-medium">{t('screens.profile.featuredContent')}</Label>
            <p className="text-sm text-muted-foreground">{t('screens.profile.featuredcountMaxfeaturedItemsSelected', { featuredCount, maxFeatured })}
            </p>
          </div>
          <Badge variant="secondary">{t('screens.profile.featuredcountFeatured', { featuredCount })}
          </Badge>
        </div>
      </Card>

      <div className="space-y-3">
        {featuredPosts.map((post) => (
          <Card key={post.id} className="p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={post.featured}
                onCheckedChange={() => toggleFeatured(post.id)}
                disabled={!post.featured && featuredCount >= maxFeatured}
              />
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {getPostIcon(post.type)}
                  <span className="font-medium">{post.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {post.type}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">{post.content}</p>
                
                {post.image && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={post.image} 
                      alt={t('screens.profile.postMedia')} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {post.stats.likes}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {post.stats.comments}
                  </div>
                  <div className="flex items-center gap-1">
                    <Share className="w-3 h-3" />
                    {post.stats.shares}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {featuredCount >= maxFeatured && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-700">{t('screens.profile.youVeReachedMaximumNumberFeatured', { maxFeatured })}
          </p>
        </Card>
      )}

      <div className="pt-4 border-t">
        <Button className="w-full">{translate('editProfile.autopilot.saveHighlights')}</Button>
      </div>
    </div>
  );
}