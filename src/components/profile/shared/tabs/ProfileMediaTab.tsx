import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Headphones, Music, Play, Eye, Users, Sparkles } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface ProfileMediaTabProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
}

type MediaCategory = 'all' | 'video' | 'music' | 'podcast' | 'guided';

export function ProfileMediaTab({ profile, scope, editMode }: ProfileMediaTabProps) {
  const [activeCategory, setActiveCategory] = useState<MediaCategory>('all');
  const [showAll, setShowAll] = useState(false);

  // Diverse mock media content with creators and sub-genres
  const mockMedia = [
    {
      id: '1',
      type: 'video',
      category: 'video' as MediaCategory,
      title: '15-Minute Morning Flow',
      subGenre: 'Vinyasa Yoga',
      thumbnail: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800',
      duration: '15:23',
      views: 2300,
      date: '2 days ago',
      size: 'large',
      creator: { name: 'Sarah Chen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah' }
    },
    {
      id: '2',
      type: 'podcast',
      category: 'podcast' as MediaCategory,
      title: 'Finding Inner Peace Through Daily Practice',
      subGenre: 'Wellness Talk',
      thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800',
      duration: '32:15',
      plays: 890,
      date: '1 week ago',
      size: 'medium',
      creator: { name: 'Michael Torres', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael' }
    },
    {
      id: '3',
      type: 'music',
      category: 'music' as MediaCategory,
      title: 'Meditation Sounds',
      subGenre: 'Ambient',
      thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
      duration: '8:45',
      plays: 1456,
      date: '2 weeks ago',
      size: 'small',
      creator: { name: 'Luna Rivers', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luna' }
    },
    {
      id: '4',
      type: 'video',
      category: 'video' as MediaCategory,
      title: 'Sunset Yoga Session',
      subGenre: 'Hatha Flow',
      thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
      duration: '22:10',
      views: 3420,
      date: '3 days ago',
      size: 'medium',
      creator: { name: 'Emma Wilson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma' }
    },
    {
      id: '5',
      type: 'guided',
      category: 'guided' as MediaCategory,
      title: 'Guided Breathwork Journey',
      subGenre: 'Pranayama',
      thumbnail: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800',
      duration: '12:30',
      plays: 678,
      date: '5 days ago',
      size: 'large',
      creator: { name: 'David Kim', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david' }
    },
    {
      id: '6',
      type: 'music',
      category: 'music' as MediaCategory,
      title: 'Deep Focus Ambient Mix',
      subGenre: 'Lo-Fi Chill',
      thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
      duration: '45:00',
      plays: 2890,
      date: '1 week ago',
      size: 'small',
      creator: { name: 'Alex Rivera', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex' }
    },
    {
      id: '7',
      type: 'podcast',
      category: 'podcast' as MediaCategory,
      title: 'The Science of Mindfulness',
      subGenre: 'Educational',
      thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800',
      duration: '28:45',
      plays: 1234,
      date: '4 days ago',
      size: 'medium',
      creator: { name: 'Dr. Sophia Lee', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sophia' }
    },
    {
      id: '8',
      type: 'video',
      category: 'video' as MediaCategory,
      title: 'Evening Wind Down Routine',
      subGenre: 'Restorative',
      thumbnail: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800',
      duration: '18:55',
      views: 1890,
      date: '6 days ago',
      size: 'large',
      creator: { name: 'Maya Patel', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maya' }
    }
  ];

  const categories = [
    { id: 'all' as MediaCategory, label: 'All', icon: Sparkles },
    { id: 'video' as MediaCategory, label: 'Videos', icon: Video },
    { id: 'music' as MediaCategory, label: 'Music', icon: Music },
    { id: 'podcast' as MediaCategory, label: 'Podcasts', icon: Headphones },
    { id: 'guided' as MediaCategory, label: 'Guided', icon: Play },
  ];

  const filteredMedia = activeCategory === 'all' 
    ? mockMedia 
    : mockMedia.filter(item => item.category === activeCategory);

  const displayedMedia = showAll ? filteredMedia : filteredMedia.slice(0, 6);

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'podcast': return <Headphones className="h-4 w-4" />;
      case 'music': return <Music className="h-4 w-4" />;
      case 'guided': return <Sparkles className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  const getMetricIcon = (type: string) => {
    return type === 'video' ? <Eye className="h-3 w-3" /> : <Users className="h-3 w-3" />;
  };

  const getMetricCount = (item: any) => {
    return item.views || item.plays || 0;
  };

  const getSectionTitle = (category: MediaCategory) => {
    switch (category) {
      case 'video': return '🎥 Latest Videos';
      case 'music': return '🎧 Favorite Sounds';
      case 'podcast': return '🎙️ Featured Podcasts';
      case 'guided': return '✨ Guided Sessions';
      default: return '📚 All Media';
    }
  };

  const getCategoryGradient = (category: MediaCategory) => {
    switch (category) {
      case 'video': return 'from-violet-500/10 via-transparent to-transparent';
      case 'music': return 'from-blue-500/10 via-transparent to-transparent';
      case 'podcast': return 'from-sky-500/10 via-transparent to-transparent';
      case 'guided': return 'from-purple-500/10 via-transparent to-transparent';
      default: return 'from-indigo-500/10 via-transparent to-transparent';
    }
  };

  if (filteredMedia.length === 0) {
    return (
      <div className="w-full space-y-6 animate-fadeInUp">
        {/* Header with filter dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <h2 className="relative text-xl font-semibold text-gray-800 dark:text-gray-100">
              {getSectionTitle(activeCategory)}
              <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-400 via-sky-400 to-transparent opacity-60" />
            </h2>
            <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent dark:from-white/20" />
          </div>
          
          <Select value={activeCategory} onValueChange={(value) => setActiveCategory(value as MediaCategory)}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white/70 backdrop-blur-xl border-white/30 shadow-sm rounded-full">
              <SelectValue placeholder={t('screens.profile.filterMedia')} />
            </SelectTrigger>
            <SelectContent className="bg-white/95 backdrop-blur-xl border-white/30">
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <cat.icon className="h-4 w-4" />
                    <span>{cat.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-24 h-24 bg-gradient-to-br from-violet-100/50 to-sky-100/50 dark:from-white/5 dark:to-white/10 rounded-3xl backdrop-blur-xl flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <Music className="h-12 w-12 text-violet-400/60 dark:text-violet-300/40" />
          </div>
          <div className="text-center space-y-3">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {t('screens.profile.yourMediaStudioWillGrowWith')}
            </h3>
            <p className="text-sm text-muted-foreground/80 max-w-sm leading-[1.75] tracking-wide">
              {t('screens.profile.uploadYourFirstTrackStartSharing')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-fadeInUp pb-32">
      {/* Category-based ambient gradient background */}
      <div className={cn(
        "fixed inset-0 pointer-events-none transition-all duration-700 bg-gradient-to-br",
        getCategoryGradient(activeCategory)
      )} />

      {/* Header with filter dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3 flex-1">
          <h2 className="relative text-xl font-semibold text-gray-800 dark:text-gray-100">
            {getSectionTitle(activeCategory)}
            <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-400 via-sky-400 to-transparent opacity-60" />
          </h2>
          <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent dark:from-white/20" />
        </div>
        
        <Select value={activeCategory} onValueChange={(value) => setActiveCategory(value as MediaCategory)}>
          <SelectTrigger className="w-full sm:w-[180px] bg-white/70 backdrop-blur-xl border-white/30 shadow-sm rounded-full">
            <SelectValue placeholder={t('screens.profile.filterMedia')} />
          </SelectTrigger>
          <SelectContent className="bg-white/95 backdrop-blur-xl border-white/30">
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <cat.icon className="h-4 w-4" />
                  <span>{cat.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Media grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {displayedMedia.map((item, index) => (
          <Card 
            key={item.id} 
            className={cn(
              "group cursor-pointer transition-all duration-300 ease-out overflow-hidden relative",
              "rounded-2xl bg-white/60 backdrop-blur-xl border border-white/30",
              "shadow-[0_4px_12px_rgba(0,0,0,0.05)]",
              "motion-reduce:hover:scale-100 hover:scale-[1.015] hover:brightness-[1.05] hover:shadow-[0_10px_25px_rgba(0,0,0,0.12)]"
            )}
            style={{
              animationDelay: `${index * 50}ms`
            }}
          >
            <div className="relative h-64 w-full overflow-hidden rounded-2xl">
              {/* Thumbnail with zoom on hover */}
              <img 
                src={item.thumbnail} 
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 motion-reduce:group-hover:scale-100 group-hover:scale-110"
              />
              
              {/* Bottom gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
              
              {/* Play button overlay on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transform motion-reduce:group-hover:scale-100 group-hover:scale-110 transition-transform">
                  <Play className="h-8 w-8 text-white ml-1" />
                </div>
              </div>
              
              {/* Duration badge */}
              <Badge className="absolute bottom-3 right-3 bg-black/70 text-white text-xs rounded-full px-2 py-1 backdrop-blur-sm font-medium border-0">
                {item.duration}
              </Badge>

              {/* Content info with slide-up animation */}
              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 transition-all duration-300 motion-reduce:group-hover:-translate-y-0 group-hover:-translate-y-1">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white shrink-0">
                    {getMediaIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-white line-clamp-2 drop-shadow-lg">
                      {item.title}
                    </h3>
                    {/* Sub-genre tag - revealed on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-1">
                      <Badge className="inline-block text-xs px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-white/90 border-0">
                        {item.subGenre}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/80">
                      <div className="flex items-center gap-1">
                        {getMetricIcon(item.type)}
                        <span className="drop-shadow">{getMetricCount(item).toLocaleString()}</span>
                      </div>
                      <span className="drop-shadow opacity-80">{item.date}</span>
                    </div>
                  </div>
                </div>

                {/* Creator chip */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <img 
                    src={item.creator.avatar} 
                    alt={item.creator.name}
                    className="w-4 h-4 rounded-full ring-1 ring-white/30"
                  />
                  <span className="text-xs text-white/90 font-medium drop-shadow">
                    {item.creator.name}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Show More Button */}
      {filteredMedia.length > 6 && !showAll && (
        <div className="flex justify-center pt-4 relative z-10">
          <Button 
            variant="soft" 
            onClick={() => setShowAll(true)}
            className="px-6 py-2"
          >
            Show more ({filteredMedia.length - 6} more {filteredMedia.length - 6 === 1 ? 'item' : 'items'})
          </Button>
        </div>
      )}

      {/* Now Playing Dock - Placeholder */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-violet-900/20 via-sky-900/10 to-transparent backdrop-blur-2xl border-t border-white/10 z-50 pointer-events-none">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-center">
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span className="font-medium">{t('screens.profile.nowPlayingDock')}</span>
            <span className="text-xs opacity-60">{t('screens.profile.comingSoon')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
